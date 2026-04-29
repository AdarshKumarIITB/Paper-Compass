# Deploying Paper Compass to Railway

Single Railway project hosts everything: FastAPI backend (which also serves the built Vite frontend at `/`), Postgres, and a serverless GROBID service. Estimated cost on Hobby plan: ~$5–7/month if GROBID is mostly idle.

## 0 · Prerequisites checklist

- [ ] Anthropic API key
- [ ] Google Cloud project (free) — for OAuth
- [ ] GitHub account — Railway deploys from a repo
- [ ] Railway account on Hobby plan ($5 credit)

## 1 · Initialize git and push to GitHub

The project is not a git repo yet. From the project root:

```bash
cd "/Users/adarshkumar/Documents/Projects/Research-Assistant"
git init
git add .
git commit -m "Initial commit — production-ready Paper Compass"
# create a private repo via gh, then push:
gh repo create paper-compass --private --source=. --push
```

Confirm `.gitignore` excludes `.env`, `node_modules`, `.venv`, `dist`, `storage/`. (Existing `.dockerignore` is for the build; you also want a `.gitignore`.)

## 2 · Set up Google OAuth (production)

The backend's redirect URI lives at `https://<your-backend-url>/api/auth/google/callback`. You need the Railway URL first — but Google Cloud lets you preconfigure with a placeholder you'll edit once Railway hands you a domain.

1. Open <https://console.cloud.google.com/apis/credentials>
2. Create or pick a project ("Paper Compass")
3. Configure OAuth consent screen (External, fill app name, support email — that's enough for unverified testing apps)
4. Create credentials → **OAuth client ID** → Web application
   - **Authorized JavaScript origins**: leave empty for now (we'll add the Railway URL after step 4)
   - **Authorized redirect URIs**: leave empty for now
5. Save the **Client ID** and **Client Secret** somewhere private — you'll paste them into Railway env vars.

You'll come back to this step in §6 once you have the Railway domain.

## 3 · Create the Railway project + Postgres

1. <https://railway.com/dashboard> → **+ New** → **Empty Project** → name it `paper-compass`
2. In the project, **+ Create** → **Database** → **Add PostgreSQL**. Railway provisions it with `DATABASE_URL` exposed as a variable.

## 4 · Deploy the backend service

1. **+ Create** → **GitHub Repo** → pick the `paper-compass` repo you pushed in §1.
2. Railway detects the `Dockerfile` at the repo root and builds it. Settings:
   - **Root Directory**: leave blank (Dockerfile is at root)
   - **Build Command**: leave default (Dockerfile-driven)
   - **Start Command**: leave blank (Dockerfile `CMD` runs `start.sh`)
3. Wait for the first build to finish. Click the service → **Settings** → **Networking** → **Generate Domain**. Railway gives you something like `paper-compass-production.up.railway.app`. Copy that URL.
4. Open the service → **Variables** and add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Click "Add Reference" → select Postgres → `DATABASE_URL` |
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` |
   | `JWT_SECRET` | run `python -c "import secrets; print(secrets.token_urlsafe(48))"` and paste output |
   | `SESSION_COOKIE_SECURE` | `true` |
   | `GOOGLE_CLIENT_ID` | from §2 |
   | `GOOGLE_CLIENT_SECRET` | from §2 |
   | `GOOGLE_REDIRECT_URI` | `https://<your-domain>/api/auth/google/callback` |
   | `FRONTEND_URL` | `https://<your-domain>` (same domain — frontend is served by FastAPI) |
   | `CORS_ORIGINS` | `https://<your-domain>` |
   | `SEMANTIC_SCHOLAR_API_KEY` | optional; leave blank for unauthenticated S2 (1 req/s limit) |
   | `GROBID_URL` | leave blank or `http://grobid.railway.internal:8070` (set after §5) |
   | `PDF_STORAGE_DIR` | `/data/pdfs` |
   | `SERVE_FRONTEND` | `true` |

5. Add a **persistent volume**: service → **Settings** → **Volumes** → **+ Add Volume** → mount path `/data`, name `pdfs`. (1 GB is plenty to start.)
6. Trigger a redeploy. The container will:
   - Run `alembic upgrade head` against the Postgres
   - Start uvicorn
   - Serve the React app at `/` and the API at `/api/*`

   The healthcheck at `/healthz` should turn green.

7. **Verify**: open `https://<your-domain>/healthz` → should return `{"status":"ok"}`. Open `https://<your-domain>/` → React app loads.

## 5 · Add GROBID with scale-to-zero

This is the cost-sensitive part — keep GROBID asleep when idle.

1. Project → **+ Create** → **Empty Service** → name it `grobid`
2. Service → **Settings** → **Source** → **Image** → `lfoppiano/grobid:0.8.1-crf` (CRF model, ~1 GB RAM idle, vs ~6 GB for the full deep-learning image)
3. Service → **Settings** → **Networking** → **Private Networking** is on by default. Note the internal URL: `grobid.railway.internal:8070`. Don't expose a public domain.
4. Service → **Settings** → **App Sleeping** (or "Serverless" depending on UI version) → **enable**, set "sleep after inactivity" to ~5 min.
5. Resources → set the limit to 1 GB RAM, 1 vCPU.

   > ⚠️ Cold start: when the backend hits GROBID after idle, GROBID takes ~10–20s to wake. The PDF upload UX should show a progress indicator.

6. Back on the **backend service**, set `GROBID_URL=http://grobid.railway.internal:8070` and redeploy.

## 6 · Wire OAuth back to the live URL

Now that you have the domain from §4:

1. Return to <https://console.cloud.google.com/apis/credentials> → your OAuth client
2. **Authorized JavaScript origins**: add `https://<your-domain>`
3. **Authorized redirect URIs**: add `https://<your-domain>/api/auth/google/callback`
4. Save. Changes can take a minute to propagate.

Confirm `GOOGLE_REDIRECT_URI` in Railway env exactly matches the redirect URI you added (trailing slashes / casing matter).

## 7 · End-to-end verification

- [ ] `https://<domain>/healthz` returns `{"status":"ok"}`
- [ ] `https://<domain>/` renders the React app
- [ ] Sign in with Google → redirects to `/home`
- [ ] Search a paper from /discover → results render (S2 hits)
- [ ] Click into a paper → /paper/:id/evaluate works
- [ ] Open Comprehend page → Copilot chips render → click "main claim" → response appears
- [ ] Click chip 3 ("read next") → recommendations render with real S2 papers
- [ ] PDF upload (after §5) → kicks off ingestion (cold-start delay first time)
- [ ] Library page populates after a few interactions

## 8 · Keeping the bill down

- **Postgres** sleep when idle is not safe (data layer should always be reachable). It's small (~250 MB RAM) so leave it on. ~$1.80/mo.
- **GROBID** must be asleep most of the time. If you forget to enable App Sleeping, you'll burn $30+/mo on it alone.
- **Backend**: don't enable App Sleeping unless you're OK with ~3–5s cold start on first request. For a single-user prod, App Sleeping ON is fine and cuts the bill in half.
- Set a **usage cap** in Railway settings: account-level "Set limits" → cap at $5 to stop hard if anything misbehaves.

## 9 · Post-deploy follow-ups

- Add a real `.gitignore` if you haven't already (`.env`, `node_modules`, `dist`, `.venv`, `__pycache__`, `storage/`).
- Add basic monitoring: Railway has built-in metrics; for alerts, hook up a Slack/Discord webhook in project settings.
- When you're confident in the deploy, take Google OAuth out of "Testing" mode in the consent screen so non-allowlisted users can sign in.

---

### Rollback

If a deploy breaks prod:

1. Railway service → **Deployments** → find the last green deploy → **Redeploy**.
2. If migrations broke the DB, restore from a Railway backup snapshot (Postgres plugin → **Backups**).

### Common gotchas

- **`Mixed Content` errors in console**: confirm the frontend isn't hardcoding `http://`. The Vite build defaults to `/api` (relative), so this should never happen with the bundled config — but custom env overrides can break it.
- **Cookies not sticking after Google login**: confirm `SESSION_COOKIE_SECURE=true` and the domain in `FRONTEND_URL` matches exactly.
- **`alembic.upgrade.head` fails on first deploy**: it's almost always because `DATABASE_URL` isn't set / wasn't referenced as a Railway variable. Check the deploy logs.
- **GROBID cold-start times out**: bump backend's GROBID HTTP client timeout to ≥30s.
