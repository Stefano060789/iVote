import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function Legal({ kind }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Privacy notice" : "Terms of service";
  return <Layout><article className="mx-auto max-w-3xl space-y-5 p-2 sm:p-6">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"><strong>Draft legal placeholder:</strong> have EU-qualified legal counsel review and replace this page before public launch.</p>
    {isPrivacy ? <><section><h2 className="text-xl font-semibold">Data we process</h2><p>iVote processes account details, workspace settings, poll responses, and optional follow-up contact details only when a voter gives explicit consent.</p></section><section><h2 className="text-xl font-semibold">Your choices</h2><p>You may withdraw follow-up consent or request account deletion or an export from your account. These requests are reviewed before production data is removed.</p></section></> : <><section><h2 className="text-xl font-semibold">Using iVote</h2><p>Workspace owners are responsible for their polls, notices, and the lawful use of collected responses.</p></section><section><h2 className="text-xl font-semibold">Billing</h2><p>Paid plans renew monthly through Stripe until cancelled. Current prices and plan limits are shown in Billing and may change before launch.</p></section></>}
    <Link className="text-blue-300 underline" to="/support">Contact support</Link>
  </article></Layout>;
}