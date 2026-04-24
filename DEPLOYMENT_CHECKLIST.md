# 🚀 Render Deployment Checklist

## 📋 Architecture Overview

You're deploying **4 separate services** on Render:

1. **Main Backend API** (Web Service) - Port 3001
2. **AI Worker** (Background Worker) - TTS & Question Generation
3. **Transcription Worker** (Background Worker) - Speech-to-Text
4. **Evaluation Worker** (Background Worker) - AI Answer Grading

All services share:

- ✅ Upstash Redis (queue management)
- ✅ MongoDB Atlas (database)
- ✅ AWS S3 (audio storage)

---

## ✅ Pre-Deployment Checklist

### 1. Code Preparation

- [x] Worker scripts added to `package.json`
- [x] `multer-storage-cloudinary` removed from dependencies
- [x] `render.yaml` created at project root
- [x] `.gitignore` includes `.env` files
- [ ] Test all workers locally (they should work with Upstash Redis)

### 2. Environment Variables to Collect

Gather these values before deployment:

```
✅ MONGO_URI=mongodb+srv://... (from MongoDB Atlas)
✅ REDIS_URL=rediss://default:... (from Upstash)
✅ AWS_S3_ACCESS_KEY_ID=AKIA... (from AWS)
✅ AWS_S3_SECRET_ACCESS_KEY=... (from AWS)
✅ AWS_S3_BUCKET_NAME=exam-portal-audio
✅ AWS_S3_REGION=ap-south-1
✅ GEMINI_API_KEY=AIzaSy... (from Google AI Studio)
✅ CLOUDINARY_CLOUD_NAME=dffkavugz
✅ CLOUDINARY_API_KEY=681962784884877
✅ CLOUDINARY_API_SECRET=6iUhhV1blKQKeEaERvptV0MVGnE
✅ MAIL_USER=dp117005@gmail.com
✅ MAIL_PASS=gtkw aglp qqdy gvgb
✅ FRONTEND_URL=http://localhost:5173 (or your frontend URL)
```

---

## 🎯 Deployment Steps

### **PHASE 1: Deploy Backend to Render**

### **OPTION A: Automated Deployment (Recommended)**

Using the `render.yaml` file for one-click deployment:

#### Step 1: Push Code to GitHub

```bash
cd d:\STT-TTS-exam-portal
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

#### Step 2: Deploy via render.yaml

1. Go to: https://render.com/dashboard
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository: `STT-TTS-exam-portal`
5. Render will automatically detect `render.yaml`
6. Click **"Apply"**

#### Step 3: Fill in Environment Variables

Render will prompt you to set all `sync: true` variables. Enter:

```
MONGO_URI: mongodb+srv://your-connection-string
REDIS_URL: rediss://default:your-password@central-camel-105990.upstash.io:6379
AWS_S3_ACCESS_KEY_ID: (your AWS access key from AWS console)
AWS_S3_SECRET_ACCESS_KEY: (your AWS secret key from AWS console)
AWS_S3_BUCKET_NAME: exam-portal-audio
AWS_S3_REGION: ap-south-1
GEMINI_API_KEY: (your Gemini API key from Google AI Studio)
CLOUDINARY_CLOUD_NAME: (your Cloudinary cloud name)
CLOUDINARY_API_KEY: (your Cloudinary API key)
CLOUDINARY_API_SECRET: (your Cloudinary API secret)
MAIL_USER: (your email address)
MAIL_PASS: (your email app password)
FRONTEND_URL: http://localhost:5173 (or your production frontend URL)
```

#### Step 4: Wait for Deployment

- All 4 services will deploy automatically
- This takes 3-5 minutes
- Monitor logs in Render dashboard

---

### **OPTION B: Manual Deployment**

If you prefer to create each service manually:

#### Service 1: Main Backend API

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub → Select `STT-TTS-exam-portal`
4. Configure:

   - **Name:** `examecho-backend`
   - **Region:** Oregon (or closest to users)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

5. Add Environment Variables:

   ```
   NODE_ENV=production
   PORT=3001
   MONGO_URI=your-mongodb-uri
   REDIS_URL=rediss://default:...
   JWT_SECRET=(generate a strong secret)
   JWT_EXPIRES_IN=1h
   JWT_RESET_SECRET=(generate another secret)
   AWS_S3_ACCESS_KEY_ID=AKIA...
   AWS_S3_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET_NAME=exam-portal-audio
   AWS_S3_REGION=ap-south-1
   GEMINI_API_KEY=AIzaSy...
   AI_PROVIDER=gemini
   AI_MODEL=gemini-2.5-flash
   CLOUDINARY_CLOUD_NAME=dffkavugz
   CLOUDINARY_API_KEY=681962784884877
   CLOUDINARY_API_SECRET=6iUhhV1blKQKeEaERvptV0MVGnE
   MAIL_USER=dp117005@gmail.com
   MAIL_PASS=gtkw aglp qqdy gvgb
   FRONTEND_URL=http://localhost:5173
   CAPTCHA_EXPIRES_MS=300000
   ```

6. Click **"Create Web Service"**

---

#### Service 2: AI Worker

1. Click **"New +"** → **"Background Worker"**
2. Connect GitHub → Select `STT-TTS-exam-portal`
3. Configure:

   - **Name:** `examecho-ai-worker`
   - **Region:** Oregon (SAME as backend)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/workers/aiWorker.js`
   - **Instance Type:** Free

4. Add Environment Variables:

   ```
   NODE_ENV=production
   MONGO_URI=your-mongodb-uri
   REDIS_URL=rediss://default:...
   AWS_S3_ACCESS_KEY_ID=AKIA...
   AWS_S3_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET_NAME=exam-portal-audio
   AWS_S3_REGION=ap-south-1
   GEMINI_API_KEY=AIzaSy...
   AI_PROVIDER=gemini
   AI_MODEL=gemini-2.5-flash
   ```

5. Click **"Create Worker"**

---

#### Service 3: Transcription Worker

1. Click **"New +"** → **"Background Worker"**
2. Configure:

   - **Name:** `examecho-transcription-worker`
   - **Region:** Oregon (SAME as backend)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/workers/transcriptionWorker.js`
   - **Instance Type:** Free

3. Add Environment Variables:

   ```
   NODE_ENV=production
   MONGO_URI=your-mongodb-uri
   REDIS_URL=rediss://default:...
   AWS_S3_ACCESS_KEY_ID=AKIA...
   AWS_S3_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET_NAME=exam-portal-audio
   AWS_S3_REGION=ap-south-1
   ```

4. Click **"Create Worker"**

---

#### Service 4: Evaluation Worker

1. Click **"New +"** → **"Background Worker"**
2. Configure:

   - **Name:** `examecho-evaluation-worker`
   - **Region:** Oregon (SAME as backend)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/workers/aiEvaluationWorker.js`
   - **Instance Type:** Free

3. Add Environment Variables:

   ```
   NODE_ENV=production
   MONGO_URI=your-mongodb-uri
   REDIS_URL=rediss://default:...
   GEMINI_API_KEY=AIzaSy...
   AI_PROVIDER=gemini
   AI_MODEL=gemini-2.5-flash
   ```

4. Click **"Create Worker"**

---

### **PHASE 2: Deploy Frontend to Vercel**

After backend is deployed and working, deploy your frontend to Vercel.

**See complete guide:** [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

#### Quick Steps:

1. **Prepare Frontend:**

   - [x] `axiosInstance.js` uses `VITE_API_URL` env variable
   - [ ] Create `.env.production` with Render backend URL

2. **Deploy to Vercel:**

   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variable on Vercel:**

   ```
   VITE_API_URL=https://examecho-backend.onrender.com/api
   ```

4. **Update Backend CORS:**

   - Go to Render Dashboard → examecho-backend → Environment
   - Update: `FRONTEND_URL=https://your-app.vercel.app`
   - Save and wait for redeploy

5. **Test Complete Flow:**
   - Login/Register
   - Create exam
   - Record & submit audio
   - View results

---

## ✅ Post-Deployment Verification

### 1. Check Service Status

In Render Dashboard, verify all 4 services show:

- ✅ **Status:** Live
- ✅ **No errors in logs**

### 2. Verify Backend Logs

Should see:

```
[Redis Config] REDIS_URL: SET (length: 116)
[Redis Config] Parsed - Host: central-camel-105990.upstash.io Port: 6379
Server running on port 3001
MongoDB connected
✅ Connected DB name: oral_exam_db
✅ Redis connected to Upstash
✅ Redis ready to accept commands
```

### 3. Verify Worker Logs

Each worker should show:

```
[Redis Config] REDIS_URL: SET (length: 116)
✅ Redis connected to Upstash
✅ Redis ready to accept commands
MongoDB connected
🚀 AI Worker started (or Transcription/Evaluation Worker)
✅ Worker listening for jobs...
```

### 4. Test API Endpoint

```bash
# Replace with your actual Render URL
curl https://examecho-backend.onrender.com/health

# Expected response:
{"status":"ok"}
```

### 5. Test Queue System

1. Create an exam via your frontend
2. Upload audio answer
3. Check worker logs - should see jobs being processed:
   - AI Worker: "🔥 Worker picked job"
   - Transcription Worker: "🎤 Transcription job received"
   - Evaluation Worker: "📊 Evaluation job received"

---

## 🔧 Important Notes

### 1. Region Selection

- **All services MUST be in the same region** (Oregon recommended)
- This ensures low latency between backend and workers

### 2. Free Tier Limitations

- **750 hours/month per service** (enough for 1 service running 24/7)
- **4 services = 3000 hours total** → You'll need to rotate or upgrade
- **Spins down after 15 minutes of inactivity** (cold starts take 30-60 seconds)

### 3. Production Upgrade Recommendation

For production use:

- **Web Service:** $7/month (always on)
- **3 Workers:** $7/month each = $21/month
- **Total:** ~$28/month

### 4. MongoDB Atlas Configuration

- Whitelist Render's IP addresses (or use 0.0.0.0/0 for all IPs)
- Get connection string from MongoDB Atlas dashboard
- Format: `mongodb+srv://username:password@cluster.mongodb.net/oral_exam_db`

### 5. AWS S3 CORS Configuration

Ensure your S3 bucket has CORS enabled:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## 🐛 Troubleshooting

### Issue: Worker not connecting to Redis

**Check:**

1. `REDIS_URL` is exactly: `rediss://default:PASSWORD@central-camel-105990.upstash.io:6379`
2. Note the `rediss://` (with double 's') for TLS
3. Check Upstash dashboard - is database active?

### Issue: Jobs not being processed

**Check:**

1. All services use the SAME `REDIS_URL`
2. Workers are running (check Render dashboard)
3. Queue names match between backend and workers

### Issue: MongoDB connection fails

**Check:**

1. MongoDB Atlas IP whitelist includes Render IPs
2. Connection string is correct
3. Database name matches: `oral_exam_db`

### Issue: Service crashes on startup

**Check:**

1. All required environment variables are set
2. Look at Render logs for specific error
3. Verify `npm install` completed successfully

---

## 📊 Monitoring

### Render Dashboard

- Monitor CPU/Memory usage
- Check deployment logs
- View request metrics

### Upstash Dashboard

- Monitor Redis memory usage
- Check connected clients (should see 4)
- View command throughput

### MongoDB Atlas

- Monitor database connections
- Check query performance
- View storage usage

---

## 🎯 Next Steps After Deployment

1. ✅ Update `FRONTEND_URL` to your production frontend URL
2. ✅ Test complete exam flow (create exam → submit audio → transcription → evaluation)
3. ✅ Set up custom domain (optional)
4. ✅ Enable HTTPS (automatic on Render)
5. ✅ Set up monitoring alerts
6. ✅ Consider upgrading to paid tier for production

---

## 💰 Cost Breakdown

### Free Tier (Testing)

- Render (4 services): $0 (750 hrs/month each)
- Upstash Redis: $0 (256MB free)
- MongoDB Atlas: $0 (512MB free)
- AWS S3: ~$1-2/month
- **Total: ~$1-2/month**

### Production Tier

- Render (4 services): $28/month ($7 each)
- Upstash Redis Pro: $10/month
- MongoDB Atlas: $9/month
- AWS S3: ~$5/month
- **Total: ~$52/month**

---

## 📚 Quick Reference

**Your Service URLs:**

- Backend: `https://examecho-backend.onrender.com`
- Frontend: Update `FRONTEND_URL` env var

**Render Dashboard:** https://dashboard.render.com  
**Upstash Dashboard:** https://upstash.com  
**MongoDB Atlas:** https://cloud.mongodb.com  
**AWS S3 Console:** https://s3.console.aws.amazon.com

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] All environment variables collected
- [ ] 4 services deployed on Render
- [ ] All services show "Live" status
- [ ] Logs show successful Redis & MongoDB connections
- [ ] API health endpoint responds
- [ ] Test exam creation works
- [ ] Test audio upload works
- [ ] Test transcription works
- [ ] Test evaluation works
- [ ] MongoDB Atlas IP whitelist configured
- [ ] S3 CORS configured
- [ ] Frontend URL updated to production

---

**🎉 You're ready to deploy! Good luck!**
