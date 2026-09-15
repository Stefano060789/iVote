import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Account() {
  const navigate = useNavigate(); const [user, setUser] = useState(null); const [message, setMessage] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) navigate("/login"); else setUser(data.user); }); }, [navigate]);
  async function request(type) { const { error } = await supabase.from("privacy_requests").insert({ user_id: user.id, request_type: type }); setMessage(error ? error.message : "Request received. It will be reviewed before any production data is changed."); }

  const [factors, setFactors] = useState([]);
  const [pendingFactor, setPendingFactor] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");

  async function loadFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(data.totp);
  }
  useEffect(() => { if (user) loadFactors(); }, [user]);

  async function startEnroll() {
    setMfaError(""); setMfaMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    if (error) { setMfaError(error.message); return; }
    setPendingFactor(data);
  }

  async function confirmEnroll(e) {
    e.preventDefault();
    setMfaError("");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactor.id });
    if (challengeError) { setMfaError(challengeError.message); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: pendingFactor.id, challengeId: challenge.id, code: mfaCode.trim() });
    if (verifyError) { setMfaError(verifyError.message); return; }
    setPendingFactor(null); setMfaCode(""); setMfaMessage("Authenticator app enrolled. It will be required at your next sign-in.");
    loadFactors();
  }

  async function cancelEnroll() {
    if (pendingFactor) await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
    setPendingFactor(null); setMfaCode(""); setMfaError("");
  }

  async function removeFactor(factorId) {
    setMfaError(""); setMfaMessage("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) { setMfaError(error.message); return; }
    setMfaMessage("Authenticator app removed."); loadFactors();
  }

  if (!user) return null;
  return <Layout theme="workspace"><div className="mx-auto max-w-xl space-y-5 p-2 sm:p-6"><h1 className="text-3xl font-bold">Account</h1><p className="text-slate-300">Signed in as {user.email}</p>{message && <output className="block rounded border p-3 text-sm">{message}</output>}

    <section className="space-y-3 border-t pt-4">
      <h2 className="text-xl font-semibold">Two-factor authentication</h2>
      <p className="text-sm text-slate-300">
        Add an authenticator app (Google Authenticator, 1Password, Authy, etc.) as a second sign-in step, on top of
        your password.
      </p>
      {mfaError && <p className="text-sm text-red-600">{mfaError}</p>}
      {mfaMessage && <output className="block rounded border p-3 text-sm">{mfaMessage}</output>}

      {factors.length > 0 && (
        <ul className="space-y-2">
          {factors.map((factor) => (
            <li key={factor.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <span>{factor.friendly_name || "Authenticator app"} - {factor.status}</span>
              <button onClick={() => removeFactor(factor.id)} className="rounded border px-3 py-1 text-red-700">Remove</button>
            </li>
          ))}
        </ul>
      )}

      {!pendingFactor && (
        <button onClick={startEnroll} className="rounded border px-4 py-2">Add authenticator app</button>
      )}

      {pendingFactor && (
        <form onSubmit={confirmEnroll} className="space-y-3 rounded border p-3">
          <p className="text-sm">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <img src={pendingFactor.totp.qr_code} alt="Authenticator app QR code" className="h-40 w-40 bg-white p-2" />
          <p className="break-all text-xs text-slate-400">Can't scan? Enter this key manually: {pendingFactor.totp.secret}</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full rounded border p-2 text-black"
          />
          <div className="flex gap-3">
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Confirm</button>
            <button type="button" onClick={cancelEnroll} className="rounded border px-4 py-2">Cancel</button>
          </div>
        </form>
      )}
    </section>

    <section className="space-y-3 border-t pt-4"><h2 className="text-xl font-semibold">Privacy requests</h2><button onClick={() => request("consent_withdrawal")} className="rounded border px-4 py-2">Withdraw follow-up consent</button><button onClick={() => request("data_export")} className="ml-3 rounded border px-4 py-2">Request data export</button><button onClick={() => request("account_deletion")} className="block rounded bg-red-700 px-4 py-2 text-white">Request account deletion</button></section></div></Layout>;
}