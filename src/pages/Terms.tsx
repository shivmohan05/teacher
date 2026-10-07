import InfoPage from "../components/InfoPage";

export default function Terms() {
  return (
    <InfoPage title="Terms">
      <div className="mb-4 rounded-card bg-tint px-5 py-4 text-sm text-primary">
        This is a technical prototype terms-of-use page, pending legal
        review before public launch.
      </div>
      <p>
        AI Teacher provides demonstration educational content and an AI
        Teacher assistant. Content is for learning support only and is not
        a replacement for your official textbook, syllabus, or classroom
        teacher.
      </p>
    </InfoPage>
  );
}
