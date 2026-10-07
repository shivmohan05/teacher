import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { StudentProfileRow, ProfileRow, QuizAttemptRow, QuizRow, ChapterRow, TopicRow } from "../../types/database";

interface AssignedClass {
  board: string;
  classNumber: number;
}

interface StudentWithProfile extends StudentProfileRow {
  profiles: ProfileRow | null;
}

interface AttemptWithQuiz extends QuizAttemptRow {
  quizzes: QuizRow | null;
  profiles: ProfileRow | null;
}

export default function TeacherDashboard() {
  const { profile, user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AttemptWithQuiz[]>([]);
  const [pendingChapters, setPendingChapters] = useState<ChapterRow[]>([]);
  const [pendingTopics, setPendingTopics] = useState<TopicRow[]>([]);

  useEffect(() => {
    if (!supabase || !user) return;
    (async () => {
      setLoading(true);

      const { data: teacherProfile } = await supabase.from("teacher_profiles").select("*").eq("profile_id", user.id).maybeSingle();
      const assigned: AssignedClass[] = ((teacherProfile?.assigned_classes as string[]) ?? [])
        .map((entry) => {
          const [board, classNumber] = entry.split("-");
          return { board, classNumber: Number(classNumber) };
        })
        .filter((a) => a.board && !Number.isNaN(a.classNumber));
      setAssignedClasses(assigned);

      // As of Phase 6, RLS itself only returns rows for this teacher's
      // assigned classes (migration 0009's teacher_has_class()) - this
      // query is no longer relying on a client-side filter for security,
      // the database already scoped it before the response arrives.
      const { data: allStudents } = await supabase.from("student_profiles").select("*, profiles(*)");
      setStudents((allStudents as unknown as StudentWithProfile[]) ?? []);

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("*, quizzes(*), profiles!quiz_attempts_student_profile_id_fkey(*)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(10);
      setRecentAttempts((attempts as unknown as AttemptWithQuiz[]) ?? []);

      const [{ data: chapters }, { data: topics }] = await Promise.all([
        supabase.from("chapters").select("*").in("status", ["draft", "under_review", "ai_generated"]).limit(10),
        supabase.from("topics").select("*").in("status", ["draft", "under_review", "ai_generated"]).limit(10),
      ]);
      setPendingChapters((chapters as ChapterRow[]) ?? []);
      setPendingTopics((topics as TopicRow[]) ?? []);

      setLoading(false);
    })();
  }, [user]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">
        Welcome{profile ? `, ${profile.display_name}` : ""}
      </h1>
      <p className="mt-2 text-ink/60">
        Role: <span className="font-medium text-primary">teacher</span>
      </p>

      {loading ? (
        <p className="mt-6 text-ink/60">Loading…</p>
      ) : (
        <>
          <div className="mt-6 rounded-card border border-black/5 bg-white p-4">
            <h2 className="font-display text-base font-bold">Assigned classes</h2>
            {assignedClasses.length === 0 ? (
              <p className="mt-1 text-sm text-ink/60">
                No classes assigned yet. An administrator sets this from the Admin Portal's Teacher management section.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {assignedClasses.map((a, i) => (
                  <span key={i} className="rounded-full bg-tint px-3 py-1 text-sm text-primary">
                    {a.board} - Class {a.classNumber}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-card border border-black/5 bg-white p-4">
            <h2 className="font-display text-base font-bold">Students in your classes ({students.length})</h2>
            {students.length === 0 ? (
              <p className="mt-1 text-sm text-ink/60">No students found for your assigned classes yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {students.map((s) => (
                  <li key={s.profile_id} className="flex justify-between">
                    <span>{s.profiles?.display_name ?? "Student"}</span>
                    <span className="text-ink/50">{s.board} · Class {s.class_number}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-card border border-black/5 bg-white p-4">
            <h2 className="font-display text-base font-bold">Recent quiz attempts (all classes)</h2>
            {recentAttempts.length === 0 ? (
              <p className="mt-1 text-sm text-ink/60">No quiz attempts yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {recentAttempts.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.profiles?.display_name ?? "Student"} — {a.quizzes?.title_en ?? "Quiz"}</span>
                    <span className="font-semibold text-primary">{a.score}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-card border border-black/5 bg-white p-4">
            <h2 className="font-display text-base font-bold">Content pending review</h2>
            {pendingChapters.length === 0 && pendingTopics.length === 0 ? (
              <p className="mt-1 text-sm text-ink/60">Nothing pending review right now.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {pendingChapters.map((c) => (
                  <li key={c.id}>Chapter: {c.title_en} — <span className="text-marigold">{c.status}</span></li>
                ))}
                {pendingTopics.map((t) => (
                  <li key={t.id}>Topic: {t.title_en} — <span className="text-marigold">{t.status}</span></li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-card bg-tint px-5 py-4 text-sm text-primary">
            Creating lessons/quizzes and assigning practice directly from this dashboard are planned as a
            dedicated content-authoring pass - see README "Known limitations". For now, content review here is
            read-only; publishing happens from the Admin Portal.
          </div>
        </>
      )}

      <button type="button" onClick={() => signOut()} className="mt-8 rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
        Log out
      </button>
    </section>
  );
}
