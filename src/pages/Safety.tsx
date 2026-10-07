import InfoPage from "../components/InfoPage";

export default function Safety() {
  return (
    <InfoPage title="Child safety">
      <p>AI Teacher is built for children. That shapes every decision on this platform:</p>
      <ul>
        <li>No advertisements, no behavioural tracking, no manipulative engagement features</li>
        <li>No public student profiles, leaderboards, or student-to-student messaging</li>
        <li>Every AI reply can be reported in one tap</li>
        <li>The AI Teacher is designed to redirect unsafe or age-inappropriate requests to a trusted adult</li>
        <li>Parents see only learning-related information for their linked children — never comparisons or rankings</li>
      </ul>
      <p>
        If you or your child ever needs urgent help, please contact a
        trusted parent, guardian, teacher, counsellor, or local emergency
        service — this platform is not a substitute for that support.
      </p>
    </InfoPage>
  );
}
