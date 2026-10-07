import InfoPage from "../components/InfoPage";

const GROUPS = [
  { label: "Primary (1–5)", subjects: ["Mathematics", "English", "Hindi", "Environmental Studies", "General Knowledge", "Computer Basics"] },
  { label: "Middle (6–8)", subjects: ["Mathematics", "Science", "Social Science", "English", "Hindi", "Computer Studies"] },
  { label: "Secondary & Senior Secondary (9–12)", subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Accountancy", "Business Studies", "Economics", "History", "Geography", "Political Science", "Computer Science", "Informatics Practices"] },
];

export default function Subjects() {
  return (
    <InfoPage title="Subjects">
      {GROUPS.map((group) => (
        <div key={group.label} className="mb-6">
          <h2>{group.label}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.subjects.map((s) => (
              <span key={s} className="rounded-full bg-tint px-3 py-1 text-sm text-primary">
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </InfoPage>
  );
}
