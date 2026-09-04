import { useEffect, useMemo, useState } from "react";
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
import { readPollMeta } from "../lib/pollMeta";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

function getPollStatusInfo(poll) {
  const meta = readPollMeta(poll.id);
  const startsAt = poll.starts_at ?? meta.starts_at;
  const endsAt = poll.expires_at ?? meta.ends_at;

  if (poll.status === "closed" || meta.status === "closed" || poll.closed_at || meta.closed_at) {
    return "closed";
  }

  if (startsAt && new Date(startsAt) > new Date()) {
    return "scheduled";
  }

  if (endsAt && new Date(endsAt) < new Date()) {
    return "expired";
  }

  return "active";
}

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

    const { data: pollsData, error: pollsError } = await supabase.from("polls").select("*");
    const { data: votesData, error: votesError } = await supabase.from("votes").select("*");

    if (pollsError || votesError) {
      console.error(pollsError || votesError);
      setLoading(false);
      return;
    }

    setPolls((pollsData ?? []).filter((poll) => Boolean(poll?.id)));
    setVotes(votesData || []);
    setLoading(false);
  }

  const analytics = useMemo(() => {
    const votesByPoll = {};
    votes.forEach((vote) => {
      const key = String(vote.poll_id);
      votesByPoll[key] = (votesByPoll[key] || 0) + 1;
    });

    const statuses = { active: 0, scheduled: 0, expired: 0, closed: 0 };
    const locationMap = {};
    const brandMap = {};
    let withLocation = 0;
    let withBrand = 0;

    const pollRows = polls.map((poll) => {
      const meta = readPollMeta(poll.id);
      const status = getPollStatusInfo(poll);
      statuses[status] += 1;
      const locationName = poll.location_name ?? meta.location_name ?? "";
      const brandName = poll.brand_name ?? meta.brand_name ?? "";
      const templateKey = poll.template_key ?? meta.template_key ?? "custom";
      const voteCount = votesByPoll[String(poll.id)] || 0;

      if (locationName) {
        withLocation += 1;
        locationMap[locationName] = (locationMap[locationName] || 0) + voteCount;
      }
      if (brandName) {
        withBrand += 1;
        brandMap[brandName] = (brandMap[brandName] || 0) + voteCount;
      }

      return {
        id: poll.id,
        question: poll.question ?? "",
        status,
        locationName,
        brandName,
        templateKey,
        voteCount
      };
    });

    const sortedPollRows = [...pollRows].sort((a, b) => b.voteCount - a.voteCount);
    const avgVotesPerPoll = polls.length > 0 ? Number((votes.length / polls.length).toFixed(2)) : 0;
    const topLocation = Object.entries(locationMap).sort((a, b) => b[1] - a[1])[0] ?? null;
    const topBrand = Object.entries(brandMap).sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      statuses,
      withLocation,
      withBrand,
      avgVotesPerPoll,
      topLocation,
      topBrand,
      pollRows,
      sortedPollRows,
      votesByPoll
    };
  }, [polls, votes]);

  function exportAnalyticsCsv() {
    const rows = [
      ["metric", "value"],
      ["total_polls", String(polls.length)],
      ["total_votes", String(votes.length)],
      ["active_polls", String(analytics.statuses.active)],
      ["scheduled_polls", String(analytics.statuses.scheduled)],
      ["expired_polls", String(analytics.statuses.expired)],
      ["closed_polls", String(analytics.statuses.closed)],
      ["polls_with_location", String(analytics.withLocation)],
      ["polls_with_brand", String(analytics.withBrand)],
      ["average_votes_per_poll", String(analytics.avgVotesPerPoll)],
      [],
      ["poll_id", "question", "status", "template", "location", "brand", "votes"]
    ];

    analytics.pollRows.forEach((row) => {
      rows.push([
        String(row.id),
        row.question,
        row.status,
        row.templateKey,
        row.locationName,
        row.brandName,
        String(row.voteCount)
      ]);
    });

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-analytics-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="p-6">Loading analytics…</p>;

  const votesPerPoll = polls.map((poll) => analytics.votesByPoll[String(poll.id)] || 0);
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

  const timelineByHour = {};
  votes.forEach((vote) => {
    const hour = vote.created_at?.substring(0, 13);
    if (!hour) return;
    timelineByHour[hour] = (timelineByHour[hour] || 0) + 1;
  });
  const timelineLabels = Object.keys(timelineByHour).sort();
  const timelineCounts = timelineLabels.map((label) => timelineByHour[label]);
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

  const locationLabels = analytics.pollRows
    .map((row) => row.locationName)
    .filter((value, index, self) => value && self.indexOf(value) === index);
  const locationData = {
    labels: locationLabels,
    datasets: [
      {
        label: "Votes by Location",
        data: locationLabels.map((label) =>
          analytics.pollRows
            .filter((row) => row.locationName === label)
            .reduce((sum, row) => sum + row.voteCount, 0)
        ),
        backgroundColor: "rgba(16, 185, 129, 0.65)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Analytics</h1>

      <div className="text-center mb-6">
        <button
          onClick={exportAnalyticsCsv}
          className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold"
        >
          Export Analytics CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Total polls</p>
          <p className="text-2xl font-bold">{polls.length}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Total votes</p>
          <p className="text-2xl font-bold">{votes.length}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Avg votes/poll</p>
          <p className="text-2xl font-bold">{analytics.avgVotesPerPoll}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Polls with brand</p>
          <p className="text-2xl font-bold">{analytics.withBrand}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{analytics.statuses.active}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Scheduled</p>
          <p className="text-2xl font-bold text-yellow-400">{analytics.statuses.scheduled}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Expired</p>
          <p className="text-2xl font-bold text-orange-400">{analytics.statuses.expired}</p>
        </div>
        <div className="border rounded p-3 bg-gray-900">
          <p className="text-gray-400 text-sm">Closed</p>
          <p className="text-2xl font-bold text-red-400">{analytics.statuses.closed}</p>
        </div>
      </div>

      <div className="mb-6 text-sm text-gray-300">
        <p>Top location: {analytics.topLocation ? `${analytics.topLocation[0]} (${analytics.topLocation[1]} votes)` : "N/A"}</p>
        <p>Top brand: {analytics.topBrand ? `${analytics.topBrand[0]} (${analytics.topBrand[1]} votes)` : "N/A"}</p>
      </div>

      <div className="mt-6 bg-white p-4 rounded">
        <h2 className="text-2xl font-bold mb-4 text-black">Votes per Poll</h2>
        <Bar data={barData} />
      </div>

      <div className="mt-10 bg-white p-4 rounded">
        <h2 className="text-2xl font-bold mb-4 text-black">Votes Over Time</h2>
        <Line data={lineData} />
      </div>

      {locationLabels.length > 0 && (
        <div className="mt-10 bg-white p-4 rounded">
          <h2 className="text-2xl font-bold mb-4 text-black">Votes by Location</h2>
          <Bar data={locationData} />
        </div>
      )}

      <div className="mt-10 border rounded p-4 bg-gray-900">
        <h2 className="text-xl font-bold mb-3">Top Polls</h2>
        <div className="space-y-2 text-sm">
          {analytics.sortedPollRows.slice(0, 10).map((row) => (
            <div key={row.id} className="flex justify-between border-b border-gray-700 pb-2">
              <div>
                <p className="font-semibold">{row.question}</p>
                <p className="text-gray-400">
                  {row.status} • {row.templateKey} {row.locationName ? `• ${row.locationName}` : ""}
                </p>
              </div>
              <p className="font-bold">{row.voteCount} votes</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
