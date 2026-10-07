import InfoPage from "../components/InfoPage";

export default function Classes() {
  const classes = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <InfoPage title="Classes">
      <p>AI Teacher supports Class 1 through Class 12, with content depth that adjusts to the age group.</p>
      <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {classes.map((c) => (
          <div
            key={c}
            className="rounded-card border border-black/5 bg-white py-4 text-center text-sm font-semibold text-primary shadow-sm"
          >
            Class {c}
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
