# AI Poster Images

The QR poster image generator uses OpenAI and is available to signed-in administrators.

## Configure Vercel

1. Create an OpenAI API key with access to image generation.
2. **Complete OpenAI organization verification.** The `gpt-image-1` model (used here) requires
   the OpenAI organization owning the API key to be verified - a one-time manual step at
   [platform.openai.com](https://platform.openai.com) under **Settings -> Organization ->
   General -> Verify Organization**. Without this, every request fails with an error whose
   message contains "organization" and "verify" (surfaced directly in the Admin UI as of this
   note, instead of a generic failure).
3. In the Vercel project, open **Settings** then **Environment Variables**.
4. Add `OPENAI_API_KEY` with that key for the Production environment, and Preview if needed.
5. Confirm the project also has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the serverless function uses them to verify the signed-in user.
6. Redeploy after saving the variables.

Do not create an environment variable named `VITE_OPENAI_API_KEY`. Variables with the `VITE_` prefix are published to the browser.

## Troubleshooting

- **"AI image generation is not configured yet."** - `OPENAI_API_KEY` is missing in Vercel.
- **"Your OpenAI organization needs to complete verification..."** - the API key is valid but
  the org hasn't completed the verification step above.
- **Any other message** - `api/generate-qr-poster.js` now passes through OpenAI's own error
  message, which usually names the exact problem (billing/quota, unsupported prompt, etc.). If
  it's still unclear, check the Vercel function logs for `/api/generate-qr-poster`, which log
  the full OpenAI error payload.

## Use

Open **Admin**, select **Open QR tools** on a poll, choose a print format, choose a visual style, enter an image description, and select **Generate image**. The result is placed behind the QR code and used by **Print QR**. Available formats include Letter, A3, A4, A5, A6, postcard, round beer holder, and ticket. The workspace logo is overlaid separately so it stays sharp and does not interfere with QR scanning. Generated images are only kept in the current browser session; they are not saved to the poll yet.