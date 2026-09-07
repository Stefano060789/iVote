import Layout from "../components/Layout";

export default function Support() {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  return <Layout><div className="mx-auto max-w-xl space-y-4 p-2 sm:p-6"><h1 className="text-3xl font-bold">Support</h1><p>For account, billing, accessibility, privacy, or moderation help, use the support contact configured by your iVote administrator.</p>{supportEmail ? <a className="text-blue-300 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <p className="rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">Support email is not configured yet. Set <code>VITE_SUPPORT_EMAIL</code> before launch.</p>}</div></Layout>;
}