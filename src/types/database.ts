// Hand-written to match supabase/migrations exactly. There's no local
// Supabase CLI to auto-generate these (per the no-install constraint), so
// whenever a migration changes a table shape, update the matching type here.

export type AppRole = "student" | "parent" | "teacher" | "reviewer" | "admin";

export interface ProfileRow {
  id: string;
  role: AppRole;
  display_name: string;
  preferred_language: "en" | "hi";
  created_at: string;
  updated_at: string;
}

export interface StudentProfileRow {
  profile_id: string;
  class_number: number;
  board: string;
  state: string | null;
  learning_goal: string | null;
  daily_study_target_minutes: number;
  parent_email: string | null;
  family_code: string | null;
}

// --- Phase 5 ---

export interface ParentStudentLinkRow {
  id: string;
  parent_profile_id: string;
  student_profile_id: string;
  status: "pending" | "approved" | "revoked";
  created_at: string;
}

export interface ContentReportRow {
  id: string;
  reporter_profile_id: string | null;
  where_text: string;
  details: string;
  status: "open" | "resolved";
  created_at: string;
}

export interface CuetSubjectRow {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
}

export interface CuetTestRow {
  id: string;
  cuet_subject_id: string;
  quiz_id: string;
  is_mock: boolean;
}

export interface BoardRow {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
}

export interface StateRow {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
}

export interface ClassRow {
  id: string;
  number: number;
  label_en: string;
  label_hi: string;
}

export interface SubjectRow {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
  stage: "primary" | "middle" | "secondary";
}

export interface ChapterRow {
  id: string;
  board_subject_id: string;
  title_en: string;
  title_hi: string;
  order_index: number;
  status: string;
  academic_year: string;
  source_reference: string | null;
}

export interface TopicRow {
  id: string;
  chapter_id: string;
  title_en: string;
  title_hi: string;
  order_index: number;
  status: string;
  source_reference: string | null;
}

// --- Phase 3: lessons ---

export interface LessonRow {
  id: string;
  topic_id: string;
  status: string;
  academic_year: string;
  source_reference: string | null;
  has_formula: boolean;
}

export interface LessonTranslationRow {
  id: string;
  lesson_id: string;
  language: "en" | "hi";
  title: string;
  learning_objectives: string | null;
  key_definitions: string | null;
  explanation_simple: string;
  explanation_detailed: string | null;
  real_life_example: string | null;
  formula_box: string | null;
  worked_example: string | null;
  important_points: string[];
  common_mistakes: string[];
  quick_revision: string[];
}

// --- Phase 3: quiz engine ---

export type QuestionType = "mcq_single" | "true_false" | "fill_blank";

// Projection from the `questions_for_quiz` view - deliberately excludes
// correct_answer/explanation so the answer key isn't fetched while a
// student is still taking the quiz.
export interface QuestionForQuizRow {
  id: string;
  topic_id: string;
  type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  prompt_en: string;
  prompt_hi: string;
  status: string;
}

// Full row, only fetched at submit time for scoring (see README "Known
// limitations" for the honest caveat about this).
export interface QuestionFullRow extends QuestionForQuizRow {
  correct_answer: number | boolean | { en: string; hi: string };
  explanation_en: string | null;
  explanation_hi: string | null;
}

export interface QuestionOptionRow {
  id: string;
  question_id: string;
  order_index: number;
  text_en: string;
  text_hi: string;
}

export interface QuizRow {
  id: string;
  topic_id: string | null;
  title_en: string;
  title_hi: string;
  quiz_type: "topic" | "chapter" | "cuet";
  is_timed: boolean;
  time_limit_minutes: number | null;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  question_id: string;
  order_index: number;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  student_profile_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number;
  correct_count: number;
  status: "in_progress" | "submitted";
}

export interface QuizAnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: unknown;
  is_correct: boolean | null;
  marked_for_review: boolean;
  answered_at: string | null;
}

// --- Phase 3: progress tracking ---

export interface ProgressRow {
  id: string;
  student_profile_id: string;
  topic_id: string;
  status: "not_started" | "in_progress" | "completed";
  last_opened_at: string | null;
  completed_at: string | null;
}

export interface BookmarkRow {
  id: string;
  student_profile_id: string;
  topic_id: string;
  created_at: string;
}

export interface DailyGoalRow {
  id: string;
  student_profile_id: string;
  goal_date: string;
  target_minutes: number;
  completed_minutes: number;
}
