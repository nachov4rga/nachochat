# Nacho News Chatbot

Nacho is a navy-themed chatbot that combines live current-news coverage with general-question and math support.

## What it does

- Aggregates current stories from BBC, CNN, Al Jazeera, NPR, The Guardian, CBS News, and Sky News.
- Shows a live headline dashboard with source links.
- Accepts natural-language questions through a chat interface.
- Supports Enter-to-send in the chat box, with `Shift+Enter` for a new line.
- Uses OpenAI for general questions and richer reasoning when `OPENAI_API_KEY` is configured.
- Solves arithmetic-style math locally even without an API key.
- Falls back to a source-grounded news digest mode when no AI key is present.

## Important note about "training"

This app is **not** training a custom model on those news websites. Instead, it uses a more practical current-news pattern:

1. Pull fresh articles from reliable feeds at request time.
2. Rank the most relevant articles for the user's question.
3. Ask the AI to answer using those live source packets.

That makes it much better for current events than a traditionally trained static bot, because the news context stays fresh.

For non-news questions:

1. Arithmetic-style math is handled locally.
2. Broader general questions use OpenAI when `OPENAI_API_KEY` is configured.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key to `.env` if you want full AI reasoning.
3. Start the app:

```powershell
node server.js
```

4. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Environment variables

- `OPENAI_API_KEY`: enables OpenAI-backed chatbot answers.
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`.
- `PORT`: optional, defaults to `3000`.

## Project structure

- `server.js`: RSS aggregation, chat API, and static file server.
- `public/index.html`: landing page and chatbot layout.
- `public/styles.css`: navy visual theme and responsive styling.
- `public/app.js`: client-side feed loading and chat interactions.

## Suggested next upgrades

- Add article-page extraction for deeper answers than RSS summaries alone.
- Persist chat history.
- Add source filters by region or topic.
- Add deployment configuration for Vercel, Render, or Railway.
