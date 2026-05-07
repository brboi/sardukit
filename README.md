# Sardukit

Personal finance tool for importing, categorizing, and reporting on bank transactions.

## Features

- Import bank transactions from CSV (BNP, Belfius, and custom formats)
- Auto-categorize transactions with rule-based matching
- AI-powered rule suggestions via Google Gemini (Gemma 4 31B)
- Generate financial reports with balance summaries by year

## Prerequisites

- Node.js 22
- Neon Postgres database
- Google OAuth credentials (for authentication)
- Google AI Studio API key (for Gemini/Gemma)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
JWT_SECRET=your-secret
GEMINI_API_KEY=...
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create the database schema by running `infra/init-db.sql` on your Neon database.

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Deploy

Deploy to Vercel with `vercel --prod`. Ensure all environment variables are set in the Vercel dashboard.
