import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type {
  QuizRow,
  QuestionForQuizRow,
  QuestionOptionRow,
  QuizAttemptRow,
} from "../types/database";

type AnswerStatus = "unanswered" | "answered" | "skipped";

interface AnswerState {
  value: number | boolean | string | null;
  status: AnswerStatus;
  markedForReview: boolean;
}

type Phase = "intro" | "taking" | "result";

interface ScoredAnswer {
  questionId: string;
  isCorrect: boolean;
  promptEn: string;
  promptHi: string;
  explanationEn: string | null;
  explanationHi: string | null;
}

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuestionForQuizRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, QuestionOptionRow[]>>({});
  const [pastAttempts, setPastAttempts] = useState<QuizAttemptRow[]>([]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [fillBlankInput, setFillBlankInput] = useState("");
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [scoredAnswers, setScoredAnswers] = useState<ScoredAnswer[]>([]);
  const [resultSummary, setResultSummary] = useState<{ correct: number; total: number; score: number } | null>(null);

  useEffect(() => {
    if (!supabase || !quizId || !user) return;
    (async () => {
      setLoading(true);
      const { data: quizRow } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
      const { data: qqRows } = await supabase
        .from("quiz_questions")
        .select("question_id, order_index")
        .eq("quiz_id", quizId)
        .order("order_index");

      const questionIds = (qqRows ?? []).map((r) => r.question_id as string);

      const { data: questionRows } = questionIds.length
        ? await supabase.from("questions_for_quiz").select("*").in("id", questionIds)
        : { data: [] as QuestionForQuizRow[] };

      const ordered = (qqRows ?? [])
        .map((r) => (questionRows as QuestionForQuizRow[]).find((q) => q.id === r.question_id))
        .filter((q): q is QuestionForQuizRow => Boolean(q));

      const mcqIds = ordered.filter((q) => q.type === "mcq_single").map((q) => q.id);
      const { data: optionRows } = mcqIds.length
        ? await supabase.from("question_options").select("*").in("question_id", mcqIds).order("order_index")
        : { data: [] as QuestionOptionRow[] };

      const grouped: Record<string, QuestionOptionRow[]> = {};
      for (const opt of (optionRows as QuestionOptionRow[]) ?? []) {
        grouped[opt.question_id] = grouped[opt.question_id] ?? [];
        grouped[opt.question_id].push(opt);
      }

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_profile_id", user.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      setQuiz(quizRow as QuizRow | null);
      setQuestions(ordered);
      setOptionsByQuestion(grouped);
      setPastAttempts((attempts as QuizAttemptRow[]) ?? []);
      setLoading(false);
    })();
  }, [quizId, user]);

  function currentAnswer(questionId: string): AnswerState {
    return answers[questionId] ?? { value: null, status: "unanswered", markedForReview: false };
  }

  async function startAttempt() {
    if (!supabase || !user || !quizId) return;
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({ quiz_id: quizId, student_profile_id: user.id, total_questions: questions.length })
      .select()
      .single();
    if (error || !data) return;
    setAttemptId(data.id);
    setAnswers({});
    setCurrentIndex(0);
    setFillBlankInput("");
    setPhase("taking");
  }

  function setAnswerValue(value: AnswerState["value"]) {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...currentAnswer(q.id), value, status: value === null ? "unanswered" : "answered" },
    }));
  }

  function toggleMarkForReview() {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...currentAnswer(q.id), markedForReview: !currentAnswer(q.id).markedForReview },
    }));
  }

  function clearResponse() {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { value: null, status: "unanswered", markedForReview: currentAnswer(q.id).markedForReview } }));
    setFillBlankInput("");
  }

  function goTo(index: number) {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    const q = questions[index];
    const existing = q ? currentAnswer(q.id) : null;
    setFillBlankInput(existing && typeof existing.value === "string" ? existing.value : "");
  }

  function saveAndNext() {
    const q = questions[currentIndex];
    if (q && q.type === "fill_blank" && fillBlankInput.trim()) {
      setAnswerValue(fillBlankInput.trim());
    }
    goTo(currentIndex + 1);
  }

  function skip() {
    const q = questions[currentIndex];
    if (q && currentAnswer(q.id).status === "unanswered") {
      setAnswers((prev) => ({ ...prev, [q.id]: { ...currentAnswer(q.id), status: "skipped" } }));
    }
    goTo(currentIndex + 1);
  }

  async function handleSubmit() {
    if (!supabase || !user || !attemptId) return;

    // Scoring happens entirely server-side now (Phase 6 security fix) -
    // the browser sends only the student's own answers and never
    // fetches or holds the answer key at any point. See
    // supabase/functions/score-quiz.
    const payload = questions.map((q) => {
      const a = currentAnswer(q.id);
      return { questionId: q.id, selectedAnswer: a.value, markedForReview: a.markedForReview };
    });

    const { data, error } = await supabase.functions.invoke("score-quiz", {
      body: { attemptId, language, answers: payload },
    });

    if (error || !data) {
      setConfirmingSubmit(false);
      return;
    }

    const ordered = (data.perQuestion as ScoredAnswer[]).sort(
      (a, b) => questions.findIndex((q) => q.id === a.questionId) - questions.findIndex((q) => q.id === b.questionId)
    );

    setScoredAnswers(ordered);
    setResultSummary({ correct: data.correct, total: data.total, score: data.score });
    setConfirmingSubmit(false);
    setPhase("result");
  }

  if (loading) return <div className="px-4 py-20 text-center text-ink/60">Loading quiz…</div>;

  if (!quiz || questions.length === 0) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-2xl font-bold">Quiz not available</h1>
        <p className="mt-2 text-ink/60">This quiz has no questions yet, or doesn't exist.</p>
        <Link to="/curriculum" className="mt-4 inline-block font-medium text-primary">
          Back to curriculum
        </Link>
      </section>
    );
  }

  const title = language === "hi" ? quiz.title_hi : quiz.title_en;

  // ---------------- Intro / history screen ----------------
  if (phase === "intro") {
    const best = pastAttempts.reduce((max, a) => Math.max(max, a.score ?? 0), 0);
    const latest = pastAttempts[0]?.score ?? null;

    return (
      <section className="mx-auto max-w-2xl px-4 py-14 md:px-6">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink/60">
          {questions.length} {language === "hi" ? "प्रश्न" : "questions"} ·{" "}
          {language === "hi" ? "अपनी गति से उत्तर दें" : "Answer at your own pace"}
        </p>

        {pastAttempts.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat label={language === "hi" ? "सर्वश्रेष्ठ" : "Best score"} value={`${best}%`} />
            <Stat label={language === "hi" ? "नवीनतम" : "Latest score"} value={latest !== null ? `${latest}%` : "—"} />
            <Stat label={language === "hi" ? "प्रयास" : "Attempts"} value={String(pastAttempts.length)} />
          </div>
        )}

        <button type="button" onClick={startAttempt} className="mt-8 rounded-full bg-primary px-6 py-3 font-semibold text-white">
          {pastAttempts.length > 0 ? (language === "hi" ? "फिर से प्रयास करें" : "Retake quiz") : language === "hi" ? "प्रश्नोत्तरी शुरू करें" : "Start quiz"}
        </button>
      </section>
    );
  }

  // ---------------- Result screen ----------------
  if (phase === "result" && resultSummary) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-14 md:px-6">
        <h1 className="font-display text-3xl font-bold">{language === "hi" ? "परिणाम" : "Your result"}</h1>
        <div className="mt-4 rounded-card bg-tint px-5 py-4 text-primary">
          <p className="text-2xl font-bold">{resultSummary.score}%</p>
          <p className="text-sm">
            {resultSummary.correct} / {resultSummary.total} {language === "hi" ? "सही" : "correct"}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {scoredAnswers.map((sa, i) => (
            <div key={sa.questionId} className="rounded-card border border-black/5 bg-white p-4">
              <p className="text-sm font-semibold text-ink">
                {i + 1}. {language === "hi" ? sa.promptHi : sa.promptEn}
              </p>
              <p className={`mt-2 text-sm ${sa.isCorrect ? "text-teal" : "text-red-600"}`}>
                {sa.isCorrect ? (language === "hi" ? "सही ✓" : "Correct ✓") : language === "hi" ? "गलत ✕" : "Incorrect ✕"}
              </p>
              {(language === "hi" ? sa.explanationHi : sa.explanationEn) && (
                <p className="mt-1 text-sm text-ink/60">
                  {language === "hi" ? sa.explanationHi : sa.explanationEn}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => setPhase("intro")} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
            {language === "hi" ? "फिर से प्रयास करें" : "Retake quiz"}
          </button>
          <Link to="/dashboard" className="rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
            {language === "hi" ? "डैशबोर्ड पर जाएँ" : "Back to dashboard"}
          </Link>
        </div>
      </section>
    );
  }

  // ---------------- Taking screen ----------------
  const q = questions[currentIndex];
  const ans = currentAnswer(q.id);
  const options = optionsByQuestion[q.id] ?? [];

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="font-display text-2xl font-bold">{title}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_200px]">
        <div className="rounded-card border border-black/5 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/40">
            {language === "hi" ? "प्रश्न" : "Question"} {currentIndex + 1} / {questions.length} · {q.difficulty}
          </p>
          <p className="mt-2 font-medium text-ink">{language === "hi" ? q.prompt_hi : q.prompt_en}</p>

          <div className="mt-5">
            {q.type === "mcq_single" &&
              options.map((opt) => (
                <label key={opt.id} className="mb-2 flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={ans.value === opt.order_index}
                    onChange={() => setAnswerValue(opt.order_index)}
                  />
                  {language === "hi" ? opt.text_hi : opt.text_en}
                </label>
              ))}

            {q.type === "true_false" && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAnswerValue(true)}
                  className={`rounded-full px-5 py-2 text-sm font-medium ${ans.value === true ? "bg-primary text-white" : "bg-tint text-primary"}`}
                >
                  {language === "hi" ? "सही" : "True"}
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerValue(false)}
                  className={`rounded-full px-5 py-2 text-sm font-medium ${ans.value === false ? "bg-primary text-white" : "bg-tint text-primary"}`}
                >
                  {language === "hi" ? "गलत" : "False"}
                </button>
              </div>
            )}

            {q.type === "fill_blank" && (
              <input
                type="text"
                value={fillBlankInput}
                onChange={(e) => setFillBlankInput(e.target.value)}
                placeholder={language === "hi" ? "अपना उत्तर लिखें" : "Type your answer"}
                className="w-full rounded-lg border border-black/10 px-3 py-2"
              />
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary disabled:opacity-40">
              {language === "hi" ? "पिछला" : "Previous"}
            </button>
            <button type="button" onClick={saveAndNext} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              {language === "hi" ? "सहेजें और आगे" : "Save and Next"}
            </button>
            <button type="button" onClick={skip} className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
              {language === "hi" ? "छोड़ें" : "Skip"}
            </button>
            <button type="button" onClick={toggleMarkForReview} className="rounded-full border border-marigold px-4 py-2 text-sm font-medium text-marigold">
              {ans.markedForReview ? (language === "hi" ? "रिव्यू हटाएँ" : "Unmark review") : language === "hi" ? "रिव्यू के लिए चिह्नित करें" : "Mark for Review"}
            </button>
            <button type="button" onClick={clearResponse} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink/60">
              {language === "hi" ? "उत्तर साफ़ करें" : "Clear Response"}
            </button>
          </div>
        </div>

        {/* Palette */}
        <div className="rounded-card border border-black/5 bg-white p-4">
          <p className="text-xs font-semibold text-ink/50">{language === "hi" ? "प्रश्न पैलेट" : "Question palette"}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((qq, i) => {
              const state = currentAnswer(qq.id);
              const color =
                state.markedForReview
                  ? "bg-marigold text-ink"
                  : state.status === "answered"
                  ? "bg-teal text-white"
                  : state.status === "skipped"
                  ? "bg-red-100 text-red-700"
                  : "bg-paper text-ink/50 ring-1 ring-black/10";
              return (
                <button key={qq.id} type="button" onClick={() => goTo(i)} className={`h-9 w-9 rounded-lg text-sm font-semibold ${color} ${i === currentIndex ? "ring-2 ring-primary" : ""}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          {!confirmingSubmit ? (
            <button type="button" onClick={() => setConfirmingSubmit(true)} className="mt-5 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              {language === "hi" ? "जमा करें" : "Submit"}
            </button>
          ) : (
            <div className="mt-5 rounded-card bg-tint p-3 text-sm text-primary">
              <p>{language === "hi" ? "क्या आप सबमिट करना चाहते हैं?" : "Submit your answers?"}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={handleSubmit} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                  {language === "hi" ? "हाँ, जमा करें" : "Yes, submit"}
                </button>
                <button type="button" onClick={() => setConfirmingSubmit(false)} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary">
                  {language === "hi" ? "रद्द करें" : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-tint px-3 py-4">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-primary/70">{label}</p>
    </div>
  );
}
