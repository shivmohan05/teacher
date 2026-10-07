import { useState } from "react";
import InfoPage from "../components/InfoPage";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <InfoPage title="Contact">
      {sent ? (
        <p role="status">Thanks — your message has been noted in this demo. A real submit endpoint is added in Phase 2.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-ink">Name</label>
            <input id="contact-name" name="name" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-ink">Email</label>
            <input id="contact-email" type="email" name="email" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-ink">Message</label>
            <textarea id="contact-message" name="message" required rows={4} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
            Send message
          </button>
        </form>
      )}
    </InfoPage>
  );
}
