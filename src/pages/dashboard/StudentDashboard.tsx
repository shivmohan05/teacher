import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import type {
  TopicRow,
  QuizAttemptRow,
  QuizRow,
  DailyGoalRow,
  StudentProfileRow,
  ParentStudentLinkRow,
  ProfileRow,
} from "../../types/database";

interface BookmarkWithTopic {
  topic_id: string;
  topics: TopicRow | null;
}

interface AttemptWithQuiz extends QuizAttemptRow {
  quizzes: QuizRow | null;
}

interface PendingLink extends ParentStudentLinkRow {
  profiles: ProfileRow | null;
}

export default function StudentDashboard() {
  const { profile, user, signOut } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkWithTopic[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AttemptWithQuiz[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoalRow | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileRow | null>(null);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);

  useEffect(() => {
    if (!supabase || !user) return;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [completed, inProgress, bookmarkRows, attemptRows, goalRow, sp, links] = await Promise.all([
        supabase.from("progress").select("id", { count: "exact", head: true }).eq("student_profile_id", user.id).eq("status", "completed"),
        supabase.from("progress").select("id", { count: "exact", head: true }).eq("student_profile_id", user.id).eq("status", "in_progress"),
        supabase.from("bookmarks").select("topic_id, topics(*)").eq("student_profile_id", user.id).limit(6),
        supabase
          .from("quiz_attempts")
          .select("*, quizzes(*)")
          .eq("student_profile_id", user.id)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false })
          .limit(5),
        supabase.from("daily_goals").select("*").eq("student_profile_id", user.id).eq("goal_date", today).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
        supabase.from("parent_student_links").select("*, profiles!parent_student_links_parent_profile_id_fkey(*)").eq("student_profile_id", user.id).eq("status", "pending"),
      ]);

      setCompletedCount(completed.count ?? 0);
      setInProgressCount(inProgress.count ?? 0);
      setBookmarks((bookmarkRows.data as unknown as BookmarkWithTopic[]) ?? []);
      setRecentAttempts((attemptRows.data as unknown as AttemptWithQuiz[]) ?? []);
      setDailyGoal((goalRow.data as DailyGoalRow) ?? null);
      setStudentProfile((sp.data as StudentProfileRow) ?? null);
      setPendingLinks((links.data as unknown as PendingLink[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function respondToLink(linkId: string, approve: boolean) {
    if (!supabase) return;
    await supabase.from("parent_student_links").update({ status: approve ? "approved" : "revoked" }).eq("id", linkId);
    setPendingLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">
        Welcome{profile ? `, ${profile.display_name}` : ""}
      </h1>
      <p className="mt-2 text-ink/60">
        Role: <span className="font-medium text-primary">student</span>
      </p>

      {loading ? (
        <p className="mt-6 text-ink/60">Loading your progress…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat label="Completed topics" value={String(completedCount)} />
            <Stat label="In progress" value={String(inProgressCount)} />
            <Stat
              label="Today's goal"
              value={dailyGoal ? `${dailyGoal.completed_minutes}/${dailyGoal.target_minutes} min` : "0/20 min"}
            />
          </div>

          {studentProfile?.family_code && (
            <div className="mt-6 rounded-card bg-tint px-4 py-3 text-sm text-primary">
              Your family code: <span className="font-mono font-bold">{studentProfile.family_code}</span> — share this
              with a parent or guardian so they can link to your account.
            </div>
          )}

          {pendingLinks.length > 0 && (
            <div className="mt-6 rounded-card border border-marigold bg-white p-4">
              <h2 className="font-display text-base font-bold">Parent link requests</h2>
              {pendingLinks.map((link) => (
                <div key={link.id} className="mt-2 flex items-center justify-between text-sm">
                  <span>{link.profiles?.display_name ?? "A parent"} wants to link to your account</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => respondToLink(link.id, true)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      Approve
                    </button>
                    <button type="button" onClick={() => respondToLink(link.id, false)} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink/60">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {bookmarks.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold">Bookmarked topics</h2>
              <ul className="mt-2 space-y-1">
                {bookmarks.map((b) =>
                  b.topics ? (
                    <li key={b.topic_id}>
                      <Link to={`/learn/${b.topic_id}`} className="text-primary font-medium">
                        {language === "hi" ? b.topics.title_hi : b.topics.title_en}
                      </Link>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}

          {recentAttempts.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold">Recent quiz results</h2>
              <ul className="mt-2 space-y-2">
                {recentAttempts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-card border border-black/5 bg-white px-4 py-2 text-sm">
                    <span>{a.quizzes ? (language === "hi" ? a.quizzes.title_hi : a.quizzes.title_en) : "Quiz"}</span>
                    <span className="font-semibold text-primary">{a.score}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="mt-8 flex gap-3">
        <Link to="/curriculum" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
          Explore curriculum
        </Link>
        <Link to="/cuet" className="rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
          CUET preparation
        </Link>
        <button type="button" onClick={() => signOut()} className="rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
          Log out
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-tint px-3 py-4">
      <p className="text-lg font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-primary/70">{label}</p>
    </div>
  );
}
