import InfoPage from "../components/InfoPage";

export default function About() {
  return (
    <InfoPage title="About AI Teacher">
      <p>
        AI Teacher is a bilingual (Hindi/English) learning platform for
        students in Class 1 to 12, built around CBSE, ICSE, ISC, HSE and
        State Board curricula, with a dedicated CUET preparation track.
      </p>
      <p>
        This build is a working demonstration of the platform's
        architecture. Lesson content, quizzes and CUET questions shown here
        are original demonstration material created for testing — they are
        not the complete official curriculum of any board.
      </p>
      <h2>What's real right now</h2>
      <ul>
        <li>The public website, navigation and bilingual switch</li>
        <li>The installable, offline-capable PWA shell</li>
        <li>The account, dashboard and AI Teacher screens (arriving in later phases)</li>
      </ul>
    </InfoPage>
  );
}
