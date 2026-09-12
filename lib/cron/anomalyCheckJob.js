import { supabaseGet, supabasePost } from "./cronHelpers.js";

const DROP_THRESHOLD = 0.4;
const MINIMUM_PRIOR_VOTES = 5;

export async function runAnomalyCheck() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

  const recentVotes = await supabaseGet(`votes?select=poll_id,workspace_id,created_at&created_at=gte.${encodeURIComponent(twoWeeksAgo)}`);

  const tally = {};
  for (const vote of recentVotes) {
    if (!vote.poll_id || !vote.workspace_id) continue;
    const key = vote.poll_id;
    tally[key] = tally[key] || { workspaceId: vote.workspace_id, thisWeek: 0, lastWeek: 0 };
    if (vote.created_at >= oneWeekAgo) tally[key].thisWeek += 1;
    else tally[key].lastWeek += 1;
  }

  let created = 0;
  for (const [pollId, counts] of Object.entries(tally)) {
    if (counts.lastWeek < MINIMUM_PRIOR_VOTES) continue;
    const dropRatio = (counts.lastWeek - counts.thisWeek) / counts.lastWeek;
    if (dropRatio < DROP_THRESHOLD) continue;

    const existing = await supabaseGet(
      `feedback_alerts?select=id&poll_id=eq.${pollId}&answer=ilike.Vote%20volume%20dropped*&created_at=gte.${encodeURIComponent(threeDaysAgo)}`
    );
    if (existing.length > 0) continue;

    const percent = Math.round(dropRatio * 100);
    await supabasePost("feedback_alerts", {
      workspace_id: counts.workspaceId,
      poll_id: Number(pollId),
      rule_id: null,
      vote_id: null,
      answer: `Vote volume dropped ${percent}% this week (${counts.thisWeek} vs ${counts.lastWeek}).`,
      status: "open"
    });
    created += 1;
  }

  return { checked: Object.keys(tally).length, created };
}
