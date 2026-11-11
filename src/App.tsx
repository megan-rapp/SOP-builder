import { useEffect, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import DemoWorkspace from "./DemoWorkspace";
import Workspace from "./Workspace";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(`Could not restore your sign-in session: ${error.message}`);
      setSession(data.session);
      setLoading(false);
    }).catch((error: unknown) => {
      setAuthError(error instanceof Error ? `Could not restore your sign-in session: ${error.message}` : "Could not restore your sign-in session.");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setAuthError("");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (showDemo) return <DemoWorkspace onExit={() => setShowDemo(false)} />;
  if (!isSupabaseConfigured || !supabase) return <SupabaseSetup onDemo={() => setShowDemo(true)} />;
  if (loading) return <div className="auth-loading"><LoaderCircle size={23} className="spin" /> Loading secure workspace…</div>;
  if (!session?.user) return <EmailCodeSignIn client={supabase} initialError={authError} onDemo={() => setShowDemo(true)} />;
  const client = supabase;
  return <Workspace
    key={session.user.id}
    user={session.user}
    client={client}
    onSignOut={async () => {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }}
  />;
}

function SupabaseSetup({ onDemo }: { onDemo: () => void }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-tdo-logo" src="/images/tdo-logo.png" alt="TDO Software" />
        <span className="auth-kicker">ENDO SOP STUDIO</span>
        <h1>Connect your secure workspace</h1>
        <p>To enable email-code sign-in and shared practice data, connect this app to your Supabase project.</p>
        <div className="auth-setup-steps">
          <span>1</span><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your Vercel environment.</p>
          <span>2</span><p>Apply the SQL migration in <code>supabase/migrations</code>.</p>
          <span>3</span><p>Enable email OTP and configure SMTP in Supabase Auth.</p>
        </div>
        <p className="auth-footnote">The publishable key is safe for browser use when Row Level Security is enabled. Never expose a service-role key.</p>
        <button className="auth-demo-link" type="button" onClick={onDemo}>Explore the demo templates</button>
      </section>
    </main>
  );
}

function EmailCodeSignIn({ client, initialError, onDemo }: { client: SupabaseClient; initialError: string; onDemo: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: sendError } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setSent(true);
      setMessage(`A 6-digit sign-in code was sent to ${email.trim()}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the sign-in code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await client.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError) setError(verifyError.message);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify this code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: sendError } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setCode("");
      setMessage(`A new 6-digit code was sent to ${email.trim()}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not resend the sign-in code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-tdo-logo" src="/images/tdo-logo.png" alt="TDO Software" />
        <span className="auth-kicker">ENDO SOP STUDIO</span>
        <h1>{sent ? "Check your inbox" : "Welcome to your workspace"}</h1>
        <p>{sent ? "Enter the one-time code from your email to securely sign in." : "Sign in or get started with your practice email. No password needed."}</p>
        {sent ? (
          <form className="auth-form" onSubmit={verifyCode}>
            <label className="field-label" htmlFor="email-code">6-digit verification code</label>
            <input id="email-code" className="text-input otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <button className="button-primary auth-submit" type="submit" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />} Verify email</button>
            <button className="auth-secondary" type="button" onClick={() => void resendCode()} disabled={busy}>Resend code</button>
            <button className="auth-secondary" type="button" onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Use a different email</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={sendCode}>
            <label className="field-label" htmlFor="sign-in-email">Practice email</label>
            <div className="auth-email-field"><Mail size={17} /><input id="sign-in-email" type="email" autoComplete="email" placeholder="you@practice.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />} Send sign-in code</button>
          </form>
        )}
        {message && <p className="auth-message" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="auth-footnote"><ShieldCheck size={14} /> Your practice documents are private to verified practice members.</div>
        <button className="auth-demo-link" type="button" onClick={onDemo}>Explore the demo templates</button>
      </section>
    </main>
  );
}

export default App;
