// POST /functions/v1/link-family
//
// Why this needs to be a server function rather than plain RLS: a parent
// linking to their child by "family code" requires looking up a
// student_profiles row that does NOT belong to the parent - RLS can't
// safely allow that as a blanket SELECT policy (it would let any
// authenticated user enumerate other students' profiles). Doing the
// lookup here, with the service role, keeps that lookup narrow (exact
// code match only) while RLS on student_profiles stays tight for
// everyone else. Same pattern as the Phase 4 AI endpoint: sensitive
// cross-account operations go through a server function, not the
// client's own RLS-scoped queries.
//
// Deploy via Supabase Studio -> Edge Functions -> New function
// ("link-family") -> paste this file -> Deploy. No CLI needed.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(payload: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Not authenticated" }, 401, origin);
  }
  const parentId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", parentId).maybeSingle();
  if (callerProfile?.role !== "parent") {
    return json({ error: "Only parent accounts can link to a child this way." }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400, origin);
  }

  const code = typeof body.familyCode === "string" ? body.familyCode.trim().toUpperCase() : "";
  if (!code || code.length > 12) {
    return json({ error: "Enter a valid family code." }, 400, origin);
  }

  const { data: studentProfile } = await admin
    .from("student_profiles")
    .select("profile_id")
    .eq("family_code", code)
    .maybeSingle();

  if (!studentProfile) {
    return json({ error: "No student found with that code. Check it and try again." }, 404, origin);
  }

  const { data: studentIdentity } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", studentProfile.profile_id)
    .maybeSingle();

  const { data: existingLink } = await admin
    .from("parent_student_links")
    .select("*")
    .eq("parent_profile_id", parentId)
    .eq("student_profile_id", studentProfile.profile_id)
    .maybeSingle();

  if (existingLink) {
    return json(
      { studentDisplayName: studentIdentity?.display_name ?? "Student", status: existingLink.status, alreadyRequested: true },
      200,
      origin
    );
  }

  const { error: insertError } = await admin.from("parent_student_links").insert({
    parent_profile_id: parentId,
    student_profile_id: studentProfile.profile_id,
    status: "pending",
  });

  if (insertError) {
    return json({ error: "Could not create the link request." }, 500, origin);
  }

  return json({ studentDisplayName: studentIdentity?.display_name ?? "Student", status: "pending", alreadyRequested: false }, 200, origin);
});
