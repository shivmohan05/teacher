import InfoPage from "../components/InfoPage";

export default function Privacy() {
  return (
    <InfoPage title="Privacy">
      <div className="mb-4 rounded-card bg-tint px-5 py-4 text-sm text-primary">
        This is a technical prototype privacy notice. It is not a substitute
        for a legal privacy policy and must be reviewed by a qualified
        privacy professional before any public launch.
      </div>
      <p>
        We aim to collect the minimum information needed to run the
        platform: a display name, class, board, language preference and
        (for younger students) a parent/guardian email for consent. We do
        not collect home addresses, government ID numbers, or precise
        location.
      </p>
      <p>
        Parents can review, export, or request deletion of their child's
        data. Full account-deletion and data-export tooling is implemented
        in a later phase of this build.
      </p>
    </InfoPage>
  );
}
