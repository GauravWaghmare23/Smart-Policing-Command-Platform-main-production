# Smart Police Station — Production Deployment Guide

| Component | Where it runs | Source folder |
|---|---|---|
| Backend API (Express + Socket.IO) | Render **Web Service** (Docker) | `server/` |
| Web app (React + Vite) | Render **Static Site** | `client/` |
| Database | MongoDB **Atlas** | — |
| Cache / geo | **Redis Cloud** | — |
| Message queue | **CloudAMQP** (RabbitMQ) | — |
| Mobile app (Expo SDK 54) | **EAS Build** | `client-mobile/` |

> The mobile folder in this repo is `client-mobile/` (its `package.json` name is `client-mobile-sdk54`).

Nothing in this repo contains secrets. All real values are entered **only** in the Render / EAS dashboards or in git-ignored local `.env` files.

---

## Step 0 — Secret hygiene (do this first)

1. **Rotate the Google Maps key that was committed** in `client-mobile/app.json` and `client-mobile/src/config/api.js` in earlier commits. Removing it from the current files does not remove it from Git history.
   - Google Cloud Console → APIs & Services → Credentials → create a **new** key, delete/disable the old one.
   - New Android key: restrict to **Maps SDK for Android**, package `com.smartpolice.citizen`, and your EAS SHA-1 (Step 10).
   - Web key (`VITE_GOOGLE_MAPS_API_KEY`): restrict to **Maps JavaScript API** and to your frontend's HTTP referrer.
2. Never commit `.env`. The `.gitignore` files now block `.env` and `.env.*` (only `*.example` is allowed).
3. Generate the two JWT secrets (run twice, use a different output for each):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

---

## Step 1 — MongoDB Atlas

1. Create a cluster (M0 free is fine to start) → **Database Access** → add a database user with a strong password (use letters/digits; if the password has special characters, URL-encode them).
2. **Network Access** → add an IP entry. Render free/starter web services do **not** have a fixed outbound IP, so use `0.0.0.0/0` (allow from anywhere) and rely on the strong DB password. (If you later use a Render plan with static outbound IPs, restrict to those.)
3. **Connect → Drivers** → copy the `mongodb+srv://...` string and add the database name:

   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart-police-station?retryWrites=true&w=majority
   ```

   This is your `MONGODB_URI`.

## Step 2 — Redis Cloud

1. Create a database (free 30 MB plan is enough).
2. From the database page copy the **public endpoint** (`host:port`) and default-user password.
3. Build `REDIS_URL`:
   - Non-TLS (default on the free plan): `redis://default:<password>@<host>:<port>`
   - If you enabled TLS: `rediss://default:<password>@<host>:<port>`

## Step 3 — CloudAMQP (RabbitMQ)

1. Create an instance (Little Lemur free plan), same region as your Render service if possible.
2. Copy the **AMQP URL** from the instance details: `amqps://<user>:<password>@<host>/<vhost>`. This is `RABBITMQ_URL`.

---

## Step 4 — Test locally before deploying

### 4a. Create `server/.env` (git-ignored)

```bash
cd server
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `MONGODB_URI` (Atlas), `REDIS_URL`, `RABBITMQ_URL`, both JWT secrets. Leave `NODE_ENV=development`.

### 4b. Verify the three cloud connections (read-only, prints no credentials)

```bash
cd server
npm ci
npm run check:connections
```

Expected: `PASS` for MongoDB, Redis and RabbitMQ. A `FAIL` line tells you which service and why.

### 4c. Backend without Docker

```bash
cd server
npm run dev          # nodemon, development
# or production-style:
npm start
```

```bash
curl http://localhost:4000/health
# {"status":"ok","services":{"mongodb":"connected","redis":"connected","rabbitmq":"connected"}}
```

(`redis`/`rabbitmq` show `fallback` if those services are unreachable — the app still works.)

### 4d. Backend Docker image

```bash
cd server
docker build -t smart-police-api .

# Run with your env file (the file is read by Docker at runtime; it is NOT inside the image):
docker run --rm -p 4000:4000 --env-file .env -e NODE_ENV=development smart-police-api

curl http://localhost:4000/health
```

Confirm no secrets were baked into the image:

```bash
docker run --rm --entrypoint sh smart-police-api -c "ls -a /app | grep -i env || echo 'no env files in image'"
```

Expected output: `.env.example` is excluded too, so you should see `no env files in image`.

### 4e. Docker Compose (backend + Redis + RabbitMQ)

```bash
# from the repo root; server/.env must contain MONGODB_URI (Atlas) and the JWT secrets
docker compose up --build
```

- Backend: http://localhost:4000/health
- RabbitMQ management UI: http://localhost:15672 (login `guest` / `guest`, local only)
- Inside Compose the backend automatically uses `redis://redis:6379` and `amqp://rabbitmq:5672`.
- Optional queue consumer (SOS SMS etc.): `docker compose --profile worker up --build`
- Stop: `Ctrl+C`, then `docker compose down` (add `-v` only if you want to delete the local Redis/RabbitMQ/uploads volumes).

### 4f. Frontend production build + preview

```bash
cd client
npm ci
# bash:
VITE_API_URL=http://localhost:4000/api npm run build
# PowerShell:
#   $env:VITE_API_URL="http://localhost:4000/api"; npm run build
npm run preview        # http://localhost:4173
```

Note: `http://localhost:4173` is not in the backend's dev CORS list. For a preview test add `CLIENT_URL=http://localhost:4173` to `server/.env`.

---

## Step 5 — Push to GitHub

```bash
git status                     # confirm NO .env files are listed
git add -A
git commit -m "Prepare for production deployment"
git push
```

Double-check with `git ls-files | grep -i "\.env"` — only `.env.example` files may appear.

---

## Step 6 — Deploy the backend on Render (Web Service, Docker)

**Option A – Blueprint:** Render Dashboard → **New → Blueprint** → select the repo → Render reads `render.yaml` and prompts you for every `sync: false` variable.

**Option B – manual:** Dashboard → **New → Web Service** → connect the repo:

| Setting | Value |
|---|---|
| Name | `smart-police-api` |
| Language / Runtime | **Docker** |
| Branch | `main` |
| Root Directory | `server` |
| Dockerfile Path | `./Dockerfile` (relative to the Root Directory) |
| Docker Build Context | `.` (relative to the Root Directory) |
| Instance type | Free for a trial; **Starter or higher for real use** (free instances sleep after ~15 min idle and drop WebSocket connections) |
| Health Check Path | `/health` |
| Auto-Deploy | Yes |
| Docker Command | leave empty (image `CMD` runs `node src/server.js`) |

If the build log says it cannot find the Dockerfile, check that Root Directory and Dockerfile Path are consistent (`server` + `./Dockerfile`), or clear Root Directory and use `./server/Dockerfile` with build context `./server`.

### Environment variables (Render → service → Environment)

| Variable | Value | Secret? |
|---|---|---|
| `NODE_ENV` | `production` | no |
| `MONGODB_URI` | Atlas string from Step 1 | **yes** |
| `REDIS_URL` | Redis Cloud URL from Step 2 | **yes** |
| `RABBITMQ_URL` | CloudAMQP URL from Step 3 | **yes** |
| `JWT_ACCESS_SECRET` | random 96-hex string | **yes** |
| `JWT_REFRESH_SECRET` | a *different* random string | **yes** |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | no |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | no |
| `CLIENT_URL` | your static site URL, e.g. `https://smart-police-web.onrender.com` (no trailing slash) | no |
| `API_BASE_URL` | this service's URL, e.g. `https://smart-police-api.onrender.com` (**no** `/api`) | no |
| `GOOGLE_MAPS_API_KEY` | server-side Directions key (optional) | **yes** |
| `AI_API_KEY` | Gemini key (optional; AI features degrade without it) | **yes** |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | optional; SMS is skipped if unset | **yes** |

Do **not** set `PORT` — Render injects it and the app reads `process.env.PORT`.

The server refuses to start in production if a required value is missing, is a placeholder, points to localhost, or if the JWT secrets are < 32 chars or identical. The error in the Render logs lists exactly what is wrong (never the values).

After the first deploy:

```bash
curl https://<your-api>.onrender.com/health
```

---

## Step 7 — Deploy the frontend on Render (Static Site)

Dashboard → **New → Static Site** → select the repo:

| Setting | Value |
|---|---|
| Name | `smart-police-web` |
| Branch | `main` |
| Root Directory | `client` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Environment variables (these are **build-time** and **public**):

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | `https://<your-api>.onrender.com/api` |
| `VITE_GOOGLE_MAPS_API_KEY` | browser key, referrer-restricted (optional) |

**Redirects/Rewrites tab → Add rule** (required for React Router, otherwise refreshing `/admin/...` gives 404):

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | **Rewrite** |

(The Blueprint already includes this rule.)

Because `VITE_*` values are compiled into the bundle, **changing `VITE_API_URL` requires a new deploy** (Manual Deploy → *Clear build cache & deploy*).

### Close the loop

1. Copy the static site URL → set it as `CLIENT_URL` on the backend → the backend redeploys.
2. Copy the backend URL → set `API_BASE_URL` (no `/api`) on the backend, and `VITE_API_URL` (with `/api`) on the static site.
3. Open the web app and log in.

---

## Step 8 — Create the first admin (non-destructive)

`seed:admin` only creates the admin if that email does not exist yet. Run it from your computer against Atlas:

```bash
cd server
# in server/.env set MONGODB_URI (Atlas), ADMIN_NAME, ADMIN_EMAIL, and a strong ADMIN_PASSWORD (12+ chars)
npm run seed:admin
```

**Do not run** `npm run seed`, `seed:nagpur:officers` or `seedStations` against production data unless you intend to: they create demo officers/citizens with a well-known demo password. They now refuse to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is set.

---

## Step 9 — Background worker (SMS & queued jobs)

The API publishes SOS alerts to RabbitMQ; **the SMS (Twilio) for an SOS is sent by `src/worker.js`, not by the API.** If RabbitMQ is connected and no worker is running, those SMS messages just queue up. The real-time Socket.IO alerts are sent by the API directly and are unaffected.

- Render **Background Worker** (no free tier): New → Background Worker → same repo, Docker, Root Directory `server`, **Docker Command** `node src/worker.js`, env vars `NODE_ENV`, `MONGODB_URI`, `RABBITMQ_URL`, `TWILIO_*`. A commented template is in `render.yaml`.
- Alternative if you do not want to pay for a worker: leave `RABBITMQ_URL` **unset** on the API. It then uses its built-in fallback (real-time alerts only; SMS are not sent in that mode either, same as before).

---

## Step 10 — Mobile app with Expo / EAS

What changed in `client-mobile/` (SDK stays `~54`):

| File | Change |
|---|---|
| `src/config/api.js` | Reads `EXPO_PUBLIC_API_URL`; localhost fallback only when `__DEV__`; hardcoded Google key removed |
| `app.json` | Google key removed; added `android.package` and `ios.bundleIdentifier` = `com.smartpolice.citizen`; `ITSAppUsesNonExemptEncryption=false` |
| `app.config.js` (new) | Injects the Android Maps key from `GOOGLE_MAPS_ANDROID_API_KEY` |
| `eas.json` (new) | `preview` (internal APK) and `production` (AAB / store) profiles, each bound to an EAS environment |
| `.env.example`, `.gitignore` | Updated |

> **Confirm the package name `com.smartpolice.citizen` before your first store upload.** It is permanent once published. Change it in `app.json` (both places) if you want a different one.

### Steps

```bash
cd client-mobile
npm ci
npm install -g eas-cli
eas login
eas init                      # links/creates the EAS project (adds extra.eas.projectId to app.json)
```

Set the public API URL and the Maps key as EAS environment variables:

```bash
# Public (embedded in the app, NOT a secret):
eas env:create --environment production --name EXPO_PUBLIC_API_URL \
  --value https://<your-api>.onrender.com/api --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_API_URL \
  --value https://<your-api>.onrender.com/api --visibility plaintext

# Android Maps key (new, restricted key from Step 0):
eas env:create --environment production --name GOOGLE_MAPS_ANDROID_API_KEY \
  --value <NEW_KEY> --visibility sensitive
eas env:create --environment preview --name GOOGLE_MAPS_ANDROID_API_KEY \
  --value <NEW_KEY> --visibility sensitive

eas env:list --environment production
```

Build:

```bash
# Installable test build (APK) — use this first:
eas build --platform android --profile preview

# Store build:
eas build --platform android --profile production
eas build --platform ios --profile production     # requires an Apple Developer account
```

Get the SHA-1 to restrict your Maps key: `eas credentials` → Android → production → keystore → copy the SHA-1 fingerprint, add it to the key restriction in Google Cloud Console.

Submit: `eas submit --platform android --profile production` (needs a Google Play service-account key — upload it via the EAS prompt, never commit it).

Notes:
- **Release builds must use HTTPS.** Android release builds block plain `http://` traffic, so a LAN IP like `http://10.x.x.x:4000/api` only works in Expo Go/dev, not in EAS builds.
- Your local `_env` file held only a LAN-IP `EXPO_PUBLIC_API_URL`. Keep that only in `client-mobile/.env` for local development; production builds get the URL from EAS.
- Never put secrets in `EXPO_PUBLIC_*` variables.
- The app currently uses local notifications driven by Socket.IO; it does not register Expo push tokens, so no FCM/APNs credentials are needed for this build.

---

## Step 11 — Post-deploy verification checklist

- [ ] `https://<api>/health` → `{"status":"ok",...,"mongodb":"connected"}`
- [ ] Web app loads, refreshing a deep link (e.g. `/login`) does not 404
- [ ] Login works and the session survives >15 minutes (refresh-cookie test)
- [ ] Browser console: no CORS errors; WebSocket connects (Network → WS)
- [ ] Trigger a test SOS: real-time alert appears in the control room
- [ ] Render logs show `MongoDB Connected`, `Redis connected`, `RabbitMQ connected` and **no** connection strings
- [ ] Mobile preview APK logs in against the Render URL

---

## Known limitations you should decide on

1. **Uploaded evidence files are stored on local disk** (`server/uploads/`). On Render, container storage is wiped on every deploy/restart, so uploads will be lost unless you attach a **Persistent Disk** mounted at `/app/uploads` (paid instances only) or move uploads to object storage (S3/Cloudinary). Files are also served publicly at `/uploads/...` without authentication.
2. **Single instance only.** Socket.IO has no Redis adapter and SOS acknowledgement timeouts are in-process timers; do not scale to more than one instance, and note that a restart/redeploy cancels pending timers.
3. **Cross-site refresh cookie.** The web app and API are on different `onrender.com` subdomains, so the refresh cookie is `SameSite=None; Secure`. Safari and some browsers block third-party cookies, which would log Safari users out after the 15-minute access token expires. The durable fix is a custom domain for both (e.g. `app.example.com` + `api.example.com`).
4. **Free-tier sleep.** A sleeping API means a slow first request and dropped sockets — unsuitable for an emergency system.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Deploy fails immediately with `Invalid environment configuration` | A required env var is missing/placeholder/localhost — the log lists which |
| `MongooseServerSelectionError` | Atlas Network Access does not allow Render's IP (`0.0.0.0/0`), or wrong password/URL-encoding |
| Browser: CORS error | `CLIENT_URL` does not exactly match the site origin (scheme + host, no trailing slash, no path) |
| Web app calls `localhost` / 404 on `/api` | `VITE_API_URL` was not set at **build** time — set it and redeploy |
| Blank page / 404 on refresh | Missing `/*` → `/index.html` rewrite rule |
| Login works but user is logged out after ~15 min | Refresh cookie blocked (see limitation 3) |
| Redis/RabbitMQ show `fallback` in `/health` | URL wrong or service unreachable; the app keeps running on fallbacks |
