import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import LanguageSwitch from "./LanguageSwitch";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
    isActive ? "bg-tint text-primary" : "text-ink/70 hover:text-primary"
  }`;

export default function Navbar() {
  const { t } = useLanguage();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/how-it-works", label: t.nav.howItWorks },
    { to: "/boards", label: t.nav.boards },
    { to: "/classes", label: t.nav.classes },
    { to: "/subjects", label: t.nav.subjects },
    { to: "/curriculum", label: "Curriculum" },
    { to: "/cuet", label: t.nav.cuet },
    { to: "/safety", label: t.nav.safety },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white">
            AT
          </span>
          AI Teacher
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitch />
          {session ? (
            <>
              <NavLink to="/dashboard" className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-tint">
                Dashboard
              </NavLink>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full bg-marigold px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-marigold-light"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-tint">
                {t.nav.login}
              </NavLink>
              <NavLink to="/register" className="rounded-full bg-marigold px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-marigold-light">
                {t.nav.register}
              </NavLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-black/10 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Primary mobile" className="flex flex-col gap-1 border-t border-black/5 bg-paper px-4 py-3 lg:hidden">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <div className="mt-2 flex items-center justify-between">
            <LanguageSwitch />
            <div className="flex gap-2">
              {session ? (
                <>
                  <NavLink to="/dashboard" className="rounded-full px-3 py-2 text-sm font-medium text-primary" onClick={() => setOpen(false)}>
                    Dashboard
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                    className="rounded-full bg-marigold px-3 py-2 text-sm font-semibold text-ink"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-primary" onClick={() => setOpen(false)}>
                    {t.nav.login}
                  </NavLink>
                  <NavLink to="/register" className="rounded-full bg-marigold px-3 py-2 text-sm font-semibold text-ink" onClick={() => setOpen(false)}>
                    {t.nav.register}
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
