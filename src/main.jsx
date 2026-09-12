import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as Sentry from "@sentry/react";

import NavBar from "./components/NavBar";
import { getCookieConsent, COOKIE_CONSENT_EVENT } from "./lib/cookieConsent";
import "./i18n";

// Every page is code-split into its own chunk. Vote/ThankYou are what a
// customer's phone actually downloads after scanning a QR code, so keeping
// them (and everything else) out of the initial bundle matters more than
// having a single JS file - a voter on a slow café connection never needs
// the admin dashboard's ~1500 lines or chart.js just to submit one answer.
const CreatePoll = lazy(() => import("./pages/CreatePoll"));
const Vote = lazy(() => import("./pages/Vote"));
const Results = lazy(() => import("./pages/Results"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const EditPoll = lazy(() => import("./pages/EditPoll"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const QrRedirect = lazy(() => import("./pages/QrRedirect"));
const Billing = lazy(() => import("./pages/Billing"));
const Landing = lazy(() => import("./pages/Landing"));
const Account = lazy(() => import("./pages/Account"));
const Legal = lazy(() => import("./pages/Legal"));
const Support = lazy(() => import("./pages/Support"));
const Moderation = lazy(() => import("./pages/Moderation"));
const ProductFeedback = lazy(() => import("./pages/ProductFeedback"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Essentials = lazy(() => import("./pages/Essentials"));

import "./style.css";

function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, sendDefaultPii: false });
  }
}

// Only start error reporting once the visitor has explicitly accepted it (see CookieConsent).
// If they accept later in the same session, start reporting from that point on.
if (getCookieConsent() === "accepted") {
  initSentry();
}
window.addEventListener(COOKIE_CONSENT_EVENT, (event) => {
  if (event.detail === "accepted") initSentry();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(console.error));
}

function PageLoading() {
  return <p className="p-10 text-center text-sm text-slate-400">Loading...</p>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <NavBar />
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/essentials" element={<Essentials />} />
        <Route path="/create" element={<CreatePoll />} />
        <Route path="/vote/:pollId" element={<Vote />} />
        <Route path="/qr/:token" element={<QrRedirect />} />
        <Route path="/results/:pollId" element={<Results />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/thanks" element={<ThankYou />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/billing" element={<Billing />} />
        <Route path="/admin/moderation" element={<Moderation />} />
        <Route path="/edit/:pollId" element={<EditPoll />} />
        <Route path="/account" element={<Account />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/support" element={<Support />} />
        <Route path="/feedback" element={<ProductFeedback />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
