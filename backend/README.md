# Backend – STT/TTS Exam Portal (Interview/Viva System)

This is the backend for our **AI-assisted viva / interview exam portal**.

- Built with **Node.js + Express + MongoDB**
- Authentication with **JWT** (Teacher / Student / Admin)
- Teachers create exams & questions
- Students attempt exams
- Answers are evaluated automatically using **Google Gemini** (LLM)

---

## Tech Stack

- **Runtime**: Node.js (Express)
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (JSON Web Token)
- **AI Evaluation**: Google Gemini API (`@google/generative-ai`)
- **Other libs**:
  - `bcrypt` – password hashing
  - `svg-captcha` – login captcha
  - `multer` – JSON file upload for bulk questions
  - `dotenv` – environment variables

---

## Folder Structure

```text
backend/
├── server.js           # Entry point (starts Express server)
├── package.json
├── package-lock.json
├── questions.json      # Example bulk questions file (for import)
├── src/
│   ├── app.js          # Express app configuration
│   ├── config/
│   │   └── db.js       # MongoDB connection
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Exam.js
│   │   ├── Question.js
│   │   ├── StudentExamAttempt.js
│   │   └── StudentAnswer.js
│   ├── routes/
│   │   ├── authRoutes.js        # Register/login/captcha
│   │   ├── examRoutes.js        # Teacher exam & question APIs + results
│   │   └── studentExamRoutes.js # Student exam flow + AI evaluation + results
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── requireRole.js       # Role-based access (teacher/student/admin)
│   │   ├── errorHandler.js      # Central error handler
│   │   └── uploadJson.js        # Multer for JSON question import
│   ├── services/
│   │   └── evaluationService.js # Gemini-based AI answer evaluation
│   ├── utils/
│   │   ├── generateToken.js     # JWT creation helper
│   │   └── captchaStore.js      # In-memory captcha store
│   └── ...
└── .env                # NOT in Git – local config (Mongo URI, JWT secret, Gemini key)
