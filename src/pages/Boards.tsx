import InfoPage from "../components/InfoPage";

const BOARDS = [
  { name: "CBSE", note: "Central Board of Secondary Education" },
  { name: "ICSE", note: "Classes up to Class 10" },
  { name: "ISC", note: "Classes 11 and 12" },
  { name: "HSE", note: "State-specific — select your state to see the relevant curriculum" },
  { name: "State Board", note: "State-specific — select your state to see the relevant curriculum" },
];

export default function Boards() {
  return (
    <InfoPage title="Supported boards">
      <p>
        Choose the board your school follows. HSE and State Board curricula
        vary by state, so you'll be asked to select your state before that
        curriculum loads.
      </p>
      <ul>
        {BOARDS.map((b) => (
          <li key={b.name}>
            <strong>{b.name}</strong> — {b.note}
          </li>
        ))}
      </ul>
    </InfoPage>
  );
}
