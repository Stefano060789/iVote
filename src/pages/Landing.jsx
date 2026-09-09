import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
    title: "Turn responses into growth",
    detail: "Use answer patterns to invite honest public reviews, offer a benefit, and learn what brings customers back."
  }
];

export default function Landing() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsSignedIn(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setIsSignedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">QR feedback for real-world spaces</p>
          <h1>Turn every physical location into a measurable feedback channel.</h1>
          <p className="landing-lede">
            iVote helps venues turn a simple QR scan into feedback, campaign insight, and permission-based follow-up.
          </p>
          {isSignedIn ? (
            <div className="landing-actions">
              <Link to="/admin" className="landing-admin-action">Workspace dashboard</Link>
              <Link to="/create" className="landing-secondary-action">Create a Poll</Link>
            </div>
          ) : (
            <div className="landing-actions">
              <Link to="/register" className="landing-primary-action">Create a workspace</Link>
              <Link to="/login" className="landing-secondary-action">Workspace login</Link>
            </div>
          )}
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
          <p className="landing-eyebrow">Feedback that compounds</p>
          <h2 id="outcomes-title">Build a stronger connection after every response.</h2>
        </div>
        <ul>
          <li><strong>Reusable QR locations</strong><span>Keep the same printed QR code while changing the active poll.</span></li>
          <li><strong>Campaign conversion</strong><span>Compare scans with completed votes to see where engagement happens.</span></li>
          <li><strong>Permission-based market growth</strong><span>Invite voters to share their email for event news and offers only after clear consent.</span></li>
          <li><strong>More public feedback</strong><span>Send selected responses to Google, Tripadvisor, or another review platform with an optional voucher or discount code.</span></li>
          <li><strong>Customer connection</strong><span>Reward email opt-ins immediately and verify external review claims before releasing the second benefit.</span></li>
        </ul>
      </section>

      <section className="landing-final">
        <p className="landing-eyebrow">Ready to measure the room?</p>
        <h2>Launch your first QR feedback campaign.</h2>
        <p className="landing-final-copy">Create a poll, grow your permission-based audience, and turn customer feedback into the next conversation.</p>
        <div className="landing-admin-actions">
          <Link to="/create" className="landing-primary-action">Create poll</Link>
          <Link to="/admin" className="landing-admin-action">Workspace dashboard</Link>
        </div>
        {!isSignedIn && <Link to="/register" className="landing-register-link">New to iVote? Create a workspace</Link>}
      </section>
    </main>
  );
}