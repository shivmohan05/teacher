import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-display text-lg font-bold text-primary">AI Teacher</p>
            <p className="mt-2 text-sm text-ink/60">{t.footer.rights}</p>
          </div>
          <nav aria-label="Platform">
            <p className="text-sm font-semibold text-ink">Platform</p>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              <li><NavLink to="/about">About</NavLink></li>
              <li><NavLink to="/how-it-works">How it works</NavLink></li>
              <li><NavLink to="/cuet">CUET preparation</NavLink></li>
              <li><NavLink to="/contact">Contact</NavLink></li>
            </ul>
          </nav>
          <nav aria-label="Trust">
            <p className="text-sm font-semibold text-ink">Trust &amp; Safety</p>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              <li><NavLink to="/safety">Child safety</NavLink></li>
              <li><NavLink to="/privacy">Privacy</NavLink></li>
              <li><NavLink to="/terms">Terms</NavLink></li>
              <li><NavLink to="/report-content">Report content</NavLink></li>
            </ul>
          </nav>
          <div>
            <p className="text-sm font-semibold text-ink">Demo notice</p>
            <p className="mt-2 text-sm text-ink/60">{t.footer.legalNote}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
