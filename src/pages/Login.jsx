import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Password-only sign-in only reaches "aal1". If this account has a verified authenticator
    // enrolled, Supabase requires a second "aal2" step before the session can be used - prompt
    // for the 6-digit code instead of navigating straight to the dashboard.
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setError(aalError.message);
      return;
    }

    if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        setError(factorsError.message);
        return;
      }
      const totpFactor = factorsData.totp.find((factor) => factor.status === "verified");
      if (!totpFactor) {
        setError("This account requires a two-factor code, but no verified authenticator app was found. Contact support.");
        return;
      }
      setMfaFactorId(totpFactor.id);
      return;
    }

    navigate("/admin");
  }

  async function handleVerifyMfa(e) {
    e.preventDefault();
    setError("");

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeError) {
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode.trim()
    });

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    navigate("/admin");
  }

  async function resetPassword() {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account` });
    setError(resetError ? resetError.message : "Password reset instructions have been sent if this account exists.");
  }

  if (mfaFactorId) {
    return (
      <div className="app-page max-w-md mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Enter your authenticator code</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleVerifyMfa} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-semibold">
            Verify
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-page max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Sign in to your workspace</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded text-black"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded text-black"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded font-semibold"
        >
          Sign in
        </button>
        <button type="button" onClick={resetPassword} className="w-full text-sm text-blue-300 underline">Forgot password?</button>
      </form>
    </div>
  );
}


