import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { loadWorkspaceProfile } from "../lib/workspaceProfile";

export default function ProductFeedback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
      else setUser(data.user);
    });
  }, [navigate]);

  async function submitFeedback(event) {
    event.preventDefault();
    if (!user || !message.trim()) return;
    setStatus("Sending...");
    try {
      const workspace = await loadWorkspaceProfile();
      const { error } = await supabase.from("product_feedback").insert({
        user_id: user.id,
        workspace_id: workspace.id,
        message: message.trim()
      });
      if (error) throw error;
      setMessage("");
      setStatus("Thank you. Your feedback has been sent to the Godwit team.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to send feedback right now. Please try again.");
    }
  }

  if (!user) return null;
  return (
    <Layout>
      <main className="mx-auto max-w-xl p-2 sm:p-6">
        <h1 className="text-3xl font-bold">Share product feedback</h1>
        <p className="mt-2 text-slate-300">Tell us what worked, what was confusing, or what would make Godwit more useful for your venue.</p>
        <form onSubmit={submitFeedback} className="mt-6 space-y-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows="7"
            required
            className="w-full rounded border p-3 text-black"
            placeholder="Share your feedback"
          />
          <button type="submit" className="rounded bg-teal-400 px-4 py-3 font-semibold text-slate-950">Send feedback</button>
          {status && <output className="block text-sm text-slate-300">{status}</output>}
        </form>
      </main>
    </Layout>
  );
}