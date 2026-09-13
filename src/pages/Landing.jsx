import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import godwitLockup from "../assets/godwit-logo-lockup.svg";

const stepKeys = [
  { number: "01", titleKey: "steps.step1Title", detailKey: "steps.step1Detail" },
  { number: "02", titleKey: "steps.step2Title", detailKey: "steps.step2Detail" },
  { number: "03", titleKey: "steps.step3Title", detailKey: "steps.step3Detail" }
];

const outcomeKeys = [
  { titleKey: "outcomes.reusableTitle", detailKey: "outcomes.reusableDetail" },
  { titleKey: "outcomes.conversionTitle", detailKey: "outcomes.conversionDetail" },
  { titleKey: "outcomes.growthTitle", detailKey: "outcomes.growthDetail" },
  { titleKey: "outcomes.publicTitle", detailKey: "outcomes.publicDetail" },
  { titleKey: "outcomes.connectionTitle", detailKey: "outcomes.connectionDetail" }
];

const flockKeys = [
  { key: "robin", nameKey: "flock.robinName", roleKey: "flock.robinRole", detailKey: "flock.robinDetail" },
  { key: "tern", nameKey: "flock.ternName", roleKey: "flock.ternRole", detailKey: "flock.ternDetail" },
  { key: "flamingo", nameKey: "flock.flamingoName", roleKey: "flock.flamingoRole", detailKey: "flock.flamingoDetail" },
  { key: "waxwing", nameKey: "flock.waxwingName", roleKey: "flock.waxwingRole", detailKey: "flock.waxwingDetail" },
  { key: "redshank", nameKey: "flock.redshankName", roleKey: "flock.redshankRole", detailKey: "flock.redshankDetail" },
  { key: "owl", nameKey: "flock.owlName", roleKey: "flock.owlRole", detailKey: "flock.owlDetail" },
  { key: "magpie", nameKey: "flock.magpieName", roleKey: "flock.magpieRole", detailKey: "flock.magpieDetail" }
];

export default function Landing() {
  const { t } = useTranslation("translation", { keyPrefix: "landing" });
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
          <p className="landing-eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="landing-lede">{t("lede")}</p>
          {isSignedIn ? (
            <div className="landing-actions">
              <Link to="/admin" className="landing-admin-action">{t("workspaceDashboard")}</Link>
            </div>
          ) : (
            <div className="landing-actions">
              <Link to="/register" className="landing-primary-action">{t("createWorkspace")}</Link>
              <Link to="/login" className="landing-secondary-action">{t("workspaceLogin")}</Link>
            </div>
          )}
          <p className="landing-note">{t("note")}</p>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <img src={godwitLockup} alt="" />
        </div>
      </section>


      <section className="landing-section" aria-labelledby="how-it-works-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">{t("howItWorksEyebrow")}</p>
          <h2 id="how-it-works-title">{t("howItWorksTitle")}</h2>
        </div>
        <div className="landing-steps">
          {stepKeys.map((step) => (
            <article key={step.number} className="landing-step">
              <span>{step.number}</span>
              <h3>{t(step.titleKey)}</h3>
              <p>{t(step.detailKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-outcomes" aria-labelledby="outcomes-title">
        <div>
          <p className="landing-eyebrow">{t("outcomesEyebrow")}</p>
          <h2 id="outcomes-title">{t("outcomesTitle")}</h2>
        </div>
        <ul>
          {outcomeKeys.map((outcome) => (
            <li key={outcome.titleKey}><strong>{t(outcome.titleKey)}</strong><span>{t(outcome.detailKey)}</span></li>
          ))}
        </ul>
      </section>

      <section className="landing-flock" aria-labelledby="flock-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">{t("flockEyebrow")}</p>
          <h2 id="flock-title">{t("flockTitle")}</h2>
          <p className="landing-flock-lede">{t("flockLede")}</p>
        </div>
        <div className="landing-flock-grid">
          {flockKeys.map((bird) => (
            <article key={bird.key} className="landing-flock-card">
              <span className="landing-flock-badge" aria-hidden="true">
                <svg viewBox="0 0 40 60" width="22" height="33">
                  <path d="M20,58 C14,44 15,26 24,10 C31,17 35,29 33,41 C31,50 26,56 20,58 Z" fill="currentColor" />
                </svg>
              </span>
              <h3>{t(bird.nameKey)}</h3>
              <p className="landing-flock-role">{t(bird.roleKey)}</p>
              <p>{t(bird.detailKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <p className="landing-eyebrow">{t("finalEyebrow")}</p>
        <h2>{t("finalTitle")}</h2>
        <p className="landing-final-copy">{t("finalCopy")}</p>
        <div className="landing-admin-actions">
          {isSignedIn ? (
            <Link to="/admin" className="landing-admin-action">{t("openDashboard")}</Link>
          ) : (
            <Link to="/register" className="landing-primary-action">{t("createWorkspace")}</Link>
          )}
        </div>
      </section>
    </main>
  );
}