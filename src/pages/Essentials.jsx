import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const STEPS = [
  {
    number: "1",
    title: "Create one poll",
    detail: "Pick an industry template (restaurant, gym, salon...) or write your own one-line question with a few answer choices. That's it - no design work needed.",
    action: { to: "/create", label: "Create your first poll" }
  },
  {
    number: "2",
    title: "Print or share the QR code",
    detail: "Every poll gets a QR code. Put it on a table, counter, receipt, or door. It never needs to be reprinted, even if you change the question later.",
    action: { to: "/admin", label: "Go to your dashboard" }
  },
  {
    number: "3",
    title: "Check your results",
    detail: "Open your dashboard any time to see what people answered. If you want, turn on one simple thank-you message or discount code - everything else is optional.",
    action: { to: "/admin", label: "See your results" }
  }
];

export default function Essentials() {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8 p-4 sm:p-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-400">Start here</p>
          <h1 className="mt-2 text-3xl font-bold">The 3 things that actually matter</h1>
          <p className="mt-3 text-slate-300">
            Godwit has a lot of extra tools - rewards, prize draws, review links, benchmarks, an API. You don't need
            any of them to get value from your first poll. Do these three things, then come back here any time you
            feel lost.
          </p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step) => (
            <article key={step.number} className="rounded-lg border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 font-bold text-slate-950">{step.number}</span>
                <div>
                  <h2 className="text-lg font-bold">{step.title}</h2>
                  <p className="mt-1 text-sm text-slate-300">{step.detail}</p>
                  <Link to={step.action.to} className="mt-3 inline-block rounded bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950">
                    {step.action.label}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400">
          Everything else in your dashboard - rewards, prize draws, campaigns, benchmarks - is there when you're
          ready for it. It's fine to ignore all of it for now.
        </p>
      </div>
    </Layout>
  );
}
