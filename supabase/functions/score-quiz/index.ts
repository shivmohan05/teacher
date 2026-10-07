// POST /functions/v1/score-quiz
//
// This closes the gap flagged all the way back in Phase 3: previously
// the browser fetched the full `questions` row (including
// `correct_answer`) to self-score at submit time. Now it never does -
// the browser sends only { attemptId, language, answers: [{questionId,
// selectedAnswer, markedForReview}] }, and this function (service role)
// is the only place the answer key is ever read. It returns per-question
// correctness and explanations, never the answer key itself.
//
// Deploy via Supabase Studio -> Edge Functions -> New function
// ("score-quiz") -> paste this file -> Deploy. No CLI needed.

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

interface IncomingAnswer {
  questionId: string;
  selectedAnswer: unknown;
  markedForReview?: boolean;
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
  const studentId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400, origin);
  }

  const attemptId = typeof body.attemptId === "string" ? body.attemptId : null;
  const language = body.language === "hi" ? "hi" : "en";
  const answers = Array.isArray(body.answers) ? (body.answers as IncomingAnswer[]) : [];

  if (!attemptId) {
    return json({ error: "attemptId is required" }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // --- Ownership check: this attempt must belong to the caller ---
  const { data: attempt } = await admin.from("quiz_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.student_profile_id !== studentId) {
    return json({ error: "Attempt not found" }, 404, origin);
  }

  // --- Idempotent: if already submitted, return the stored result instead of re-scoring ---
  if (attempt.status === "submitted") {
    const { data: existingAnswers } = await admin
      .from("quiz_answers")
      .select("*, questions(prompt_en, prompt_hi, explanation_en, explanation_hi)")
      .eq("attempt_id", attemptId);

    const perQuestion = (existingAnswers ?? []).map((a) => ({
      questionId: a.question_id,
      isCorrect: a.is_correct,
      promptEn: a.questions?.prompt_en ?? "",
      promptHi: a.questions?.prompt_hi ?? "",
      explanationEn: a.questions?.explanation_en ?? null,
      explanationHi: a.questions?.explanation_hi ?? null,
    }));

    return json(
      { score: attempt.score, correct: attempt.correct_count, total: attempt.total_questions, perQuestion, alreadySubmitted: true },
      200,
      origin
    );
  }

  // --- Restrict scoring to exactly the questions that belong to this quiz ---
  const { data: quizQuestionRows } = await admin.from("quiz_questions").select("question_id").eq("quiz_id", attempt.quiz_id);
  const validQuestionIds = new Set((quizQuestionRows ?? []).map((r) => r.question_id as string));
  const filteredAnswers = answers.filter((a) => validQuestionIds.has(a.questionId));

  const questionIds = Array.from(validQuestionIds);
  const { data: fullQuestions } = await admin.from("questions").select("*").in("id", questionIds);

  let correctCount = 0;
  const perQuestion: Array<{
    questionId: string;
    isCorrect: boolean;
    promptEn: string;
    promptHi: string;
    explanationEn: string | null;
    explanationHi: string | null;
  }> = [];

  for (const q of fullQuestions ?? []) {
    const submitted = filteredAnswers.find((a) => a.questionId === q.id);
    const selected = submitted?.selectedAnswer ?? null;
    let isCorrect = false;

    if (q.type === "mcq_single" || q.type === "true_false") {
      isCorrect = JSON.stringify(selected) === JSON.stringify(q.correct_answer);
    } else if (q.type === "fill_blank") {
      const correct = (q.correct_answer as { en: string; hi: string })[language as "en" | "hi"];
      isCorrect = typeof selected === "string" && selected.trim().toLowerCase() === (correct ?? "").trim().toLowerCase();
    }

    if (isCorrect) correctCount += 1;

    await admin.from("quiz_answers").upsert(
      {
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        marked_for_review: submitted?.markedForReview ?? false,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" }
    );

    perQuestion.push({
      questionId: q.id,
      isCorrect,
      promptEn: q.prompt_en,
      promptHi: q.prompt_hi,
      explanationEn: q.explanation_en,
      explanationHi: q.explanation_hi,
    });
  }

  const total = questionIds.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  await admin
    .from("quiz_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score,
      total_questions: total,
      correct_count: correctCount,
      status: "submitted",
    })
    .eq("id", attemptId);

  return json({ score, correct: correctCount, total, perQuestion, alreadySubmitted: false }, 200, origin);
});
