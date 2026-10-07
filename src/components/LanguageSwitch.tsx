import { useLanguage } from "../context/LanguageContext";

// Switching language never navigates or resets state - it only flips the
// `language` value in context, so the current page/lesson/quiz is preserved.
export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Choose language / भाषा चुनें"
      className="flex items-center rounded-full border border-primary/20 bg-white p-1 text-sm font-medium"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-full px-3 py-1 transition-colors ${
          language === "en" ? "bg-primary text-white" : "text-primary"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        aria-pressed={language === "hi"}
        className={`rounded-full px-3 py-1 transition-colors ${
          language === "hi" ? "bg-primary text-white" : "text-primary"
        }`}
      >
        हिं
      </button>
    </div>
  );
}
