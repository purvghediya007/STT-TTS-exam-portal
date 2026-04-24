# 🚀 Vercel Frontend Deployment Guide

## 📋 Overview

Deploy your React + Vite frontend to Vercel and connect it to your Render backend.

---

## ✅ Pre-Deployment Checklist

### 1. Update Frontend Configuration

- [x] `axiosInstance.js` updated to use `VITE_API_URL` environment variable
- [x] `.env.example` created with template
- [ ] Test locally with production backend URL

### 2. Backend URL Ready

After deploying backend to Render, you'll have:

```
https://examecho-backend.onrender.com
```

---

## 🎯 Deployment Steps

### **Step 1: Prepare Frontend Code**

#### 1.1 Create `.env.production` (Optional - for local testing)

```env
VITE_API_URL=https://examecho-backend.onrender.com/api
```

#### 1.2 Test Locally with Production Backend

```bash
cd frontend
npm run build
npm run preview
```

This will test the production build with your Render backend.

---

### **Step 2: Deploy to Vercel**

#### **Option A: Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to frontend directory
cd d:\STT-TTS-exam-portal\frontend

# Deploy
vercel
```

Follow the prompts:

- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** examecho-frontend (or your choice)
- **Directory?** ./
- **Override settings?** No

#### **Option B: Vercel Dashboard (GitHub Integration)**

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `STT-TTS-exam-portal`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

---

### **Step 3: Set Environment Variables on Vercel**

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**:

Add:

```
VITE_API_URL=https://examecho-backend.onrender.com/api
```

Select environments:

- ✅ Production
- ✅ Preview
- ✅ Development (optional)

Click **Save**

---

### **Step 4: Redeploy**

After adding environment variables, trigger a new deployment:

```bash
vercel --prod
```

Or in Vercel Dashboard → **Deployments** → Click **...** → **Redeploy**

---

## 🔧 Vercel Configuration File (Optional)

Create `vercel.json` in the `frontend` directory for advanced configuration:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

This ensures:

- SPA routing works (all routes go to index.html)
- Assets are cached for 1 year

---

## ✅ Post-Deployment Verification

### 1. Check Deployment Status

In Vercel Dashboard, verify:

- ✅ Status: **Ready**
- ✅ No build errors
- ✅ Environment variables loaded

### 2. Test Your Frontend URL

Visit: `https://your-project.vercel.app`

### 3. Verify Backend Connection

Open browser console (F12) and check:

- No CORS errors
- API calls going to: `https://examecho-backend.onrender.com/api`
- Authentication working

### 4. Test Complete Flow

- [ ] Login/Register works
- [ ] Dashboard loads
- [ ] Exam creation works
- [ ] Audio recording works
- [ ] Exam submission works
- [ ] Results display correctly

---

## 🔧 Update Backend FRONTEND_URL

After frontend is deployed, update your **Render backend** environment variable:

1. Go to Render Dashboard → **examecho-backend** → **Environment**
2. Update:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
3. Click **Save Changes**
4. Backend will auto-redeploy

This ensures CORS allows requests from your Vercel frontend.

---

## 🐛 Troubleshooting

### Issue: CORS Errors

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix:**

1. Check `FRONTEND_URL` in Render backend matches your Vercel URL exactly
2. Restart backend service on Render
3. Check backend logs for CORS configuration

### Issue: API Calls Failing (404/500)

**Check:**

1. `VITE_API_URL` is set correctly in Vercel
2. Backend URL is accessible: `https://examecho-backend.onrender.com/health`
3. Network tab in browser shows correct API URL

### Issue: Build Fails on Vercel

**Common fixes:**

```bash
# Clear Vercel build cache
vercel --force

# Check for local-only imports
# Ensure all dependencies are in package.json
npm install

# Test build locally
npm run build
```

### Issue: Blank Page After Deployment

**Check:**

1. Browser console for JavaScript errors
2. Vercel deployment logs
3. Environment variables are loaded (check Vercel dashboard)
4. Vite base path is correct (should be `/` for Vercel)

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain to Vercel:

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your domain: `exam.yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### Update Backend CORS:

After adding custom domain, update Render backend:

```
FRONTEND_URL=https://exam.yourdomain.com
```

---

## 💰 Vercel Pricing

### Hobby (Free):

- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ Automatic HTTPS
- ✅ Custom domains (up to 1)

### Pro ($20/month):

- ✅ 1 TB bandwidth/month
- ✅ Advanced analytics
- ✅ Multiple custom domains
- ✅ Team collaboration

**For most projects, Hobby tier is sufficient!**

---

## 📊 Complete Architecture After Deployment

```
┌─────────────────────────────────────┐
│         Vercel (Frontend)           │
│  https://your-app.vercel.app        │
│  - React + Vite                     │
│  - SPA Routing                      │
└──────────────┬──────────────────────┘
               │
               │ API Calls (VITE_API_URL)
               ↓
┌─────────────────────────────────────┐
│      Render (Backend API)           │
│  https://examecho-backend.onrender  │
│  - Express API Server               │
│  - REST Endpoints                   │
└──────────────┬──────────────────────┘
               │
               │ Queue Jobs (REDIS_URL)
               ↓
┌─────────────────────────────────────┐
│       Upstash Redis                 │
│  - Queue Management                 │
│  - Job Distribution                 │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Render (3 Background Workers)     │
│  - AI Worker (TTS)                  │
│  - Transcription Worker (STT)       │
│  - Evaluation Worker (Grading)      │
└─────────────────────────────────────┘
               │
               │ Store/Retrieve Audio
               ↓
┌─────────────────────────────────────┐
│         AWS S3                      │
│  - Audio File Storage               │
│  - Pre-signed URLs                  │
└─────────────────────────────────────┘
               │
               │ Store Exam Data
               ↓
┌─────────────────────────────────────┐
│      MongoDB Atlas                  │
│  - User Data                        │
│  - Exams & Questions                │
│  - Results & Analytics              │
└─────────────────────────────────────┘
```

---

## 🎯 Deployment Checklist

### Backend (Render):

- [ ] 4 services deployed (1 backend + 3 workers)
- [ ] All services showing "Live" status
- [ ] Redis connected successfully
- [ ] MongoDB connected successfully
- [ ] `FRONTEND_URL` updated to Vercel URL

### Frontend (Vercel):

- [ ] Project deployed successfully
- [ ] `VITE_API_URL` environment variable set
- [ ] Frontend URL accessible
- [ ] No CORS errors in browser console
- [ ] API calls reaching backend successfully
- [ ] Complete exam flow tested

### External Services:

- [ ] Upstash Redis active
- [ ] MongoDB Atlas IP whitelist configured
- [ ] AWS S3 CORS configured
- [ ] Cloudinary working (for image uploads)

---

## 📚 Quick Commands Reference

### Local Development:

```bash
# Backend
cd backend
npm run dev

# Frontend (in new terminal)
cd frontend
npm run dev
```

### Production Deployment:

```bash
# Deploy backend to Render
git push origin main

# Deploy frontend to Vercel
cd frontend
vercel --prod
```

### Check Environment Variables:

```bash
# Vercel
vercel env ls

# Render
# Check in dashboard
```

---

## 🔐 Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use environment variables for all secrets
- ✅ Enable HTTPS (automatic on Vercel & Render)
- ✅ CORS restricts to your frontend domain only
- ✅ JWT tokens for authentication
- ✅ Pre-signed S3 URLs for secure uploads

---

## 🎉 You're Ready!

**Deployment Order:**

1. ✅ Deploy backend to Render (4 services)
2. ✅ Deploy frontend to Vercel
3. ✅ Update `FRONTEND_URL` on Render backend
4. ✅ Test complete flow
5. 🚀 Go live!

**Your Production URLs:**

- Frontend: `https://your-app.vercel.app`
- Backend: `https://examecho-backend.onrender.com`
- API Base: `https://examecho-backend.onrender.com/api`

---

**Good luck with your deployment! 🚀**
