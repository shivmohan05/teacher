import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md px-4 py-20 text-center md:px-6">
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink/60">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
        Back to home
      </Link>
    </section>
  );
}
