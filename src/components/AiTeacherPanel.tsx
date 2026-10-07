import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured } from "../lib/supabase";
import { DemoTeacherProvider } from "../lib/ai/DemoTeacherProvider";
import { SecureCloudAIProvider } from "../lib/ai/SecureCloudAIProvider";
import { isTTSSupported, speak, stopSpeaking } from "../lib/tts";
import type { AiAction, LearningContext } from "../lib/ai/AITeacherProvider";

interface ChatMessage {
  id: string;
  role: "student" | "ai";
  text: string;
  isDemo?: boolean;
  curriculumReference?: string;
  safetyNotice?: string;
}

const CONTROLS: Array<{ action: AiAction; en: string; hi: string }> = [
  { action: "explain_simple", en: "Explain simply", hi: "सरल रूप से समझाएँ" },
  { action: "explain_detailed", en: "Explain in detail", hi: "विस्तार से समझाएँ" },
  { action: "explain_hindi", en: "Explain in Hindi", hi: "हिंदी में समझाएँ" },
  { action: "explain_english", en: "Explain in English", hi: "अंग्रेज़ी में समझाएँ" },
  { action: "example", en: "Give another example", hi: "एक और उदाहरण दें" },
  { action: "steps", en: "Show steps", hi: "चरण दिखाएँ" },
  { action: "hint", en: "Give me a hint", hi: "संकेत दें" },
  { action: "ask_question", en: "Ask me a question", hi: "मुझसे एक प्रश्न पूछें" },
  { action: "practice_questions", en: "Create five practice questions", hi: "पाँच अभ्यास प्रश्न बनाएँ" },
  { action: "summarize", en: "Summarize this topic", hi: "इस विषय का सारांश दें" },
  { action: "revision_notes", en: "Create revision notes", hi: "पुनरीक्षण नोट्स बनाएँ" },
];

export default function AiTeacherPanel({
  topicId,
  context,
  topicTitleForReport,
}: {
  topicId: string;
  context: LearningContext;
  topicTitleForReport: string;
}) {
  const language = context.language;
  const provider = useMemo(
    () => (isSupabaseConfigured ? new SecureCloudAIProvider(topicId) : new DemoTeacherProvider()),
    [topicId]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  async function runAction(action: AiAction, label: string, question?: string) {
    setLoading(true);
    const studentMsg: ChatMessage = { id: crypto.randomUUID(), role: "student", text: question || label };
    setMessages((prev) => [...prev, studentMsg]);

    const res = await provider.ask(context, { action, question });

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      text: res.message,
      isDemo: res.isDemo,
      curriculumReference: res.curriculumReference,
      safetyNotice: res.safetyNotice,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  }

  function handleSend() {
    if (!freeText.trim() || loading) return;
    const question = freeText.trim();
    setFreeText("");
    runAction("free_question", question, question);
  }

  function handleReadAloud() {
    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    if (!lastAi) return;
    speak(lastAi.text, language);
    setSpeaking(true);
  }

  function handleStop() {
    stopSpeaking();
    setSpeaking(false);
  }

  function clearConversation() {
    stopSpeaking();
    setSpeaking(false);
    setMessages([]);
  }

  return (
    <div className="mt-4 rounded-card border border-black/5 bg-white p-4 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{language === "hi" ? "AI शिक्षक" : "AI Teacher"}</h2>
        <button type="button" onClick={clearConversation} className="text-xs font-medium text-ink/50 hover:text-ink">
          {language === "hi" ? "बातचीत साफ़ करें" : "Clear conversation"}
        </button>
      </div>

      {/* Transcript */}
      <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-ink/50">
            {language === "hi"
              ? "किसी बटन पर क्लिक करें या नीचे अपना प्रश्न लिखें।"
              : "Tap a button below, or type your own question."}
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "student" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-card px-4 py-2 text-sm ${m.role === "student" ? "bg-primary text-white" : "bg-tint text-ink"}`}>
              {m.role === "ai" && (
                <span className={`mb-1 block text-xs font-semibold ${m.isDemo ? "text-marigold" : "text-teal"}`}>
                  {m.isDemo ? (language === "hi" ? "डेमो AI शिक्षक" : "Demo AI Teacher") : language === "hi" ? "AI शिक्षक" : "AI Teacher"}
                </span>
              )}
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.role === "ai" && m.curriculumReference && (
                <p className="mt-1 text-xs text-ink/40">{m.curriculumReference}</p>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-ink/40">{language === "hi" ? "सोच रहे हैं…" : "Thinking…"}</p>}
      </div>

      {messages.some((m) => m.role === "ai") && (
        <p className="mt-2 text-xs text-ink/40">
          {language === "hi"
            ? "AI के उत्तरों में गलतियाँ हो सकती हैं। महत्वपूर्ण जानकारी अपने शिक्षक और पाठ्यपुस्तक से जाँच लें।"
            : "AI responses may contain mistakes. Always verify important information with your teacher and textbook."}
        </p>
      )}

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        {CONTROLS.map((c) => (
          <button
            key={c.action}
            type="button"
            disabled={loading}
            onClick={() => runAction(c.action, language === "hi" ? c.hi : c.en)}
            className="rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
          >
            {language === "hi" ? c.hi : c.en}
          </button>
        ))}

        {isTTSSupported() &&
          (speaking ? (
            <button type="button" onClick={handleStop} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary">
              {language === "hi" ? "पढ़ना बंद करें" : "Stop reading"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!messages.some((m) => m.role === "ai")}
              onClick={handleReadAloud}
              className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-40"
            >
              {language === "hi" ? "पाठ सुनें" : "Read aloud"}
            </button>
          ))}

        <Link
          to={`/report-content?topic=${encodeURIComponent(topicTitleForReport)}`}
          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
        >
          {language === "hi" ? "गलत उत्तर रिपोर्ट करें" : "Report incorrect answer"}
        </Link>
      </div>

      {/* Free-text question */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={language === "hi" ? "अपना प्रश्न लिखें…" : "Type your own question…"}
          maxLength={500}
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button type="button" onClick={handleSend} disabled={loading || !freeText.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {language === "hi" ? "भेजें" : "Send"}
        </button>
      </div>
    </div>
  );
}
