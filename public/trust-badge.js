(function () {
  var current = document.currentScript;
  var pollId = current.getAttribute("data-poll-id");
  var supabaseUrl = current.getAttribute("data-supabase-url");
  var supabaseAnonKey = current.getAttribute("data-supabase-anon-key");
  var origin = current.getAttribute("data-origin") || new URL(current.src).origin;
  if (!pollId || !supabaseUrl || !supabaseAnonKey) return;

  var link = document.createElement("a");
  link.href = origin;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  Object.assign(link.style, {
    display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "system-ui, sans-serif",
    background: "#0f172a", color: "#fff", borderRadius: "10px", padding: "10px 14px",
    textDecoration: "none", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
  });
  link.textContent = "Loading iVote score...";

  fetch(supabaseUrl + "/rest/v1/rpc/get_public_poll_trust_score", {
    method: "POST",
    headers: { apikey: supabaseAnonKey, Authorization: "Bearer " + supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ target_poll_id: Number(pollId) })
  })
    .then(function (response) { return response.json(); })
    .then(function (rows) {
      var row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.total_votes) {
        link.textContent = "\u2605 Powered by iVote";
        return;
      }
      link.textContent = "\u2605 " + Math.round(row.score) + "% Trust Score \u00b7 Powered by iVote (" + row.total_votes + " votes)";
    })
    .catch(function () { link.textContent = "\u2605 Powered by iVote"; });

  current.parentNode.insertBefore(link, current);
})();
