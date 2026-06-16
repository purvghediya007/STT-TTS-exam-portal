import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PracticeResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { results } = location.state || {};

  if (!results) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">No results found.</p>
        <button onClick={() => navigate('/student/practice')} className="text-blue-600 font-medium hover:underline">Go to Practice Hub</button>
      </div>
    );
  }

  const { score, totalMarks, accuracy, correctCount, attemptedCount, totalQuestions, answers, questions, type } = results;
  const isSpoken = type === 'technical_spoken';

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/student/practice')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Practice Hub
      </button>

      {/* Score Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8 mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Practice Results</h1>
        <div className="flex flex-wrap justify-center gap-8 mb-6">
          <div>
            <p className="text-5xl font-bold text-blue-600">{score}<span className="text-2xl text-gray-400">/{totalMarks}</span></p>
            <p className="text-sm text-gray-500 mt-1">Score</p>
          </div>
          <div>
            <p className="text-5xl font-bold text-green-600">{accuracy}%</p>
            <p className="text-sm text-gray-500 mt-1">Accuracy</p>
          </div>
          <div>
            <p className="text-5xl font-bold text-purple-600">{attemptedCount}<span className="text-2xl text-gray-400">/{totalQuestions}</span></p>
            <p className="text-sm text-gray-500 mt-1">Attempted</p>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/student/practice')} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300">Back to Hub</button>
          <button onClick={() => navigate(-2)} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Try Again</button>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Question-wise Breakdown</h2>
      <div className="space-y-4">
        {answers?.map((ans, idx) => {
          const q = questions?.find(q => q._id === ans.questionId) || questions?.[idx];
          if (!q) return null;

          return (
            <div key={idx} className={`bg-white rounded-xl border shadow-sm p-5 ${ans.isCorrect ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-start gap-3 mb-3">
                {ans.isCorrect
                  ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  : <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Q{idx + 1}: {q.question}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Marks: {ans.marksAwarded || 0}/{q.marks || 1}
                    {isSpoken && ans.spokenScore !== null && ` • AI Score: ${ans.spokenScore}/${q.marks || 5}`}
                  </p>
                </div>
              </div>

              {/* MCQ details */}
              {!isSpoken && q.options && (
                <div className="ml-8 space-y-1 text-sm">
                  {q.options.map((opt, i) => (
                    <p key={i} className={`px-3 py-1 rounded ${
                      i === q.correctAnswer ? 'bg-green-50 text-green-800 font-medium' :
                      i === ans.selectedOption && !ans.isCorrect ? 'bg-red-50 text-red-800' : 'text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + i)}. {opt.text}
                      {i === q.correctAnswer && ' ✓'}
                      {i === ans.selectedOption && i !== q.correctAnswer && ' ✗ (Your answer)'}
                    </p>
                  ))}
                </div>
              )}

              {/* Spoken details */}
              {isSpoken && (
                <div className="ml-8 space-y-2 text-sm">
                  {ans.transcript && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Your Transcript:</p>
                      <p className="text-gray-800">{ans.transcript}</p>
                    </div>
                  )}
                  {ans.spokenFeedback && (
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs font-medium text-blue-600 mb-1">AI Feedback:</p>
                      <p className="text-gray-800">{ans.spokenFeedback}</p>
                    </div>
                  )}
                  {ans.keyPointsCovered?.length > 0 && (
                    <div className="text-green-700">
                      <p className="text-xs font-medium">Key Points Covered:</p>
                      <ul className="list-disc ml-4">{ans.keyPointsCovered.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {ans.explanation && (
                <div className="ml-8 mt-2 p-3 bg-yellow-50 rounded text-sm">
                  <p className="text-xs font-medium text-yellow-700 mb-1">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {isSpoken ? 'Suggestion' : 'Explanation'}:
                  </p>
                  <p className="text-gray-700">{ans.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
