import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isTTSSupported, speak, stopSpeaking } from "../lib/tts";
import AiTeacherPanel from "../components/AiTeacherPanel";
import type { LearningContext } from "../lib/ai/AITeacherProvider";
import type {
  TopicRow,
  ChapterRow,
  BoardRow,
  ClassRow,
  SubjectRow,
  LessonRow,
  LessonTranslationRow,
} from "../types/database";

type TranslationMap = Record<"en" | "hi", LessonTranslationRow | null>;

export default function Lesson() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [topic, setTopic] = useState<TopicRow | null>(null);
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [subject, setSubject] = useState<SubjectRow | null>(null);
  const [siblings, setSiblings] = useState<TopicRow[]>([]);
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [translations, setTranslations] = useState<TranslationMap>({ en: null, hi: null });
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [mode, setMode] = useState<"simple" | "detailed">("simple");
  const [markedComplete, setMarkedComplete] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!supabase || !topicId || !user) return;
    let cancelled = false;
    openedAtRef.current = Date.now();

    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data: topicData } = await supabase.from("topics").select("*").eq("id", topicId).maybeSingle();
      if (!topicData) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      const { data: chapterData } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", (topicData as TopicRow).chapter_id)
        .maybeSingle();

      let boardData: BoardRow | null = null;
      let classData: ClassRow | null = null;
      let subjectData: SubjectRow | null = null;

      if (chapterData) {
        const { data: bsData } = await supabase
          .from("board_subjects")
          .select("*")
          .eq("id", (chapterData as ChapterRow).board_subject_id)
          .maybeSingle();

        if (bsData) {
          const [{ data: b }, { data: c }, { data: s }] = await Promise.all([
            supabase.from("boards").select("*").eq("id", bsData.board_id).maybeSingle(),
            supabase.from("classes").select("*").eq("id", bsData.class_id).maybeSingle(),
            supabase.from("subjects").select("*").eq("id", bsData.subject_id).maybeSingle(),
          ]);
          boardData = b as BoardRow | null;
          classData = c as ClassRow | null;
          subjectData = s as SubjectRow | null;
        }
      }

      const { data: siblingTopics } = chapterData
        ? await supabase
            .from("topics")
            .select("*")
            .eq("chapter_id", (chapterData as ChapterRow).id)
            .order("order_index")
        : { data: [] as TopicRow[] };

      const { data: lessonData } = await supabase.from("lessons").select("*").eq("topic_id", topicId).maybeSingle();

      let translationMap: TranslationMap = { en: null, hi: null };
      if (lessonData) {
        const { data: translationRows } = await supabase
          .from("lesson_translations")
          .select("*")
          .eq("lesson_id", (lessonData as LessonRow).id);
        for (const row of (translationRows as LessonTranslationRow[]) ?? []) {
          translationMap[row.language] = row;
        }
      }

      const { data: quizRow } = await supabase.from("quizzes").select("id").eq("topic_id", topicId).maybeSingle();

      const { data: bookmarkRow } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("student_profile_id", user.id)
        .eq("topic_id", topicId)
        .maybeSingle();

      await supabase.from("progress").upsert(
        {
          student_profile_id: user.id,
          topic_id: topicId,
          status: "in_progress",
          last_opened_at: new Date().toISOString(),
        },
        { onConflict: "student_profile_id,topic_id" }
      );

      if (cancelled) return;
      setTopic(topicData as TopicRow);
      setChapter(chapterData as ChapterRow | null);
      setBoard(boardData);
      setCls(classData);
      setSubject(subjectData);
      setSiblings((siblingTopics as TopicRow[]) ?? []);
      setLesson((lessonData as LessonRow) ?? null);
      setTranslations(translationMap);
      setQuizId((quizRow as { id: string } | null)?.id ?? null);
      setIsBookmarked(Boolean(bookmarkRow));
      setMarkedComplete(false);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [topicId, user]);

  const t = translations[language];
  const currentIndex = siblings.findIndex((s) => s.id === topicId);
  const prevTopic = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextTopic = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  async function recordStudySession() {
    if (!supabase || !user) return;
    const durationMinutes = Math.max(1, Math.round((Date.now() - openedAtRef.current) / 60000));
    await supabase.from("study_sessions").insert({
      student_profile_id: user.id,
      started_at: new Date(openedAtRef.current).toISOString(),
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
    });

    const today = new Date().toISOString().slice(0, 10);
    const { data: existingGoal } = await supabase
      .from("daily_goals")
      .select("*")
      .eq("student_profile_id", user.id)
      .eq("goal_date", today)
      .maybeSingle();

    await supabase.from("daily_goals").upsert(
      {
        student_profile_id: user.id,
        goal_date: today,
        target_minutes: existingGoal?.target_minutes ?? 20,
        completed_minutes: (existingGoal?.completed_minutes ?? 0) + durationMinutes,
      },
      { onConflict: "student_profile_id,goal_date" }
    );
  }

  async function handleMarkComplete() {
    if (!supabase || !user || !topicId) return;
    await supabase.from("progress").upsert(
      {
        student_profile_id: user.id,
        topic_id: topicId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "student_profile_id,topic_id" }
    );
    await recordStudySession();
    openedAtRef.current = Date.now();
    setMarkedComplete(true);
  }

  async function toggleBookmark() {
    if (!supabase || !user || !topicId) return;
    if (isBookmarked) {
      await supabase.from("bookmarks").delete().eq("student_profile_id", user.id).eq("topic_id", topicId);
    } else {
      await supabase.from("bookmarks").insert({ student_profile_id: user.id, topic_id: topicId });
    }
    setIsBookmarked(!isBookmarked);
  }

  function handleReadAloud() {
    if (!t) return;
    const text = [t.explanation_simple, mode === "detailed" ? t.explanation_detailed : null].filter(Boolean).join(". ");
    speak(text, language);
    setSpeaking(true);
  }

  function handleStopReading() {
    stopSpeaking();
    setSpeaking(false);
  }

  function downloadNotes() {
    if (!t) return;
    const heading = language === "hi" ? "त्वरित पुनरीक्षण" : "Quick revision";
    const pointsHeading = language === "hi" ? "मुख्य बिंदु" : "Important points";
    const lines = [
      t.title,
      "",
      `${heading}:`,
      ...t.quick_revision.map((l) => `- ${l}`),
      "",
      `${pointsHeading}:`,
      ...t.important_points.map((l) => `- ${l}`),
      "",
      language === "hi"
        ? "डेमो पाठ सामग्री - आधिकारिक पाठ्यक्रम से पुष्टि करें।"
        : "Demonstration learning content. Verify against the current official syllabus.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title.replace(/\s+/g, "-").toLowerCase()}-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="px-4 py-20 text-center text-ink/60">Loading lesson…</div>;
  }

  if (notFound || !topic) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-2xl font-bold">Topic not found</h1>
        <Link to="/curriculum" className="mt-4 inline-block text-primary font-medium">
          Back to curriculum explorer
        </Link>
      </section>
    );
  }

  if (!lesson || !t) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-2xl font-bold">
          {language === "hi" ? topic.title_hi : topic.title_en}
        </h1>
        <p className="mt-3 text-ink/60">
          {language === "hi"
            ? "इस विषय के लिए अभी कोई पाठ सामग्री नहीं है। डेमो सामग्री जोड़ने के लिए seed_phase3.sql चलाएं।"
            : "There's no lesson content for this topic yet. Run supabase/seed_phase3.sql to add the demonstration lesson."}
        </p>
        <Link to="/curriculum" className="mt-4 inline-block text-primary font-medium">
          Back to curriculum explorer
        </Link>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      {/* Breadcrumb */}
      <p className="text-xs uppercase tracking-wide text-ink/40">
        {[
          board ? (language === "hi" ? board.name_hi : board.name_en) : null,
          cls ? (language === "hi" ? cls.label_hi : cls.label_en) : null,
          subject ? (language === "hi" ? subject.name_hi : subject.name_en) : null,
          chapter ? (language === "hi" ? chapter.title_hi : chapter.title_en) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <h1 className="mt-2 font-display text-3xl font-bold text-ink">{t.title}</h1>

      <div className="mt-3 rounded-card bg-tint px-4 py-3 text-sm text-primary">
        {language === "hi"
          ? "डेमो पाठ सामग्री। आधिकारिक पाठ्यक्रम और निर्धारित पाठ्यपुस्तक से पुष्टि करें।"
          : "Demonstration learning content. Verify against the current official syllabus and prescribed textbooks."}
      </div>

      {/* Mode toggle */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("simple")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${mode === "simple" ? "bg-primary text-white" : "bg-tint text-primary"}`}
        >
          {language === "hi" ? "सरल रूप से समझाएँ" : "Explain simply"}
        </button>
        {t.explanation_detailed && (
          <button
            type="button"
            onClick={() => setMode("detailed")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${mode === "detailed" ? "bg-primary text-white" : "bg-tint text-primary"}`}
          >
            {language === "hi" ? "विस्तार से समझाएँ" : "Explain in detail"}
          </button>
        )}
      </div>

      {t.learning_objectives && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">{language === "hi" ? "सीखने के उद्देश्य" : "Learning objectives"}</h2>
          <p className="mt-1 text-ink/70">{t.learning_objectives}</p>
        </section>
      )}

      {t.key_definitions && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">{language === "hi" ? "मुख्य परिभाषाएँ" : "Key definitions"}</h2>
          <p className="mt-1 text-ink/70">{t.key_definitions}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">{language === "hi" ? "समझाएँ" : "Explanation"}</h2>
        <p className="mt-1 text-ink/70">{mode === "detailed" && t.explanation_detailed ? t.explanation_detailed : t.explanation_simple}</p>
      </section>

      {t.real_life_example && (
        <section className="mt-6 rounded-card border border-black/5 bg-white p-4">
          <h2 className="font-display text-base font-bold">{language === "hi" ? "रोज़मर्रा का उदाहरण" : "Real-life example"}</h2>
          <p className="mt-1 text-sm text-ink/70">{t.real_life_example}</p>
        </section>
      )}

      {lesson.has_formula && t.formula_box && (
        <section className="mt-4 rounded-card bg-primary px-4 py-3 text-white">
          <p className="text-sm font-semibold">{language === "hi" ? "सूत्र" : "Formula"}</p>
          <p className="mt-1 font-display text-lg">{t.formula_box}</p>
        </section>
      )}

      {t.worked_example && (
        <section className="mt-4 rounded-card border border-black/5 bg-white p-4">
          <h2 className="font-display text-base font-bold">{language === "hi" ? "हल किया गया उदाहरण" : "Worked example"}</h2>
          <p className="mt-1 text-sm text-ink/70">{t.worked_example}</p>
        </section>
      )}

      {t.important_points.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">{language === "hi" ? "मुख्य बिंदु" : "Important points"}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/70">
            {t.important_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {t.common_mistakes.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">{language === "hi" ? "सामान्य गलतियाँ" : "Common mistakes"}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/70">
            {t.common_mistakes.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {t.quick_revision.length > 0 && (
        <section className="mt-6 rounded-card bg-tint px-4 py-4">
          <h2 className="font-display text-lg font-bold text-primary">{language === "hi" ? "त्वरित पुनरीक्षण" : "Quick revision"}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-primary/90">
            {t.quick_revision.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Action bar */}
      <div className="mt-8 flex flex-wrap gap-2 border-t border-black/5 pt-6 print:hidden">
        <button type="button" onClick={toggleBookmark} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
          {isBookmarked ? (language === "hi" ? "बुकमार्क हटाएँ" : "Remove bookmark") : language === "hi" ? "बुकमार्क करें" : "Bookmark"}
        </button>

        <button
          type="button"
          onClick={handleMarkComplete}
          disabled={markedComplete}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {markedComplete ? (language === "hi" ? "पूर्ण ✓" : "Completed ✓") : language === "hi" ? "पूर्ण के रूप में चिह्नित करें" : "Mark as complete"}
        </button>

        {quizId ? (
          <button type="button" onClick={() => navigate(`/quiz/${quizId}`)} className="rounded-full bg-marigold px-4 py-2 text-sm font-semibold text-ink">
            {language === "hi" ? "प्रश्नोत्तरी शुरू करें" : "Start quiz"}
          </button>
        ) : (
          <span className="rounded-full bg-paper px-4 py-2 text-sm text-ink/40 ring-1 ring-black/5">
            {language === "hi" ? "प्रश्नोत्तरी जल्द आ रही है" : "Quiz coming soon"}
          </span>
        )}

        <button type="button" onClick={() => setShowAiPanel((v) => !v)} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
          {language === "hi" ? "AI शिक्षक से पूछें" : "Ask AI Teacher"}
        </button>

        {isTTSSupported() ? (
          speaking ? (
            <button type="button" onClick={handleStopReading} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
              {language === "hi" ? "पढ़ना बंद करें" : "Stop reading"}
            </button>
          ) : (
            <button type="button" onClick={handleReadAloud} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
              {language === "hi" ? "पाठ सुनें" : "Read aloud"}
            </button>
          )
        ) : (
          <span className="rounded-full bg-paper px-4 py-2 text-sm text-ink/40 ring-1 ring-black/5">
            {language === "hi" ? "यह ब्राउज़र टेक्स्ट-टू-स्पीच समर्थित नहीं करता" : "Read aloud isn't supported in this browser"}
          </span>
        )}

        <button type="button" onClick={downloadNotes} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
          {language === "hi" ? "नोट्स डाउनलोड करें" : "Download notes"}
        </button>

        <button type="button" onClick={() => window.print()} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
          {language === "hi" ? "प्रिंट करें" : "Print lesson"}
        </button>

        <Link
          to={`/report-content?topic=${encodeURIComponent(t.title)}`}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
        >
          {language === "hi" ? "गलत सामग्री रिपोर्ट करें" : "Report incorrect content"}
        </Link>
      </div>

      {showAiPanel && topicId && (
        <AiTeacherPanel
          topicId={topicId}
          topicTitleForReport={t.title}
          context={{
            studentClass: cls ? String(cls.number) : "",
            board: board?.code === "STATE" ? "State Board" : ((board?.code as LearningContext["board"]) ?? "CBSE"),
            state: null,
            subject: subject ? (language === "hi" ? subject.name_hi : subject.name_en) : "",
            chapter: chapter ? (language === "hi" ? chapter.title_hi : chapter.title_en) : "",
            topic: t.title,
            language,
            learningMode: mode,
          }}
        />
      )}

      {/* Prev / Next */}
      <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-6 text-sm print:hidden">
        {prevTopic ? (
          <Link to={`/learn/${prevTopic.id}`} className="font-medium text-primary">
            ← {language === "hi" ? prevTopic.title_hi : prevTopic.title_en}
          </Link>
        ) : (
          <span className="text-ink/30">{language === "hi" ? "कोई पिछला विषय नहीं" : "No previous topic"}</span>
        )}
        {nextTopic ? (
          <Link to={`/learn/${nextTopic.id}`} className="font-medium text-primary">
            {language === "hi" ? nextTopic.title_hi : nextTopic.title_en} →
          </Link>
        ) : (
          <span className="text-ink/30">{language === "hi" ? "कोई अगला विषय नहीं" : "No next topic"}</span>
        )}
      </div>
    </article>
  );
}
