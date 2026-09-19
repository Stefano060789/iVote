import { useState } from "react";
import Layout from "../components/Layout";

export default function Support() {
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorText, setErrorText] = useState("");

  async function submitMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setErrorText("");
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact", message: message.trim(), replyEmail: replyEmail.trim() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to send your message right now.");
      if (payload.sent === false) throw new Error("Support isn't configured to receive messages yet - please try again later.");
      setStatus("sent");
      setMessage("");
      setReplyEmail("");
    } catch (error) {
      setStatus("error");
      setErrorText(error.message);
    }
  }

  return (
    <Layout theme="workspace">
      <div className="mx-auto max-w-xl space-y-4 p-2 sm:p-6">
        <h1 className="text-3xl font-bold">Support</h1>
        <p>
          For account, billing, accessibility, privacy, or moderation help, send a message below and
          we'll get back to you. You can also email{" "}
          <a className="text-blue-300 underline" href="mailto:contact@hellogodwit.com">
            contact@hellogodwit.com
          </a>
          .
        </p>

        {status === "sent" ? (
          <div className="rounded border border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
            Thanks - your message has been sent. If you left a reply email, we'll get back to you there.
          </div>
        ) : (
          <form onSubmit={submitMessage} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Your message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                maxLength={4000}
                rows="6"
                className="w-full rounded border p-2 text-black"
                placeholder="What do you need help with?"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Your email (optional, so we can reply)</span>
              <input
                type="email"
                value={replyEmail}
                onChange={(event) => setReplyEmail(event.target.value)}
                className="w-full rounded border p-2 text-black"
                placeholder="you@example.com"
              />
            </label>
            {status === "error" && <p className="text-sm text-red-600">{errorText}</p>}
            <button
              type="submit"
              disabled={status === "sending" || !message.trim()}
              className="rounded bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
