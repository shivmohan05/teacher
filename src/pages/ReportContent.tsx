import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ReportContent() {
  const [searchParams] = useSearchParams();
  const prefilledTopic = searchParams.get("topic") ?? "";
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const where = String(form.get("where") ?? "");
    const details = String(form.get("details") ?? "");

    if (!supabase) {
      // Still works without a backend - the report just isn't persisted.
      setSent(true);
      return;
    }

    const { error: insertError } = await supabase.from("content_reports").insert({
      reporter_profile_id: user?.id ?? null,
      where_text: where,
      details,
    });

    if (insertError) {
      setError("Something went wrong submitting your report. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <InfoPage title="Report content">
      <p>Use this form to report incorrect, unsafe, or inappropriate content or AI responses. You don't need to be logged in to use it.</p>
      {sent ? (
        <p role="status" className="mt-4">
          Thank you — this report has been recorded and will be reviewed by an administrator before any related content stays published.
        </p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {error && <p role="alert" className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div>
            <label htmlFor="report-where" className="block text-sm font-medium text-ink">Where did you see this?</label>
            <input
              id="report-where"
              name="where"
              required
              defaultValue={prefilledTopic}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              placeholder="e.g. Class 10 Science, Reflection of Light"
            />
          </div>
          <div>
            <label htmlFor="report-details" className="block text-sm font-medium text-ink">What's wrong?</label>
            <textarea id="report-details" name="details" required rows={4} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
            Submit report
          </button>
        </form>
      )}
    </InfoPage>
  );
}
