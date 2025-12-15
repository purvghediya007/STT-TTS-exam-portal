# 🚀 Quick Start Guide

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application

**Option A: Run Everything Together (Recommended)**
```bash
npm run dev:all
```

This starts both:
- ✅ Mock API Server on `http://localhost:3001`
- ✅ Frontend on `http://localhost:5173`

**Option B: Run Separately**

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run dev
```

### 3. Access the Application

Open your browser and go to: **http://localhost:5173**

## 🎯 Login Instructions

### Student Login
1. Select **"Student"** tab
2. Enter any enrollment number (e.g., `230170116001`)
3. Enter any password
4. Click **Login**
5. You'll be redirected to the Student Dashboard

### Faculty Login
1. Select **"Faculty"** tab
2. Enter any email/username (e.g., `prof.patel@vgec.ac.in`)
3. Enter any password
4. Click **Login**
5. You'll be redirected to the Faculty Dashboard

## ✨ Features Available

### Student Features
- ✅ View Dashboard with statistics
- ✅ Browse Upcoming Exams
- ✅ Join Live Exams
- ✅ View Exam History
- ✅ Search and Filter Exams
- ✅ View Exam Guidelines

### Faculty Features
- ✅ View Dashboard with statistics
- ✅ Create New Exams
- ✅ Edit Existing Exams
- ✅ Delete Exams
- ✅ View All Students
- ✅ View Student Details and Submissions
- ✅ Monitor Exam Submissions

## 📊 Demo Data

The application comes with pre-loaded demo data:
- **3 Student Exams** (Live, Upcoming, Finished)
- **3 Faculty Exams**
- **3 Students** with sample data
- **Sample Submissions**

## 🔧 Troubleshooting

### Port Already in Use
If you get a "port already in use" error:
- Stop any running instances
- Or change ports in `server/index.js` (line 8) and `vite.config.js`

### Server Not Starting
- Make sure Node.js is installed (v18+)
- Run `npm install` again
- Check if port 3001 is available

### Frontend Not Connecting to Server
- Make sure the server is running first
- Check browser console for errors
- Verify proxy settings in `vite.config.js`

## 📝 Notes

- All data is stored in `server/database.json`
- Changes persist across server restarts
- Exam statuses update automatically based on current time
- When faculty creates an exam, it automatically appears for students

## 🎉 You're All Set!

The application is now fully functional. Try creating an exam as faculty and then logging in as a student to see it!










