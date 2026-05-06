# Vercel Setup Instructions

## 1. Environment Variables (set in Vercel Dashboard → Settings → Environment Variables)

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123-abc.apps.googleusercontent.com` |
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db` |
| `JWT_SECRET` | Secret for JWT signing | `openssl rand -hex 32` |
| `ALLOWED_EMAILS` | Comma-separated whitelisted emails | `user@gmail.com,admin@gmail.com` |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | `AIzaSy...` |

## 2. Vercel CLI alternative

```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add ALLOWED_EMAILS production
vercel env add GEMINI_API_KEY production

# Repeat for preview and development environments
```

## 3. Database Setup

Run `infra/init-db.sql` against your Neon Postgres database to create the 4 tables:
- `transactions`
- `settings`
- `reports`
- `report_transactions`

```bash
psql "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db" -f infra/init-db.sql
```

## 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add your Vercel domain to **Authorized JavaScript origins**
4. Copy the Client ID to `GOOGLE_CLIENT_ID` env var
