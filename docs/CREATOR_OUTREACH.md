# Creator outreach email lookup

Business email lookup first checks the website listed by Google Places. If that site has no public email, is unavailable, or is missing, the server can search public Google results through SerpApi.

Set `SERPAPI_API_KEY` as a server-only Vercel environment variable, then redeploy. Do not use a `VITE_` prefix. The research flow and **Search official site** action will use the search fallback when the key is configured. Search requests may incur SerpApi usage charges.

The agent only stores an email explicitly present in a relevant search result; it does not construct or guess addresses. Without the key, website-only lookup continues and the UI reports that public web search is not configured.

Existing outreach drafts are not reprocessed automatically when the key is added. In the Creator queue, use **Search next 5 blank emails** to backfill existing records in small batches. Newly researched locations are checked automatically.

Generated email subjects are concise and can be edited and saved on each draft. **Clear unsent research** removes the current draft queue while preserving sent messages and rejected locations, so a fresh research run can create new drafts without losing duplicate-prevention history.
