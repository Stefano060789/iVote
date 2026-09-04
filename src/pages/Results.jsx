import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function Results() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);
  const [votesToday, setVotesToday] = useState(0);

  useEffect(() => {
    async function loadPoll() {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setPoll(data);
    }

    async function fetchVotes() {
      const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("poll_id", pollId);

      if (error) {
        console.error(error);
        return;
      }

      setVotes(data);
      const total = data.length;
      const today = new Date().toISOString().split("T")[0];
      const todayVotes = data.filter((v) => v.created_at?.startsWith(today)).length;
      setTotalVotes(total);
      setVotesToday(todayVotes);
      setLoading(false);
    }

    loadPoll();
    fetchVotes();

    const interval = setInterval(() => {
      fetchVotes();
    }, 2000);

    return () => clearInterval(interval);
  }, [pollId]);

  if (loading) return <Layout><p className="text-center p-6">Loading results…</p></Layout>;
  if (!poll) return <Layout><p className="text-center p-6">Poll not found.</p></Layout>;
  if (!Array.isArray(poll.answers)) {
    return <Layout><p className="text-center p-6">Error: Poll answers are invalid.</p></Layout>;
  }

  const voteCounts = poll.answers.map((answer) => {
    return votes.filter((v) => v.answer === answer).length;
  });
  const percentageTotalVotes = voteCounts.reduce((a, b) => a + b, 0);
  const percentages = voteCounts.map((count) =>
    percentageTotalVotes === 0 ? 0 : Number(((count / percentageTotalVotes) * 100).toFixed(1))
  );
  const maxVotes = voteCounts.length > 0 ? Math.max(...voteCounts) : 0;
  const topAnswerIndex = voteCounts.indexOf(maxVotes);
  const topAnswer = topAnswerIndex >= 0 ? poll.answers[topAnswerIndex] : "N/A";
  const topPercentage = topAnswerIndex >= 0 ? percentages[topAnswerIndex] : 0;
  const barColors = voteCounts.map((_count, i) =>
    i === topAnswerIndex ? "rgba(75, 192, 192, 0.8)" : "rgba(54, 162, 235, 0.6)"
  );
  const borderColors = barColors.map((c) => c.replace("0.6", "1").replace("0.8", "1"));

  const timeline = {};
  votes.forEach((v) => {
    const minute = v.created_at?.substring(0, 16);
    if (!minute) return;
    timeline[minute] = (timeline[minute] || 0) + 1;
  });
  const timelineLabels = Object.keys(timeline).sort();
  const timelineCounts = timelineLabels.map((label) => timeline[label]);

  const chartData = {
    labels: poll.answers.map((a, i) => `${a} (${percentages[i]}%)`),
    datasets: [
      {
        label: "Votes",
        data: voteCounts,
        backgroundColor: barColors,
        borderColor: borderColors,
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

  function exportSummaryCsv() {
    const rows = [
      ["poll_id", String(poll.id)],
      ["question", poll.question ?? ""],
      ["total_votes", String(totalVotes)],
      [],
      ["answer", "votes", "percentage"]
    ];

    poll.answers.forEach((answer, index) => {
      rows.push([answer, String(voteCounts[index]), `${percentages[index]}%`]);
    });

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `poll-${poll.id}-summary.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">{poll.question}</h1>

        <div className="flex gap-3 mt-6 mb-6 justify-center">
          <button
            onClick={exportSummaryCsv}
            className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold"
          >
            Export Summary CSV
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(poll.short_url || window.location.href);
              alert("Results link copied!");
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
          >
            Share Results
          </button>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">Live Results</h3>
          <p className="text-gray-600">
            Total votes: <span className="font-semibold">{totalVotes}</span>
          </p>
          <p className="text-gray-600">
            Votes today: <span className="font-semibold">{votesToday}</span>
          </p>
        </div>

        <div className="mt-6 mb-8 bg-white p-4 rounded">
          <div className="text-center mt-2 mb-4">
            <h3 className="text-xl font-bold text-green-600">
              Top answer: {topAnswer} ({topPercentage}%)
            </h3>
          </div>
          <Bar data={chartData} />
        </div>

        <div className="mt-10 mb-8 bg-white p-4 rounded">
          <Line data={lineData} />
        </div>

        <div className="space-y-4">
          {poll.answers.map((answer, index) => {
            const count = voteCounts[index];
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            return (
              <div key={index} className="border p-4 rounded">
                <div className="flex justify-between font-semibold">
                  <span>{answer}</span>
                  <span>{count} votes</span>
                </div>

                <div className="w-full bg-gray-200 h-3 rounded mt-2">
                  <div
                    className="bg-blue-600 h-3 rounded"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <p className="text-right text-sm text-gray-600 mt-1">
                  {percent}%
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a href="/admin" className="text-blue-600 underline">Back to Admin</a>
        </div>
      </div>
    </Layout>
  );
}
