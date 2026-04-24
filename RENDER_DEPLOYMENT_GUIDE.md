# Render Deployment Guide with Redis

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Render Services                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Main Backend Service (Web Service)                  │
│     - Express API server                                 │
│     - Routes, controllers, middleware                    │
│     - Port: 3001 (or $PORT)                             │
│                                                          │
│  2. AI Worker Service (Background Worker)               │
│     - AI processing (TTS, rubrics)                       │
│     - Queue: ai-processing                               │
│                                                          │
│  3. Transcription Worker (Background Worker)            │
│     - Speech-to-Text processing                          │
│     - Queue: answers-transcription                       │
│                                                          │
│  4. Evaluation Worker (Background Worker)               │
│     - Answer evaluation                                  │
│     - Queue: answers-evaluation                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   Upstash Redis       │
              │   (Cloud Hosted)      │
              │   - Queue storage     │
              │   - Job management    │
              └───────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   MongoDB Atlas       │
              │   (Cloud Database)    │
              └───────────────────────┘
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Set Up Upstash Redis

1. **Go to https://upstash.com/**
2. Sign up for free account
3. Click "Create Database"
4. Choose:
   - **Name:** `examecho-redis`
   - **Region:** Choose closest to your users (e.g., `aws-ap-south-1` for India)
   - **Plan:** Free (256MB)
5. Click "Create"
6. Copy your credentials:
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   REDIS_URL=redis://default:your-password@your-db.upstash.io:6379
   ```

---

### Step 2: Prepare Your Backend Code

#### 2.1 Update `.env` for Production

Create `.env.production` (don't commit to Git):

```env
# Server
NODE_ENV=production
PORT=3001

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/examecho

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS S3
AWS_S3_ACCESS_KEY_ID=your-access-key
AWS_S3_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=exam-portal-audio
AWS_S3_REGION=ap-south-1

# Redis (Upstash)
REDIS_URL=redis://default:your-password@your-db.upstash.io:6379

# AI Services
AI_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your-gemini-key

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 2.2 Update `package.json` Scripts

Make sure your `package.json` has these scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "worker:ai": "node src/workers/aiWorker.js",
    "worker:transcription": "node src/workers/transcriptionWorker.js",
    "worker:evaluation": "node src/workers/evaluationWorker.js"
  }
}
```

#### 2.3 Create `render.yaml` (Optional - for automated setup)

```yaml
services:
  # Main Backend
  - type: web
    name: examecho-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: REDIS_URL
        sync: false
      - key: MONGODB_URI
        sync: false
      # ... other vars

  # AI Worker
  - type: worker
    name: examecho-ai-worker
    env: node
    buildCommand: npm install
    startCommand: node src/workers/aiWorker.js
    envVars:
      - key: REDIS_URL
        sync: false
      - key: MONGODB_URI
        sync: false

  # Transcription Worker
  - type: worker
    name: examecho-transcription-worker
    env: node
    buildCommand: npm install
    startCommand: node src/workers/transcriptionWorker.js
    envVars:
      - key: REDIS_URL
        sync: false
      - key: MONGODB_URI
        sync: false

  # Evaluation Worker
  - type: worker
    name: examecho-evaluation-worker
    env: node
    buildCommand: npm install
    startCommand: node src/workers/evaluationWorker.js
    envVars:
      - key: REDIS_URL
        sync: false
      - key: MONGODB_URI
        sync: false
```

---

### Step 3: Deploy to Render

#### 3.1 Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

#### 3.2 Create Render Services

**Main Backend Service:**

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:

   - **Name:** `examecho-backend`
   - **Region:** Choose closest to users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free (or paid for production)

5. Add Environment Variables:

   ```
   NODE_ENV=production
   REDIS_URL=redis://default:password@your-db.upstash.io:6379
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret
   AWS_S3_ACCESS_KEY_ID=...
   AWS_S3_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET_NAME=exam-portal-audio
   AWS_S3_REGION=ap-south-1
   GEMINI_API_KEY=...
   ```

6. Click "Create Web Service"

---

**Worker Services (Repeat for each worker):**

1. Click "New +" → "Background Worker"
2. Connect repository
3. Configure for AI Worker:

   - **Name:** `examecho-ai-worker`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/workers/aiWorker.js`

4. Add same environment variables as backend (except PORT)

5. Repeat for:
   - `examecho-transcription-worker` → `node src/workers/transcriptionWorker.js`
   - `examecho-evaluation-worker` → `node src/workers/evaluationWorker.js`

---

### Step 4: Verify Deployment

#### 4.1 Check Logs

In Render dashboard, check logs for each service:

**Backend should show:**

```
✅ Redis connected: redis://default:***@your-db.upstash.io:6379
✅ MongoDB connected
🚀 Server running on port 3001
```

**Workers should show:**

```
✅ Redis connected: redis://default:***@your-db.upstash.io:6379
✅ MongoDB connected
🚀 AI Worker started
✅ Worker listening for jobs...
```

#### 4.2 Test API

```bash
# Test health endpoint
curl https://examecho-backend.onrender.com/api/health

# Should return:
{"status":"ok","message":"Server is running"}
```

---

## 🔧 Environment Variables Summary

### All Services Need:

```env
REDIS_URL=redis://default:password@host:port
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
AWS_S3_ACCESS_KEY_ID=...
AWS_S3_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=exam-portal-audio
AWS_S3_REGION=ap-south-1
```

### Backend Only:

```env
PORT=3001 (or use $PORT from Render)
JWT_SECRET=your-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### Workers Only:

```env
# No PORT needed
# Same Redis and MongoDB as backend
```

---

## 💰 Cost Estimate

### Free Tier (Testing/Development):

- **Render Web Service:** Free (750 hours/month)
- **Render Workers (x3):** Free (750 hours/month each)
- **Upstash Redis:** Free (256MB, 10k commands/day)
- **MongoDB Atlas:** Free (512MB)
- **AWS S3:** ~$1-2/month (depends on storage)
- **Total:** ~$1-2/month (just S3)

### Production Tier:

- **Render Web Service:** $7/month
- **Render Workers (x3):** $7/month each = $21
- **Upstash Redis Pro:** $10/month
- **MongoDB Atlas:** $9/month
- **AWS S3:** ~$5/month
- **Total:** ~$52/month

---

## 🐛 Troubleshooting

### Worker Not Connecting to Redis

**Error:** `Redis connection error`

**Fix:**

1. Check `REDIS_URL` environment variable is set correctly
2. Verify Upstash database is active
3. Check network connectivity
4. For TLS: Ensure URL starts with `rediss://` (note the extra 's')

### Jobs Not Being Processed

**Issue:** Jobs queued but workers not picking them up

**Fix:**

1. Check worker logs - are they running?
2. Verify all services use the SAME `REDIS_URL`
3. Check queue names match:
   - Backend adds to: `ai-processing`, `answers-transcription`, `answers-evaluation`
   - Workers listen to: same names

### Memory Issues on Free Tier

**Error:** Service restarts frequently

**Fix:**

1. Free tier has 512MB RAM limit
2. Add `--max-old-space-size=256` to Node:
   ```json
   "startCommand": "node --max-old-space-size=256 server.js"
   ```
3. Consider upgrading to paid tier ($7/month)

---

## 📊 Monitoring

### Upstash Dashboard

- Go to https://upstash.com/
- View:
  - Memory usage
  - Command count
  - Connected clients
  - Throughput

### Render Dashboard

- View:
  - Service logs
  - CPU/Memory usage
  - Request metrics
  - Deployment history

---

## 🔐 Security Checklist

- ✅ Never commit `.env` files to Git
- ✅ Use Render environment variables (encrypted at rest)
- ✅ Enable TLS for Redis (`rediss://`)
- ✅ Use strong JWT_SECRET
- ✅ Restrict S3 bucket permissions
- ✅ Enable MongoDB IP whitelist
- ✅ Use separate Redis database for production

---

## 🎯 Next Steps

1. ✅ Set up Upstash Redis
2. ✅ Update `.env.production` with all credentials
3. ✅ Push code to GitHub
4. ✅ Create Render services (1 backend + 3 workers)
5. ✅ Add environment variables to all services
6. ✅ Deploy and test
7. ✅ Monitor logs and performance

---

## 📚 Resources

- **Upstash:** https://upstash.com/
- **Render Docs:** https://render.com/docs
- **BullMQ:** https://docs.bullmq.io/
- **ioredis:** https://github.com/luin/ioredis
