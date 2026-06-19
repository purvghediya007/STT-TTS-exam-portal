import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Loader2 } from 'lucide-react';
import { getTopics, startPractice } from '../services/practiceApi';

export default function AptitudePractice() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Dynamic question count calculation and clamping
  const maxQuestions = selectedTopic === 'mixed'
    ? topics.reduce((sum, t) => sum + (t.count || 0), 0)
    : (topics.find(t => t.topic === selectedTopic)?.count || 0);

  useEffect(() => {
    if (maxQuestions > 0 && questionCount > maxQuestions) {
      setQuestionCount(maxQuestions);
    }
  }, [selectedTopic, topics, maxQuestions]);


  useEffect(() => {
    getTopics().then(res => {
      setTopics(res.data?.aptitude || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const timeLimit = Math.ceil(questionCount * 1.5); // 1.5 min per question

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await startPractice({ type: 'aptitude', topic: selectedTopic, count: questionCount });
      if (res.success) {
        navigate('/student/practice/exam', { state: { session: res.data, type: 'aptitude' } });
      }
    } catch (e) {
      alert('Failed to start practice: ' + (e.response?.data?.message || e.message));
    }
    setStarting(false);
  };

  return (
    <div>
      <button onClick={() => navigate('/student/practice')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Practice Hub
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Aptitude — Practice Mode</h1>
      <p className="text-gray-500 mb-8">Configure your practice test and start when ready.</p>

      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
        {/* Topic Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Topic</label>
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="mixed">Mixed (All Topics)</option>
            {topics.map(t => (
              <option key={t.topic} value={t.topic}>{t.topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ({t.count} Qs)</option>
            ))}
          </select>
        </div>

        {/* Question Count Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-gray-700">Number of Questions</label>
            <span className="text-xs text-gray-500 font-medium">Total Questions Available: {maxQuestions}</span>
          </div>
          <input
            type="number"
            min={1}
            max={maxQuestions}
            value={questionCount}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setQuestionCount(Math.max(1, Math.min(val, maxQuestions)));
              } else if (e.target.value === '') {
                setQuestionCount('');
              }
            }}
            onBlur={() => {
              if (questionCount === '' || questionCount < 1) {
                setQuestionCount(Math.min(10, maxQuestions || 10));
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Enter 1 to ${maxQuestions}`}
          />
        </div>

        {/* Time Display */}
        <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">Time Limit: {timeLimit} minutes</p>
            <p className="text-xs text-blue-600">Auto-calculated at ~1.5 min per question</p>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {starting ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</> : <><Play className="w-5 h-5" /> Start Practice Test</>}
        </button>
      </div>
    </div>
  );
}
