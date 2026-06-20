# ParkIQ — Deployment Guide
## Frontend → Vercel | Backend → Render | Database → Turso

---

## Overview

| Service | Platform | URL (example) |
|---|---|---|
| React Frontend | Vercel | `https://parkiq.vercel.app` |
| FastAPI Backend | Render (Web Service) | `https://parkiq-backend.onrender.com` |
| Database | Turso (libSQL) | `libsql://parkiq-riteshkumar2e.aws-ap-south-1.turso.io` |

> **Turso kyun?** Render ka free tier ephemeral filesystem deta hai — SQLite restart pe reset ho jaata hai. Turso ek managed cloud SQLite (libSQL) database hai jo hamesha persistent rehta hai, free tier mein bhi. No extra setup needed on Render.

---

## PART 1 — BACKEND DEPLOYMENT (Render)

### Step 1 — GitHub par repo push karo

```bash
git add .
git commit -m "chore: add Turso libSQL support + deployment config"
git push origin main
```

### Step 2 — Render Web Service banao (Backend)

1. [render.com](https://render.com) open karo → **New +** → **Web Service**
2. **Connect a repository** → apna GitHub repo select karo
3. Settings:

| Field | Value |
|---|---|
| **Name** | `parkiq-backend` |
| **Region** | Singapore |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

### Step 3 — Environment Variables set karo (Render → Environment tab)

Render dashboard → apna backend service → **Environment** tab → in sab variables add karo:

```
APP_NAME=Parking Intelligence & Enforcement Platform
APP_VERSION=1.0.0
DEBUG=False

# SQLite local fallback (Turso set hone pe use nahi hoga)
DATABASE_URL=sqlite:///./parking_enforcement.db
DATABASE_ECHO=False

# ✅ Turso — yeh dono set karo, DATABASE_URL override ho jayega
TURSO_DATABASE_URL=libsql://parkiq-riteshkumar2e.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=<apna Turso auth token yahan paste karo>

# JWT — strong random string
SECRET_KEY=apna-strong-secret-key-yahan-likho
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Redis (free tier pe disable)
REDIS_ENABLED=False

# Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# ML — Render pe GPU nahi hota, simulation mode use karo
SIMULATE_DETECTIONS=True
GPU_ENABLED=False
YOLO_CONFIDENCE=0.42
FRAME_SAMPLE_RATE=5
MAX_DWELL_SECONDS=300
OCR_LANGUAGES=en

# Groq LLM
GROQ_API_KEY=apni-groq-api-key-yahan-likho
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=2048

# CORS — Vercel URL deploy hone ke baad update karna
ALLOWED_ORIGINS=https://parkiq.vercel.app,https://your-project.vercel.app

# Backend public URL
BACKEND_PUBLIC_URL=https://parkiq-backend.onrender.com
```

> **SECRET_KEY generate karne ka tarika:**
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

### Step 4 — Deploy click karo

**Save Changes** → **Deploy** button dabao. Pehli baar 5–8 minute lagenge (`libsql-experimental` aur ML packages install hoti hain).

Deploy hone ke baad check karo:
```
https://parkiq-backend.onrender.com/api/v1/health
```
Response aana chahiye: `{"status": "ok", ...}`

### Step 5 — Database seed karo (pehli baar sirf)

Render dashboard → backend service → **Shell** tab:

```bash
python -m app.scripts.seed
```

Seed hone ke baad Turso ke tables aur demo data persistent rahenge — Render restart hone par bhi data safe hai.

---

## PART 2 — FRONTEND DEPLOYMENT (Vercel)

### Step 1 — Vercel project import karo

1. [vercel.com](https://vercel.com) open karo → **New Project**
2. GitHub repo connect karo → **Import**
3. Settings:

| Field | Value |
|---|---|
| **Project Name** | `parkiq` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 2 — Environment Variables set karo (Vercel → Settings → Environment Variables)

```
VITE_API_BASE_URL=https://parkiq-backend.onrender.com/api/v1
VITE_WS_URL=wss://parkiq-backend.onrender.com/ws
VITE_APP_NAME=ParkIQ
VITE_APP_VERSION=1.0.0
```

> `ws://` ki jagah `wss://` use karo — Render HTTPS deta hai toh WebSocket bhi secure chahiye.

### Step 3 — Deploy karo

**Deploy** button click karo. Vercel 1–2 minute mein build karke live URL dega:
```
https://parkiq.vercel.app
```

---

## PART 3 — CORS UPDATE (Deploy ke baad zaroori)

Jab frontend ka Vercel URL mil jaye, Render backend ke environment variables mein `ALLOWED_ORIGINS` update karo:

```
ALLOWED_ORIGINS=https://parkiq.vercel.app,https://parkiq-xxxx.vercel.app
```

Phir Render service ko **Manual Deploy** → **Deploy latest commit** se redeploy karo.

---

## PART 4 — VERCEL `vercel.json` (SPA routing fix)

Vercel pe React Router ka direct URL (e.g. `/violations/123`) 404 deta hai. Fix ke liye `frontend/` folder mein yeh file banao:

**[frontend/vercel.json](../frontend/vercel.json)**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Commit karke push karo — Vercel automatically redeploy karega.

---

## PART 5 — RENDER `render.yaml` (Infrastructure as Code — optional)

Root directory mein yeh file rakh sakte ho taaki future deploys easy hon:

**render.yaml** (root mein banao)
```yaml
services:
  - type: web
    name: parkiq-backend
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DEBUG
        value: "False"
      - key: SIMULATE_DETECTIONS
        value: "True"
      - key: REDIS_ENABLED
        value: "False"
      - key: DATABASE_URL
        value: "sqlite:///./parking_enforcement.db"
      - key: TURSO_DATABASE_URL
        sync: false   # Render dashboard pe manually set karo
      - key: TURSO_AUTH_TOKEN
        sync: false   # Render dashboard pe manually set karo
      - key: SECRET_KEY
        generateValue: true
      - key: GROQ_API_KEY
        sync: false
      - key: ALLOWED_ORIGINS
        sync: false
      - key: BACKEND_PUBLIC_URL
        sync: false
```

> `sync: false` ka matlab hai yeh value Render dashboard pe manually enter karni hogi — `render.yaml` mein secrets mat likhna.

---

## PART 6 — CHECKLIST (Deploy ke baad verify karo)

### Backend (Render)
- [ ] `https://parkiq-backend.onrender.com/api/v1/health` → `200 OK`
- [ ] `https://parkiq-backend.onrender.com/api/docs` → Swagger UI open hoti hai
- [ ] `https://parkiq-backend.onrender.com/api/v1/auth/login` → POST se token milta hai
- [ ] Database seed ho gayi (admin/officer/analyst login kaam karta hai)
- [ ] Render restart ke baad bhi data persist karta hai (Turso verify karo)

### Frontend (Vercel)
- [ ] `https://parkiq.vercel.app` → Login page load hoti hai
- [ ] `admin` / `admin123` se login hota hai
- [ ] Dashboard data load hota hai (API calls backend tak pahunch rahi hain)
- [ ] `/violations/1` jaise direct URL 404 nahi dete (`vercel.json` laga diya)
- [ ] WebSocket live updates kaam karte hain (browser console mein error nahi)

---

## Common Errors aur Fix

| Error | Reason | Fix |
|---|---|---|
| `ModuleNotFoundError: libsql_experimental` | Package install nahi hua | Render build logs check karo; `pip install libsql-experimental` manually try karo |
| `Failed to connect to Turso` | Token ya URL galat | Render env mein `TURSO_DATABASE_URL` aur `TURSO_AUTH_TOKEN` dobara check karo |
| Frontend `Failed to fetch` (CORS) | `ALLOWED_ORIGINS` mein Vercel URL nahi | Render env mein update karo + redeploy |
| WebSocket connect fail | `ws://` use kiya `wss://` ki jagah | `VITE_WS_URL=wss://...` set karo |
| Login ke baad blank page | React Router 404 | `frontend/vercel.json` add karo |
| Render free tier slow response | Cold start (service 15 min inactivity me sleep) | Normal hai free tier mein; pehla request slow aata hai |
| `SIMULATE_DETECTIONS` ignore ho raha | .env override | Render environment tab mein explicitly `True` set karo |

---

## Free Tier Limitations

| Platform | Limitation | Workaround |
|---|---|---|
| **Render (free)** | Service 15 min baad sleep | UptimeRobot se ping karo har 10 min |
| **Render (free)** | 750 hours/month | Ek hi service active rakho |
| **Render (free)** | No persistent disk | Evidence images restart pe delete honge (S3/Cloudinary pe move karo production mein) |
| **Turso (free)** | 500 databases, 1GB storage, 1B row reads/month | Demo ke liye kafi zyada hai |
| **Vercel (free)** | 100GB bandwidth/month | Demo ke liye kafi hai |

---

## Turso — Useful Commands (local testing ke liye)

```bash
# Turso CLI install karo
curl -sSfL https://get.tur.so/dev/cli | bash

# Login karo
turso auth login

# Database list karo
turso db list

# Shell open karo (SQL queries)
turso db shell parkiq-riteshkumar2e

# Token dobara generate karo (agar expire ho)
turso db tokens create parkiq-riteshkumar2e
```

---

## Quick Reference — Useful URLs after deploy

```
Backend API:   https://parkiq-backend.onrender.com/api/v1/
API Docs:      https://parkiq-backend.onrender.com/api/docs
Health Check:  https://parkiq-backend.onrender.com/api/v1/health
Frontend App:  https://parkiq.vercel.app
Turso DB:      libsql://parkiq-riteshkumar2e.aws-ap-south-1.turso.io

Demo Login:
  admin    / admin123
  officer1 / officer123
  analyst1 / analyst123
  viewer1  / viewer123
```

---

## Security Reminders

> **Yeh kaam karo deploy se pehle:**
> - `backend/.env` aur `frontend/.env` ko `.gitignore` mein add karo — Turso token GitHub pe nahi jaana chahiye
> - `TURSO_AUTH_TOKEN` sirf Render dashboard ke environment tab mein set karo, code mein hardcode mat karo
> - `SECRET_KEY` production ke liye fresh generate karo
> - `DEBUG=False` production mein set karo

```bash
# .gitignore mein yeh lines honi chahiye:
.env
backend/.env
frontend/.env
*.db
storage/
```

---

*File: `docs/deployment.md` · Project: ParkIQ · Updated: June 2026*
