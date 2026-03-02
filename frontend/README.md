# 🎨 Frontend – React Vite Exam Management Interface

This is the **React + Vite frontend** for the ExamEcho AI-powered examination platform. It provides an intuitive user interface for students to take exams, teachers to manage them, and admins to oversee the system.

---

## 🌟 Features

✅ **Student Features**

- View available, upcoming, and completed exams
- Join and take live exams with audio recording
- Real-time countdown timer during exams
- View exam results and detailed feedback
- Search and filter exams by status
- Responsive design for desktop & tablets

✅ **Teacher Features**

- Create and manage exams
- Add questions (text, essay, MCQ)
- Bulk upload questions via JSON
- View exam statistics
- Monitor student submissions
- Generate reports and analytics

✅ **Admin Features**

- System administration
- User management
- System-wide analytics

✅ **Technical**

- Built with React 19 & Vite
- Styled with Tailwind CSS
- Responsive design
- Real-time updates
- Error handling & loading states
- Form validation
- Context API for state management

---

## 🏗️ Project Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
│
├── public/
├── server/
│   └── index.js
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── Header.jsx
    │   ├── Footer.jsx
    │   ├── LoginCard.jsx
    │   ├── HistoryTable.jsx
    │   ├── ExamCard.jsx
    │   ├── AudioRecorder.jsx
    │   ├── Loading.jsx
    │   └── Modal.jsx
    │
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── HomePage.jsx
    │   ├── ExamsListPage.jsx
    │   ├── TakeExamView.jsx
    │   ├── HistoryView.jsx
    │   ├── TeacherDashboard.jsx
    │   ├── AdminDashboard.jsx
    │   ├── CreateExamPage.jsx
    │   ├── EditExamPage.jsx
    │   └── NotFoundPage.jsx
    │
    ├── services/
    │   ├── api.ts
    │   ├── authService.js
    │   ├── examService.js
    │   └── studentService.js
    │
    ├── contexts/
    │   ├── AuthContext.jsx
    │   └── ExamContext.jsx
    │
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useExam.js
    │   └── useFetch.js
    │
    ├── utils/
    │   ├── validators.js
    │   ├── formatters.js
    │   ├── constants.js
    │   └── helpers.js
    │
    ├── assets/
    │   ├── images/
    │   ├── icons/
    │   └── fonts/
    │
    └── test/
        ├── components/
        ├── pages/
        └── utils/
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**

### Installation Steps

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Create Environment File

```bash
cp .env.example .env
```

#### 3. Configure Environment Variables

Edit `.env`:

```env
# ==================== API CONFIGURATION ====================
VITE_API_URL=http://localhost:5000/api
VITE_FASTAPI_URL=http://localhost:8000

# ==================== APP SETTINGS ====================
VITE_APP_NAME=ExamEcho
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=development

# ==================== FEATURE FLAGS ====================
VITE_ENABLE_TTS=true
VITE_ENABLE_AUDIO_RECORDING=true
VITE_ENABLE_ANALYTICS=true

# ==================== AUDIO SETTINGS ====================
VITE_AUDIO_BITRATE=128000
VITE_MAX_RECORDING_TIME=600
VITE_MIN_RECORDING_TIME=10

# ==================== TIMEOUT & RETRY ====================
VITE_API_TIMEOUT=30000
VITE_MAX_RETRIES=3
```

---

## 📦 Scripts

### Development

```bash
# Start Vite dev server
npm run dev

# Start mock backend (in another terminal)
npm run server:node

# Start both together
npm run dev:all
```

### Production Build

```bash
npm run build
npm run preview
```

### Testing

```bash
npm run test
npm run test:ui
npm run test:coverage
```

### Code Quality

```bash
npm run lint
npm run lint -- --fix
```

---

## 🎯 User Flows

### Student Exam Flow

```
1. Login
   ↓
2. View available exams
   ↓
3. Click "Start Exam"
   ↓
4. Answer questions (record audio)
   ↓
5. Submit answers
   ↓
6. View results & feedback
```

### Teacher Management

```
1. Login to teacher dashboard
   ↓
2. Create new exam
   ↓
3. Add questions
   ↓
4. Set exam parameters
   ↓
5. Publish exam
   ↓
6. Monitor submissions
   ↓
7. View analytics
```

---

## 🔌 API Integration

### Services

**Authentication Service**

```javascript
export const authService = {
  login: (email, password, captchaToken) =>
    api.post("/auth/login", { email, password, captchaToken }),

  register: (userData) => api.post("/auth/register", userData),

  logout: () => api.post("/auth/logout"),

  refreshToken: () => api.post("/auth/refresh-token"),
};
```

**Exam Service**

```javascript
export const examService = {
  getAvailableExams: () => api.get("/exams/available"),

  getExamDetails: (examId) => api.get(`/exams/${examId}`),

  startExamAttempt: (examId) => api.post(`/exams/${examId}/attempt`),

  submitAnswer: (attemptId, questionId, audioFile) =>
    api.post(
      "/answers",
      { attemptId, questionId, audioFile },
      { headers: { "Content-Type": "multipart/form-data" } }
    ),
};
```

---

## 🎨 Core Components

### AudioRecorder

Records student audio answers

```jsx
<AudioRecorder
  onRecordingComplete={handleAudioSubmit}
  maxDuration={300}
  minDuration={10}
  disabled={timeExpired}
/>
```

### ExamTimer

Countdown timer for exams

```jsx
<ExamTimer
  duration={60}
  onTimeExpired={handleTimeUp}
  onWarning={handleWarning}
/>
```

### HistoryTable

Displays exam results

```jsx
<HistoryTable
  attempts={examAttempts}
  onSelectAttempt={viewDetails}
  isLoading={loading}
/>
```

### QuestionCard

Individual question display

```jsx
<QuestionCard
  question={questionData}
  answer={studentAnswer}
  onAnswerChange={setAnswer}
  disabled={false}
/>
```

---

## 📊 State Management (Context API)

### AuthContext

```javascript
const { user, isAuthenticated, login, logout } = useAuth();
```

### ExamContext

```javascript
const { currentExam, questions, answers, submitAnswer } = useExam();
```

---

## 🧪 Testing

### Component Testing

```javascript
// test/components/ExamCard.test.jsx
import { render, screen } from "@testing-library/react";
import ExamCard from "../../components/ExamCard";

describe("ExamCard", () => {
  const mockExam = {
    _id: "1",
    title: "Math 101",
    duration: 60,
    status: "available",
  };

  it("should render exam details", () => {
    render(<ExamCard exam={mockExam} />);
    expect(screen.getByText("Math 101")).toBeInTheDocument();
  });
});
```

### Run Tests

```bash
npm run test
npm run test:ui
npm run test:coverage
```

---

## 🎨 Styling with Tailwind CSS

### Configuration

```javascript
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
        secondary: "#10b981",
      },
    },
  },
};
```

### Usage

```jsx
<button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg">
  Start Exam
</button>
```

---

## 📱 Responsive Design

Breakpoints:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {exams.map((exam) => (
    <ExamCard key={exam._id} exam={exam} />
  ))}
</div>
```

---

## 🚀 Build & Deployment

### Build

```bash
npm run build
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

### Deploy to Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to AWS S3

```bash
aws s3 sync dist/ s3://your-bucket-name
```

### Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔄 Environment Configuration

### Development

```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

### Production

```env
VITE_API_URL=https://api.examecho.com/api
VITE_NODE_ENV=production
```

---

## 📚 Key Dependencies

| Package            | Purpose         |
| ------------------ | --------------- |
| `react`            | UI framework    |
| `vite`             | Build tool      |
| `tailwindcss`      | CSS framework   |
| `axios`            | HTTP client     |
| `react-router-dom` | Routing         |
| `react-hook-form`  | Form management |
| `react-hot-toast`  | Notifications   |
| `framer-motion`    | Animations      |

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Module Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues

- Check `VITE_API_URL` in `.env`
- Ensure backend is running
- Check for CORS errors in console

### Build Fails

```bash
rm -rf .vite
npm install
npm run build
```

---

## 🔗 Related Documentation

- [Main Project README](../README.md)
- [Backend Setup](../backend/README.md)
- [FastAPI Setup](../backend/fastapi_backend/README.md)

---

## 📞 Support

- Check component documentation in code
- Report issues on GitHub
- Review component comments

---

**Last Updated**: March 2, 2026
