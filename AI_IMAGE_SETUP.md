# AI Poster Images

The QR poster image generator uses OpenAI and is available to signed-in administrators.

## Configure Vercel

1. Create an OpenAI API key with access to image generation.
2. In the Vercel project, open **Settings** then **Environment Variables**.
3. Add `OPENAI_API_KEY` with that key for the Production environment, and Preview if needed.
4. Confirm the project also has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the serverless function uses them to verify the signed-in user.
5. Redeploy after saving the variables.

Do not create an environment variable named `VITE_OPENAI_API_KEY`. Variables with the `VITE_` prefix are published to the browser.

## Use

Open **Admin**, select **Show QR Code** on a poll, enter an image description, and select **Generate image**. The result is placed behind the QR code and used by **Print QR**. Generated images are only kept in the current browser session; they are not saved to the poll yet.