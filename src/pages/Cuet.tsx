import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import type { CuetSubjectRow, CuetTestRow } from "../types/database";

export default function Cuet() {
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<CuetSubjectRow[]>([]);
  const [tests, setTests] = useState<CuetTestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: subjectRows }, { data: testRows }] = await Promise.all([
        supabase.from("cuet_subjects").select("*").order("name_en"),
        supabase.from("cuet_tests").select("*"),
      ]);
      setSubjects((subjectRows as CuetSubjectRow[]) ?? []);
      setTests((testRows as CuetTestRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <InfoPage title="CUET preparation">
      <p>
        A dedicated space for Common University Entrance Test preparation — topic-wise and chapter-wise practice,
        full mock tests, and performance analysis by accuracy and score.
      </p>
      <div className="mt-4 rounded-card bg-tint px-5 py-4 text-sm text-primary">
        CUET information on this platform must be verified against the latest official examination bulletin,
        syllabus, eligibility criteria, subject combinations and notices. Demonstration tests shown here are not
        official papers.
      </div>

      {!isSupabaseConfigured ? (
        <p className="mt-6 text-ink/60">Connect Supabase to see live CUET subject cards — see the README.</p>
      ) : loading ? (
        <p className="mt-6 text-ink/60">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => {
            const test = tests.find((t) => t.cuet_subject_id === s.id);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-card border border-black/5 bg-white px-4 py-3">
                <span className="font-medium text-ink">{language === "hi" ? s.name_hi : s.name_en}</span>
                {test ? (
                  <Link to={`/quiz/${test.quiz_id}`} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                    {language === "hi" ? "डेमो मॉक शुरू करें" : "Start demo mock"}
                  </Link>
                ) : (
                  <span className="text-xs text-ink/40">{language === "hi" ? "जल्द आ रहा है" : "Coming soon"}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </InfoPage>
  );
}
