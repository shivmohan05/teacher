import { supabase } from "../supabase";
import type {
  AITeacherProvider,
  LearningContext,
  TeacherResponse,
  QuizResponse,
  RevisionResponse,
  AiTeacherRequest,
} from "./AITeacherProvider";

// SecureCloudAIProvider never holds a provider API key. Every call goes
// through supabase.functions.invoke(), which attaches the signed-in
// student's own session token automatically; the real key (if any) lives
// only in the teacher-chat Edge Function's server-side secrets. If that
// function has no key configured, it returns the same kind of demo text
// as DemoTeacherProvider itself (with isDemo: true) - this class never
// needs to know which case it got.
export class SecureCloudAIProvider implements AITeacherProvider {
  constructor(private topicId: string) {}

  async ask(context: LearningContext, request: AiTeacherRequest): Promise<TeacherResponse> {
    if (!supabase) {
      return {
        message: "AI Teacher isn't connected yet - Supabase isn't configured.",
        isDemo: true,
      };
    }

    const { data, error } = await supabase.functions.invoke("teacher-chat", {
      body: {
        topicId: this.topicId,
        language: context.language,
        learningMode: context.learningMode,
        action: request.action,
        question: request.question ?? "",
      },
    });

    if (error || !data) {
      return {
        message:
          context.language === "hi"
            ? "अभी AI शिक्षक से जुड़ने में समस्या हुई। कृपया थोड़ी देर बाद फिर कोशिश करें।"
            : "There was a problem reaching the AI Teacher just now. Please try again in a moment.",
        isDemo: true,
      };
    }

    return {
      message: data.message,
      curriculumReference: data.curriculumReference,
      isDemo: Boolean(data.isDemo),
      safetyNotice: data.safetyNotice,
    };
  }

  async teachLesson(context: LearningContext, question: string): Promise<TeacherResponse> {
    return this.ask(context, { action: "free_question", question });
  }

  async explainAnswer(context: LearningContext, question: string): Promise<TeacherResponse> {
    return this.ask(context, { action: "free_question", question });
  }

  async createRevisionNotes(context: LearningContext): Promise<RevisionResponse> {
    const res = await this.ask(context, { action: "revision_notes" });
    return { notes: [res.message], isDemo: res.isDemo };
  }

  async generateQuiz(context: LearningContext): Promise<QuizResponse> {
    // Placeholder only: the real quiz engine (Phase 3) uses reviewed,
    // seeded questions, never AI-generated ones, for scoring integrity.
    // This exists so the interface is fully implemented; wiring
    // AI-drafted questions into the admin question bank for human review
    // is a Phase 5+ content-tooling feature, not a student-facing one.
    const res = await this.ask(context, { action: "practice_questions" });
    return {
      questions: [{ prompt: res.message, options: [], correctIndex: -1 }],
      isDemo: res.isDemo,
    };
  }
}
