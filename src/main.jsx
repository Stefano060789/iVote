import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as Sentry from "@sentry/react";

import NavBar from "./components/NavBar";
import CreatePoll from "./pages/CreatePoll";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import AdminAnalytics from "./pages/AdminAnalytics";
import EditPoll from "./pages/EditPoll";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ThankYou from "./pages/ThankYou";
import QrRedirect from "./pages/QrRedirect";
import Billing from "./pages/Billing";
import Landing from "./pages/Landing";
import Account from "./pages/Account";
import Legal from "./pages/Legal";
import Support from "./pages/Support";
import Moderation from "./pages/Moderation";
import ProductFeedback from "./pages/ProductFeedback";

import "./style.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, sendDefaultPii: false });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(console.error));
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <NavBar />
    <Routes>
      <Route path="/" element={<Landing />} />
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
    </Routes>
  </BrowserRouter>
);
