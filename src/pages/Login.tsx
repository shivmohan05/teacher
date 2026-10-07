import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
    navigate(from, { replace: true });
  }

  return (
    <section className="mx-auto max-w-md px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-sm text-ink/60">Sign in with the email and password you registered with.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <p role="alert" className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium">Email</label>
          <input id="login-email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
          <input id="login-password" name="password" type="password" required minLength={8} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        New here? <Link to="/register" className="font-medium text-primary">Create an account</Link>
      </p>
    </section>
  );
}
