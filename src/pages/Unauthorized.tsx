import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <section className="mx-auto max-w-md px-4 py-20 text-center md:px-6">
      <h1 className="font-display text-3xl font-bold">You don't have access to this page</h1>
      <p className="mt-2 text-ink/60">
        This area is restricted to a different role on your account.
      </p>
      <Link to="/dashboard" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
        Back to my dashboard
      </Link>
    </section>
  );
}
