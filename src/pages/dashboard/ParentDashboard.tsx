import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { ParentStudentLinkRow, ProfileRow, StudentProfileRow, DailyGoalRow } from "../../types/database";

interface LinkedChild {
  link: ParentStudentLinkRow;
  profile: ProfileRow | null;
  studentProfile: StudentProfileRow | null;
  completedCount: number;
  quizAverage: number | null;
  dailyGoal: DailyGoalRow | null;
}

export default function ParentDashboard() {
  const { profile, user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [familyCodeInput, setFamilyCodeInput] = useState("");
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function loadChildren() {
    if (!supabase || !user) return;
    setLoading(true);

    const { data: links } = await supabase
      .from("parent_student_links")
      .select("*")
      .eq("parent_profile_id", user.id);

    const approved = (links ?? []).filter((l) => l.status === "approved") as ParentStudentLinkRow[];
    const pending = (links ?? []).filter((l) => l.status === "pending") as ParentStudentLinkRow[];
    setPendingCount(pending.length);

    const today = new Date().toISOString().slice(0, 10);
    const results: LinkedChild[] = [];

    for (const link of approved) {
      const [{ data: childProfile }, { data: childStudentProfile }, completed, attempts, { data: goal }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", link.student_profile_id).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("profile_id", link.student_profile_id).maybeSingle(),
        supabase
          .from("progress")
          .select("id", { count: "exact", head: true })
          .eq("student_profile_id", link.student_profile_id)
          .eq("status", "completed"),
        supabase
          .from("quiz_attempts")
          .select("score")
          .eq("student_profile_id", link.student_profile_id)
          .eq("status", "submitted"),
        supabase.from("daily_goals").select("*").eq("student_profile_id", link.student_profile_id).eq("goal_date", today).maybeSingle(),
      ]);

      const scores = (attempts.data ?? []).map((a) => a.score as number).filter((s) => typeof s === "number");
      const quizAverage = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      results.push({
        link,
        profile: childProfile as ProfileRow | null,
        studentProfile: childStudentProfile as StudentProfileRow | null,
        completedCount: completed.count ?? 0,
        quizAverage,
        dailyGoal: (goal as DailyGoalRow) ?? null,
      });
    }

    setChildren(results);
    setLoading(false);
  }

  useEffect(() => {
    loadChildren();
  }, [user]);

  async function handleLink() {
    if (!supabase || !familyCodeInput.trim()) return;
    setLinking(true);
    setLinkStatus(null);
    setLinkError(null);

    const { data, error } = await supabase.functions.invoke("link-family", {
      body: { familyCode: familyCodeInput.trim() },
    });

    setLinking(false);

    if (error || !data || data.error) {
      setLinkError(data?.error ?? "Could not send the link request. Please check the code and try again.");
      return;
    }

    setFamilyCodeInput("");
    if (data.alreadyRequested) {
      setLinkStatus(`You already have a ${data.status} link with ${data.studentDisplayName}.`);
    } else {
      setLinkStatus(`Request sent to ${data.studentDisplayName}. They need to approve it from their dashboard before you can see their progress.`);
    }
    loadChildren();
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">
        Welcome{profile ? `, ${profile.display_name}` : ""}
      </h1>
      <p className="mt-2 text-ink/60">
        Role: <span className="font-medium text-primary">parent / guardian</span>
      </p>

      <div className="mt-6 rounded-card bg-tint px-5 py-4 text-sm text-primary">
        Only learning-related information for approved, linked children appears here - no comparisons, rankings, or
        diagnoses.
      </div>

      {/* Link to a child */}
      <div className="mt-6 rounded-card border border-black/5 bg-white p-4">
        <h2 className="font-display text-base font-bold">Link to your child</h2>
        <p className="mt-1 text-sm text-ink/60">
          Ask your child for their family code (shown on their Student Dashboard) and enter it below.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={familyCodeInput}
            onChange={(e) => setFamilyCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. A3F7K9"
            maxLength={12}
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 font-mono"
          />
          <button type="button" onClick={handleLink} disabled={linking || !familyCodeInput.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {linking ? "Sending…" : "Send request"}
          </button>
        </div>
        {linkStatus && <p className="mt-2 text-sm text-teal">{linkStatus}</p>}
        {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
        {pendingCount > 0 && (
          <p className="mt-2 text-sm text-marigold">
            {pendingCount} request{pendingCount > 1 ? "s" : ""} waiting for your child to approve.
          </p>
        )}
      </div>

      {/* Children list */}
      {loading ? (
        <p className="mt-6 text-ink/60">Loading…</p>
      ) : children.length === 0 ? (
        <p className="mt-6 text-ink/60">No linked children yet. Use the form above once you have a family code.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {children.map((c) => (
            <div key={c.link.id} className="rounded-card border border-black/5 bg-white p-4">
              <h3 className="font-display text-lg font-bold">{c.profile?.display_name ?? "Student"}</h3>
              <p className="text-sm text-ink/60">
                {c.studentProfile ? `Class ${c.studentProfile.class_number} · ${c.studentProfile.board}` : ""}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <MiniStat label="Completed topics" value={String(c.completedCount)} />
                <MiniStat label="Quiz average" value={c.quizAverage !== null ? `${c.quizAverage}%` : "—"} />
                <MiniStat
                  label="Today's study"
                  value={c.dailyGoal ? `${c.dailyGoal.completed_minutes}/${c.dailyGoal.target_minutes} min` : "0 min"}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => signOut()} className="mt-8 rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
        Log out
      </button>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-tint px-2 py-3">
      <p className="text-base font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-primary/70">{label}</p>
    </div>
  );
}
