import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setLoading(false);
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("*");
    const { data: votesData, error: votesError } = await supabase
      .from("votes")
      .select("*");

    if (pollsError || votesError) {
      console.error(pollsError || votesError);
      setLoading(false);
      return;
    }

    setPolls(pollsData || []);
    setVotes(votesData || []);
    setLoading(false);
  }

  if (loading) return <p className="p-6">Loading analytics…</p>;

  const totalVotes = votes.length;
  const today = new Date().toISOString().split("T")[0];
  const votesToday = votes.filter((v) => v.created_at?.startsWith(today)).length;
  const votesPerPoll = polls.map((poll) => {
    return votes.filter((v) => v.poll_id === poll.id).length;
  });
  const maxVotes = votesPerPoll.length > 0 ? Math.max(...votesPerPoll) : 0;
  const topPollIndex = votesPerPoll.indexOf(maxVotes);
  const topPoll = topPollIndex >= 0 ? polls[topPollIndex] : null;

  const timeline = {};
  votes.forEach((v) => {
    const hour = v.created_at?.substring(0, 13);
    if (!hour) return;
    timeline[hour] = (timeline[hour] || 0) + 1;
  });
  const timelineLabels = Object.keys(timeline).sort();
  const timelineCounts = timelineLabels.map((label) => timeline[label]);

  const barData = {
    labels: polls.map((p) => p.question),
    datasets: [
      {
        label: "Votes per Poll",
        data: votesPerPoll,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }
    ]
  };

  const lineData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Votes Over Time",
        data: timelineCounts,
        fill: false,
        borderColor: "rgba(255, 99, 132, 1)",
        tension: 0.2
      }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Analytics</h1>

      <div className="text-center mb-6">
        <p className="text-xl font-semibold">Total Votes: {totalVotes}</p>
        <p className="text-xl font-semibold">Votes Today: {votesToday}</p>
        <p className="text-lg mt-4 text-green-600">
          Top Poll: {topPoll?.question || "No polls yet"} ({maxVotes} votes)
        </p>
      </div>

      <div className="mt-10 bg-white p-4 rounded">
        <h2 className="text-2xl font-bold mb-4 text-black">Votes per Poll</h2>
        <Bar data={barData} />
      </div>

      <div className="mt-10 bg-white p-4 rounded">
        <h2 className="text-2xl font-bold mb-4 text-black">Votes Over Time</h2>
        <Line data={lineData} />
      </div>
    </div>
  );
}
