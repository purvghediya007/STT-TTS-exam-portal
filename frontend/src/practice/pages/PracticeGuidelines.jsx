import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Mic, Clock, Shield, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PracticeGuidelines() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate('/student/practice')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Practice Hub
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Practice Hub — Guidelines & Information</h1>
      <p className="text-gray-500 mb-8">Everything you need to know for the best practice experience.</p>

      <div className="space-y-6">
        {/* System Requirements */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">System Requirements</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> <span><strong>Browser:</strong> Google Chrome or Microsoft Edge (latest version recommended)</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> <span><strong>Internet:</strong> Stable connection required for audio upload and AI evaluation</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> <span><strong>Microphone:</strong> Required for Spoken Interview mode — allow permission when prompted</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> <span><strong>Headphones:</strong> Recommended for "Listen Question" (TTS) feature</span></li>
          </ul>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-bold text-gray-900">How Practice Hub Works</h2>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-1">📖 Aptitude — Learning Mode</h3>
              <p>Study topics with clear theory, important formulas, step-by-step solved examples, and shortcut tricks. Browse topics from the sidebar and learn at your own pace.</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-1">📝 Aptitude — Practice Mode</h3>
              <p>Take timed MCQ tests. Select a topic (or "Mixed"), choose question count, and the timer is set automatically. Submit to see your score and detailed explanations.</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-1">💻 Technical — MCQ Mode</h3>
              <p>Test your Computer Science knowledge — DBMS, OS, Networks, and DSA. Timed tests with instant evaluation and explanations.</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-1">🎤 Technical — Spoken Interview Mode</h3>
              <p>Practice interview-style questions by recording audio answers. AI (Gemini) evaluates your response for correctness, completeness, clarity, and depth. Real-time transcription captures your speech.</p>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Rules & Behavior</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> Timer starts when you begin — manage your time wisely</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> MCQ: Select one option per question; you can change your answer before submitting</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> <strong>Spoken Mode: Maximum 2 re-records per question</strong> — this is server-enforced and cannot be changed</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> Audio is saved automatically when you click "Next Question" — you will NOT lose data if your connection drops</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> If you get disconnected, you can resume your session from where you left off</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> Tab switching shows warnings in practice mode (no auto-submit like real exams)</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> Auto-submit triggers when the timer reaches zero</li>
            <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /> Results are shown immediately after submission with detailed explanations</li>
          </ul>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Tips for Better Experience</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>🎧 Use headphones for the "Listen Question" feature for clear audio</li>
            <li>🎤 Speak clearly and at a moderate pace for spoken answers — the transcription quality depends on it</li>
            <li>📋 Review all questions before submitting using the Question Panel</li>
            <li>🚩 Use "Mark for Review" to flag uncertain answers and come back to them</li>
            <li>📖 Study the Learning Mode content before attempting Practice tests</li>
            <li>🔄 Practice regularly — track your improvement across sessions</li>
            <li>⏱️ For aptitude: ~1.5 minutes per MCQ. For spoken: ~3 minutes per question</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
