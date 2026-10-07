import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const BOARDS = ["CBSE", "ICSE", "ISC", "HSE", "State Board"];

export default function Home() {
  const { t, language } = useLanguage();

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-6 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
              {t.home.eyebrowless_headline}
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink/70">{t.home.subhead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <NavLink
                to="/register"
                className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-light"
              >
                {t.home.ctaPrimary}
              </NavLink>
              <NavLink
                to="/how-it-works"
                className="rounded-full border border-primary/20 px-6 py-3 text-base font-semibold text-primary hover:bg-tint"
              >
                {t.home.ctaSecondary}
              </NavLink>
            </div>
          </div>

          {/* Live bilingual lesson-card demo — the "most characteristic thing" in this product's world */}
          <div className="rounded-card border border-black/5 bg-white p-6 shadow-[0_18px_40px_-20px_rgba(30,58,95,0.35)]">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-primary">
                Class 10 · Science · CBSE
              </span>
              <span className="text-xs text-ink/50">{language === "hi" ? "हिंदी" : "English"}</span>
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">
              {language === "hi" ? "प्रकाश का परावर्तन" : "Reflection of Light"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {language === "hi"
                ? "जब प्रकाश किसी चमकदार सतह, जैसे शीशे, से टकराता है और वापस लौटता है, तो उसे परावर्तन कहते हैं। आपके कमरे के शीशे में अपना प्रतिबिंब देखना इसका रोज़मर्रा का उदाहरण है।"
                : "When light hits a shiny surface, like a mirror, and bounces back, we call that reflection. Seeing your own reflection in a bathroom mirror every morning is reflection at work."}
            </p>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="rounded-full bg-paper px-3 py-1 text-ink/60 ring-1 ring-black/5">
                {language === "hi" ? "सरल रूप से समझाएँ" : "Explain simply"}
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-ink/60 ring-1 ring-black/5">
                {language === "hi" ? "एक उदाहरण और दें" : "Give another example"}
              </span>
            </div>
            <p className="mt-4 text-xs text-ink/40">
              {language === "hi"
                ? "डेमो पाठ सामग्री — आधिकारिक पाठ्यक्रम से पुष्टि करें।"
                : "Demonstration learning content. Verify against the current official syllabus."}
            </p>
          </div>
        </div>
      </section>

      {/* Demo notice banner */}
      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-card bg-tint px-6 py-4 text-sm text-primary">
          <span className="font-semibold">{t.home.demoNoticeTitle}:</span> {t.home.demoNoticeBody}
        </div>
      </section>

      {/* Boards */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="font-display text-2xl font-bold">{t.home.boardsHeading}</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {BOARDS.map((board) => (
            <span
              key={board}
              className="rounded-card border border-black/5 bg-white px-5 py-3 text-sm font-medium text-ink shadow-sm"
            >
              {board}
            </span>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="mx-auto max-w-6xl px-4 py-4 md:px-6">
        <div className="grid gap-6 rounded-card bg-primary px-6 py-10 text-white md:grid-cols-2 md:px-10">
          <div>
            <h2 className="font-display text-2xl font-bold">{t.home.languageHeading}</h2>
            <p className="mt-3 text-white/80">{t.home.languageBody}</p>
          </div>
          <div className="flex items-center justify-start md:justify-end">
            <div className="rounded-full bg-white/10 px-5 py-3 text-sm">EN ⇄ हिं</div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="font-display text-2xl font-bold">{t.home.safetyHeading}</h2>
        <p className="mt-3 max-w-2xl text-ink/70">{t.home.safetyBody}</p>
      </section>
    </div>
  );
}
