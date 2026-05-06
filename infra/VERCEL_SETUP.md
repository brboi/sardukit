# Vercel Setup Instructions

## 1. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables (or via `vercel env add`).

**Important:** `GOOGLE_CLIENT_ID` appears twice — once for the backend (API) and once prefixed with `VITE_` for the frontend (Vite exposes only `VITE_*` vars to the browser).

| Variable | Scope | Description | Example |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth Client ID (exposed to browser) | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | Backend | Same Client ID, used by API to verify tokens | `123-abc.apps.googleusercontent.com` |
| `DATABASE_URL` | Backend | Neon Postgres connection string | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db` |
| `JWT_SECRET` | Backend | Secret for JWT signing | `openssl rand -hex 32` |
| `ALLOWED_EMAILS` | Backend | Comma-separated whitelisted emails | `user@gmail.com,admin@gmail.com` |
| `GEMINI_API_KEY` | Backend | Google Gemini API key (optional) | `AIzaSy...` |

## 2. Vercel CLI

```bash
# Frontend
vercel env add VITE_GOOGLE_CLIENT_ID production
vercel env add VITE_GOOGLE_CLIENT_ID preview

# Backend
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_ID preview
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add ALLOWED_EMAILS production
vercel env add GEMINI_API_KEY production
```

## 3. Database Setup

Run `infra/init-db.sql` against your Neon Postgres database:

```bash
psql "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db" -f infra/init-db.sql
```

Creates 4 tables: `transactions`, `settings`, `reports`, `report_transactions`.

## 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create an **OAuth 2.0 Client ID** (type: Web application)
3. Add your Vercel domains to **Authorized JavaScript origins**:
   - `https://your-project.vercel.app`
   - `http://localhost:5173` (for local dev)
4. Copy the Client ID and set both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` in Vercel env vars
