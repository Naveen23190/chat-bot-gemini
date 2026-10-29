# GeminiChat — Developed By Naveen

A polished, responsive React AI chat interface powered by Google's Gemini API through a Vercel serverless function. The API key stays on the server.

## Features
- React + Vite single-page app
- Gemini API requests through `/api/chat`
- Responsive sidebar, recent chat history, prompt cards, quick actions
- Multi-turn conversation context
- Local chat persistence, delete conversation, copy response
- Loading indicator, API error feedback, dark mode
- Mobile-friendly navigation and reduced-motion support
- “Developed By Naveen” branding

## Important model note
The API model ID is configured with `GEMINI_MODEL` in the server environment. The starter default is `gemini-3.8-flash` to match the requested model name, but **model IDs can change and availability depends on your Google AI Studio API key**. If that exact ID is not available, choose an enabled model ID from Google AI Studio and set it as `GEMINI_MODEL` in Vercel. The API response will show a model error hint for unavailable IDs.

## Run locally
Requirements: Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Vite serves the UI, but the `/api/chat` serverless function is a Vercel runtime function and does not run under plain `vite dev`. For a local full-stack test, install Vercel CLI and use:

```bash
npm install -g vercel
vercel dev
```

Create a local `.env` file (do not commit it):
```env
GEMINI_API_KEY=your_key_from_google_ai_studio
GEMINI_MODEL=your_available_gemini_model_id
```

## Deploy to Vercel
1. Push this repository to GitHub.
2. In Vercel, select **Add New → Project** and import the repository.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Google AI Studio API key
   - `GEMINI_MODEL` = the exact model ID enabled for your API key
5. Apply variables to Production and Preview as desired, then redeploy.
6. Open the deployed URL and test a short prompt.

## Security
- Never put the Gemini API key in `VITE_GEMINI_API_KEY` or frontend JavaScript.
- Never commit `.env`.
- This demo has no user authentication or per-user rate limiting. Add rate limiting and abuse controls before exposing it to significant public traffic.
- The chat history is stored in the visitor's browser localStorage; it is not synced across devices.
- Checkout/payment is not applicable; no payment information is collected.

## Troubleshooting
- `GEMINI_API_KEY` missing: add it to Vercel Environment Variables and redeploy.
- Model not found / 404: update `GEMINI_MODEL` to an available ID in Google AI Studio.
- 429: API quota or rate limit; check usage and try later.
- `npm run dev` displays UI but chat API fails: use `vercel dev` locally or test the deployed Vercel URL.
- Deep route refresh: `vercel.json` rewrites non-API paths to `index.html`.

## Stack
HTML5, CSS3, JavaScript, React, Vite, Lucide React, Gemini REST API, Vercel Functions.
