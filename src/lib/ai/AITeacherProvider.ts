// Provider-independent contract for the AI Teacher.
//
// IMPORTANT (security): no implementation of this interface may call an AI
// model directly from browser code with a secret key. SecureCloudAIProvider
// (added in Phase 4) only ever calls our own server-side endpoint
// (POST /api/teacher/chat, implemented as a Supabase Edge Function), which
// holds the real provider key. The browser never sees that key.

export interface LearningContext {
  studentClass: string;
  board: "CBSE" | "ICSE" | "ISC" | "HSE" | "State Board";
  state?: string | null;
  subject: string;
  chapter: string;
  topic: string;
  language: "en" | "hi";
  learningMode: "simple" | "detailed";
}

export interface TeacherResponse {
  message: string;
  curriculumReference?: string;
  isDemo: boolean;
  safetyNotice?: string;
}

export interface QuizResponse {
  questions: Array<{
    prompt: string;
    options: string[];
    correctIndex: number;
  }>;
  isDemo: boolean;
}

export interface RevisionResponse {
  notes: string[];
  isDemo: boolean;
}

// The lesson page's AI Teacher panel has many small control buttons
// ("Give another example", "Give me a hint", etc.) that don't map neatly
// onto the four methods below. Rather than add a near-duplicate method
// per button, `ask()` takes an action + optional free-text question and
// covers all of them through one flexible entry point. The original four
// methods stay as-is for anything that wants a narrower, typed call.
export type AiAction =
  | "explain_simple"
  | "explain_detailed"
  | "explain_hindi"
  | "explain_english"
  | "example"
  | "steps"
  | "hint"
  | "ask_question"
  | "practice_questions"
  | "summarize"
  | "revision_notes"
  | "free_question";

export interface AiTeacherRequest {
  action: AiAction;
  question?: string; // required for "free_question"
}

export interface AITeacherProvider {
  teachLesson(context: LearningContext, question: string): Promise<TeacherResponse>;
  generateQuiz(context: LearningContext): Promise<QuizResponse>;
  explainAnswer(context: LearningContext, question: string): Promise<TeacherResponse>;
  createRevisionNotes(context: LearningContext): Promise<RevisionResponse>;
  ask(context: LearningContext, request: AiTeacherRequest): Promise<TeacherResponse>;
}
