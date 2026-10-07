import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Real enrollment flow. Note on email confirmation: if your Supabase
// project has "Confirm email" turned on (the default), signUp() does not
// return an active session, so the student_profiles/consent_records
// inserts below are skipped and instead happen automatically the first
// time this user logs in after confirming - see handleFirstLoginBackfill
// in a later phase, or disable confirmation for this demo per the README.
const BOARDS = ["CBSE", "ICSE", "ISC", "HSE", "State Board"];

// Short, unambiguous (no 0/O/1/I) code a parent later enters on their
// Parent Dashboard to request a link - see supabase/functions/link-family.
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState("CBSE");
  const needsState = board === "HSE" || board === "State Board";
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [familyCode, setFamilyCode] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const displayName = String(form.get("name"));
    const classNumber = Number(form.get("class"));
    const state = needsState ? String(form.get("state")) : null;
    const preferredLanguage = String(form.get("language")) as "en" | "hi";
    const parentEmail = String(form.get("parentEmail") || "") || null;

    const { error: signUpError } = await signUp({ email, password, displayName, preferredLanguage });
    if (signUpError) {
      setError(signUpError);
      setStatus("idle");
      return;
    }

    const { data: sessionData } = await supabase!.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      const code = generateFamilyCode();
      setFamilyCode(code);
      await supabase!.from("student_profiles").insert({
        profile_id: userId,
        class_number: classNumber,
        board,
        state,
        parent_email: parentEmail,
        family_code: code,
      });

      if (parentEmail) {
        await supabase!.from("consent_records").insert({
          student_profile_id: userId,
          parent_email: parentEmail,
        });
      }
    }

    setStatus("done");
    setTimeout(() => navigate("/dashboard"), 4000);
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-ink/60">
        This form collects only what's needed to personalize lessons — no address, ID numbers, or precise location.
      </p>

      {status === "done" ? (
        <div role="status" className="mt-6 rounded-card bg-tint px-4 py-4 text-primary">
          <p>Account created. Taking you to your dashboard…</p>
          {familyCode && (
            <p className="mt-2 text-sm">
              Your family code is <span className="font-mono text-base font-bold">{familyCode}</span> — share it with a
              parent or guardian so they can link to your account from their Parent Dashboard.
            </p>
          )}
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium">Student display name</label>
            <input id="reg-name" name="name" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium">Email</label>
            <input id="reg-email" type="email" name="email" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium">Password</label>
            <input id="reg-password" type="password" name="password" required minLength={8} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-class" className="block text-sm font-medium">Class</label>
              <select id="reg-class" name="class" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-board" className="block text-sm font-medium">Board</label>
              <select
                id="reg-board"
                name="board"
                required
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {needsState && (
            <div>
              <label htmlFor="reg-state" className="block text-sm font-medium">State</label>
              <input id="reg-state" name="state" required placeholder="Required for HSE / State Board" className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
            </div>
          )}

          <div>
            <label htmlFor="reg-language" className="block text-sm font-medium">Preferred teaching language</label>
            <select id="reg-language" name="language" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <div>
            <label htmlFor="reg-parent-email" className="block text-sm font-medium">Parent/guardian email (for younger students)</label>
            <input id="reg-parent-email" type="email" name="parentEmail" className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>

          <div className="flex items-start gap-2">
            <input id="reg-consent" type="checkbox" required className="mt-1" />
            <label htmlFor="reg-consent" className="text-sm text-ink/70">
              I confirm a parent/guardian has reviewed and consented to this enrollment. (Prototype consent step, pending legal review.)
            </label>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-full bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {status === "submitting" ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-ink/60">
        Already have an account? <Link to="/login" className="font-medium text-primary">Log in</Link>
      </p>
    </section>
  );
}
