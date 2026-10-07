import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import type { BoardRow, StateRow, ClassRow, SubjectRow, ChapterRow, TopicRow } from "../types/database";

export default function CurriculumExplorer() {
  const { language } = useLanguage();
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [boardId, setBoardId] = useState("");
  const [stateId, setStateId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [topicsByChapter, setTopicsByChapter] = useState<Record<string, TopicRow[]>>({});
  const [lessonTopicIds, setLessonTopicIds] = useState<Set<string>>(new Set());
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedBoard = boards.find((b) => b.id === boardId);
  const needsState = selectedBoard?.code === "HSE" || selectedBoard?.code === "STATE";

  // Load reference data once.
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [b, s, c] = await Promise.all([
        supabase.from("boards").select("*").order("name_en"),
        supabase.from("states").select("*").order("name_en"),
        supabase.from("classes").select("*").order("number"),
      ]);
      if (b.data) setBoards(b.data as BoardRow[]);
      if (s.data) setStates(s.data as StateRow[]);
      if (c.data) setClasses(c.data as ClassRow[]);
    })();
  }, []);

  // Load subjects available for the chosen board (+ state) + class.
  useEffect(() => {
    if (!supabase || !boardId || !classId) {
      setSubjects([]);
      return;
    }
    (async () => {
      let query = supabase
        .from("board_subjects")
        .select("subject_id, subjects(*)")
        .eq("board_id", boardId)
        .eq("class_id", classId);
      if (needsState && stateId) query = query.eq("state_id", stateId);

      const { data, error } = await query;
      if (error) {
        setLoadError(error.message);
        return;
      }
      const subs = (data ?? [])
        .map((row: { subjects: SubjectRow | null }) => row.subjects)
        .filter((s): s is SubjectRow => Boolean(s));
      setSubjects(subs);
    })();
  }, [boardId, classId, stateId, needsState]);

  // Load chapters for the selected board_subject.
  useEffect(() => {
    if (!supabase || !boardId || !classId || !subjectId) {
      setChapters([]);
      return;
    }
    (async () => {
      const { data: bsRow } = await supabase
        .from("board_subjects")
        .select("id")
        .eq("board_id", boardId)
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .maybeSingle();

      if (!bsRow) {
        setChapters([]);
        return;
      }

      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("board_subject_id", bsRow.id)
        .order("order_index");

      if (error) setLoadError(error.message);
      setChapters((data as ChapterRow[]) ?? []);
    })();
  }, [boardId, classId, subjectId]);

  async function toggleChapter(chapterId: string) {
    if (openChapter === chapterId) {
      setOpenChapter(null);
      return;
    }
    setOpenChapter(chapterId);
    if (!topicsByChapter[chapterId] && supabase) {
      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("order_index");
      const topicRows = (data as TopicRow[]) ?? [];
      setTopicsByChapter((prev) => ({ ...prev, [chapterId]: topicRows }));

      if (topicRows.length > 0) {
        const { data: lessonRows } = await supabase
          .from("lessons")
          .select("topic_id")
          .in("topic_id", topicRows.map((t) => t.id));
        setLessonTopicIds((prev) => {
          const next = new Set(prev);
          for (const row of lessonRows ?? []) next.add(row.topic_id as string);
          return next;
        });
      }
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
        <h1 className="font-display text-2xl font-bold">Curriculum explorer</h1>
        <p className="mt-3 text-ink/60">
          This page reads live from the curriculum database. Connect
          Supabase (add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to see
          it in action — the README has the exact browser-only steps.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">Curriculum explorer</h1>
      <p className="mt-2 text-sm text-ink/60">
        Live from the database — this proves the Board → State → Class →
        Subject → Chapter → Topic structure end to end. Full lesson content
        and "Ask AI Teacher" arrive in Phase 3 and Phase 4.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Board">
          <select
            value={boardId}
            onChange={(e) => {
              setBoardId(e.target.value);
              setSubjectId("");
              setStateId("");
            }}
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          >
            <option value="">Select board</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {language === "hi" ? b.name_hi : b.name_en}
              </option>
            ))}
          </select>
        </Field>

        {needsState && (
          <Field label="State">
            <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2">
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {language === "hi" ? s.name_hi : s.name_en}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Class">
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSubjectId("");
            }}
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {language === "hi" ? c.label_hi : c.label_en}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjects.length === 0}
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          >
            <option value="">{subjects.length ? "Select subject" : "Choose board & class first"}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {language === "hi" ? s.name_hi : s.name_en}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}

      <div className="mt-8 space-y-3">
        {chapters.length === 0 && subjectId && (
          <p className="text-sm text-ink/60">No demonstration chapters yet for this combination.</p>
        )}
        {chapters.map((chapter) => (
          <div key={chapter.id} className="rounded-card border border-black/5 bg-white p-4">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="flex w-full items-center justify-between text-left font-semibold text-ink"
            >
              {language === "hi" ? chapter.title_hi : chapter.title_en}
              <span aria-hidden="true">{openChapter === chapter.id ? "−" : "+"}</span>
            </button>
            {openChapter === chapter.id && (
              <ul className="mt-3 space-y-2 border-t border-black/5 pt-3">
                {(topicsByChapter[chapter.id] ?? []).map((topic) => (
                  <li key={topic.id} className="flex items-center justify-between text-sm text-ink/70">
                    <span>{language === "hi" ? topic.title_hi : topic.title_en}</span>
                    {lessonTopicIds.has(topic.id) ? (
                      <Link to={`/learn/${topic.id}`} className="font-medium text-primary">
                        {language === "hi" ? "पाठ खोलें" : "Open lesson"}
                      </Link>
                    ) : (
                      <span className="text-ink/40">{language === "hi" ? "पाठ जल्द आ रहा है" : "Lesson coming soon"}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
