import { Link } from "react-router-dom";

const steps = [
  {
    number: "01",
    title: "Place a QR code",
    detail: "Use one branded QR poster at a table, counter, room, or event entrance."
  },
  {
    number: "02",
    title: "Collect feedback in seconds",
    detail: "Guests scan, choose an answer, and submit. No download or account is needed."
  },
  {
    number: "03",
    title: "See what works by location",
    detail: "Measure scans, responses, and conversion for every campaign you run."
  }
];

export default function Landing() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">QR feedback for real-world spaces</p>
          <h1>Turn every physical location into a measurable feedback channel.</h1>
          <p className="landing-lede">
            iVote helps venues turn a simple QR scan into feedback, campaign insight, and permission-based follow-up.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="landing-primary-action">Create a workspace</Link>
            <Link to="/login" className="landing-secondary-action">Sign in</Link>
          </div>
          <p className="landing-note">Built for venues, events, hospitality, retail, and in-person teams.</p>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="how-it-works-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">A simple loop</p>
          <h2 id="how-it-works-title">From a QR code to a better decision.</h2>
        </div>
        <div className="landing-steps">
          {steps.map((step) => (
            <article key={step.number} className="landing-step">
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-outcomes" aria-labelledby="outcomes-title">
        <div>
          <p className="landing-eyebrow">More than a poll</p>
          <h2 id="outcomes-title">See the real response to every campaign.</h2>
        </div>
        <ul>
          <li><strong>Reusable QR locations</strong><span>Keep the same printed QR code while changing the active poll.</span></li>
          <li><strong>Campaign conversion</strong><span>Compare scans with completed votes to see where engagement happens.</span></li>
          <li><strong>Optional follow-up</strong><span>Invite contact only when a voter actively gives consent.</span></li>
        </ul>
      </section>

      <section className="landing-final">
        <p className="landing-eyebrow">Ready to measure the room?</p>
        <h2>Launch your first QR feedback campaign.</h2>
        <p className="landing-final-copy">Create a new poll or manage the feedback campaigns already running in your workspace.</p>
        <div className="landing-admin-actions">
          <Link to="/create" className="landing-primary-action">Create poll</Link>
          <Link to="/admin" className="landing-admin-action">Admin dashboard</Link>
        </div>
        <Link to="/register" className="landing-register-link">New to iVote? Create a workspace</Link>
      </section>
    </main>
  );
}