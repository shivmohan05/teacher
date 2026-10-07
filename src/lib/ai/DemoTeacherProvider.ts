import type {
  AITeacherProvider,
  LearningContext,
  TeacherResponse,
  QuizResponse,
  RevisionResponse,
  AiAction,
  AiTeacherRequest,
} from "./AITeacherProvider";

// DemoTeacherProvider: a scripted, offline stand-in for a real AI model.
// Used client-side only when Supabase isn't configured at all (so the
// Phase 1/2 "preview without a backend" experience keeps working). Once
// Supabase is connected, the Lesson page uses SecureCloudAIProvider
// instead, which may itself fall back to equivalent demo text server-side
// if no AI provider secret is set - see supabase/functions/teacher-chat.
// Every response here is labeled isDemo: true and must never be
// presented to the student as a real AI.

function demoSafetyNotice(language: "en" | "hi"): string {
  return language === "hi"
    ? "AI के उत्तरों में गलतियाँ हो सकती हैं। महत्वपूर्ण जानकारी अपने शिक्षक और पाठ्यपुस्तक से जाँच लें।"
    : "AI responses may contain mistakes. Always verify important information with your teacher and textbook.";
}

const DEMO_TEXT: Record<AiAction, { en: (topic: string) => string; hi: (topic: string) => string }> = {
  explain_simple: {
    en: (topic) => `(Demo AI Teacher) A simple placeholder explanation of "${topic}" goes here once a real AI provider is connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" की एक सरल डेमो व्याख्या यहाँ तब दिखेगी जब एक वास्तविक AI सेवा जोड़ी जाएगी।`,
  },
  explain_detailed: {
    en: (topic) => `(Demo AI Teacher) A detailed placeholder explanation of "${topic}" goes here once a real AI provider is connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" की विस्तृत डेमो व्याख्या यहाँ तब दिखेगी जब एक वास्तविक AI सेवा जोड़ी जाएगी।`,
  },
  explain_hindi: {
    en: (topic) => `(Demo AI Teacher) A Hindi explanation of "${topic}" would appear here once connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" की हिंदी में व्याख्या यहाँ दिखेगी।`,
  },
  explain_english: {
    en: (topic) => `(Demo AI Teacher) An English explanation of "${topic}" would appear here once connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" की अंग्रेज़ी में व्याख्या यहाँ दिखेगी।`,
  },
  example: {
    en: (topic) => `(Demo AI Teacher) Here's a placeholder extra example for "${topic}".`,
    hi: (topic) => `(डेमो AI शिक्षक) यह "${topic}" के लिए एक और डेमो उदाहरण है।`,
  },
  steps: {
    en: (topic) => `(Demo AI Teacher) Step 1, Step 2, Step 3 - a real breakdown of "${topic}" appears once AI is connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) चरण 1, चरण 2, चरण 3 - "${topic}" का वास्तविक विवरण AI जुड़ने पर दिखेगा।`,
  },
  hint: {
    en: (topic) => `(Demo AI Teacher) Hint: think about what you already know about "${topic}".`,
    hi: (topic) => `(डेमो AI शिक्षक) संकेत: सोचें कि आप "${topic}" के बारे में पहले से क्या जानते हैं।`,
  },
  ask_question: {
    en: (topic) => `(Demo AI Teacher) Quick check: can you explain "${topic}" in your own words?`,
    hi: (topic) => `(डेमो AI शिक्षक) त्वरित जाँच: क्या आप "${topic}" को अपने शब्दों में समझा सकते हैं?`,
  },
  practice_questions: {
    en: (topic) => `(Demo AI Teacher) Five practice questions about "${topic}" would appear here once connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" के पाँच अभ्यास प्रश्न यहाँ दिखेंगे।`,
  },
  summarize: {
    en: (topic) => `(Demo AI Teacher) A short summary of "${topic}" would appear here once connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" का सारांश यहाँ दिखेगा।`,
  },
  revision_notes: {
    en: (topic) => `(Demo AI Teacher) Revision notes for "${topic}" would appear here once connected.`,
    hi: (topic) => `(डेमो AI शिक्षक) "${topic}" के पुनरीक्षण नोट्स यहाँ दिखेंगे।`,
  },
  free_question: {
    en: () => `(Demo AI Teacher) This is a scripted demo reply, not a real AI response.`,
    hi: () => `(डेमो AI शिक्षक) यह एक लिखित डेमो उत्तर है, वास्तविक AI प्रतिक्रिया नहीं।`,
  },
};

export class DemoTeacherProvider implements AITeacherProvider {
  async ask(context: LearningContext, request: AiTeacherRequest): Promise<TeacherResponse> {
    const entry = DEMO_TEXT[request.action];
    const message = context.language === "hi" ? entry.hi(context.topic) : entry.en(context.topic);
    return {
      message,
      curriculumReference: `${context.board} · Class ${context.studentClass} · ${context.subject} · ${context.chapter}`,
      isDemo: true,
      safetyNotice: demoSafetyNotice(context.language),
    };
  }

  async teachLesson(context: LearningContext, question: string): Promise<TeacherResponse> {
    return this.ask(context, { action: "free_question", question });
  }

  async generateQuiz(context: LearningContext): Promise<QuizResponse> {
    const res = await this.ask(context, { action: "practice_questions" });
    return {
      questions: [{ prompt: res.message, options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0 }],
      isDemo: true,
    };
  }

  async explainAnswer(context: LearningContext, question: string): Promise<TeacherResponse> {
    return this.ask(context, { action: "free_question", question });
  }

  async createRevisionNotes(context: LearningContext): Promise<RevisionResponse> {
    const res = await this.ask(context, { action: "revision_notes" });
    return { notes: [res.message], isDemo: true };
  }
}
