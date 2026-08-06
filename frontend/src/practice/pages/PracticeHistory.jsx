import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Flame, Clock, Award, BarChart3, Loader2 } from 'lucide-react';
import { getHistory } from '../services/practiceApi';
import logger from '../../utils/logger';

const TYPE_LABELS = {
  aptitude: 'Aptitude',
  technical_mcq: 'Technical MCQ',
  technical_spoken: 'Spoken Interview',
};

const TYPE_COLORS = {
  aptitude: { bg: 'bg-blue-100', text: 'text-blue-700', bar: '#3b82f6' },
  technical_mcq: { bg: 'bg-green-100', text: 'text-green-700', bar: '#22c55e' },
  technical_spoken: { bg: 'bg-purple-100', text: 'text-purple-700', bar: '#a855f7' },
};

function TrendBadge({ trend }) {
  if (trend === null || trend === undefined) return null;
  if (trend > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" /> +{trend}%
    </span>
  );
  if (trend < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" /> {trend}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

// Simple SVG line chart
function ScoreChart({ sessions }) {
  if (!sessions || sessions.length < 2) return null;

  const data = [...sessions].reverse().slice(-15); // last 15 sessions, oldest first
  const maxScore = Math.max(...data.map((s) => (s.totalMarks > 0 ? (s.score / s.totalMarks) * 100 : 0)), 100);
  const w = 600;
  const h = 200;
  const padX = 40;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = data.map((s, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const pct = s.totalMarks > 0 ? (s.score / s.totalMarks) * 100 : 0;
    const y = padY + chartH - (pct / maxScore) * chartH;
    return { x, y, pct, s };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-500" /> Score Trend (Last {data.length} Sessions)
      </h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[600px]" style={{ minWidth: 300 }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padY + chartH - (pct / maxScore) * chartH;
            return (
              <g key={pct}>
                <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x={padX - 5} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{pct}%</text>
              </g>
            );
          })}
          {/* Area fill */}
          <path d={areaPath} fill="url(#gradient)" opacity="0.3" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
          ))}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// Category breakdown bars
function CategoryBreakdown({ stats }) {
  const categories = Object.entries(stats);
  if (categories.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Performance</h3>
      <div className="space-y-4">
        {categories.map(([type, data]) => {
          const pct = data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0;
          const colors = TYPE_COLORS[type] || TYPE_COLORS.aptitude;
          return (
            <div key={type}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium ${colors.text}`}>{TYPE_LABELS[type] || type}</span>
                <span className="text-sm text-gray-500">{pct}% avg · {data.sessions} sessions</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PracticeHistory() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((res) => setData(res.data))
      .catch((e) => logger.error('Failed to load history:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div>
        <button onClick={() => navigate('/student/practice')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4 text-sm font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Practice Hub
        </button>
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Practice History Yet</h2>
          <p className="text-gray-500 mb-6">Complete your first practice session to see your progress here.</p>
          <button onClick={() => navigate('/student/practice')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Start Practicing
          </button>
        </div>
      </div>
    );
  }

  const { sessions, categoryStats, streak } = data;

  // Summary stats
  const totalScore = sessions.reduce((s, x) => s + (x.score || 0), 0);
  const totalMarks = sessions.reduce((s, x) => s + (x.totalMarks || 0), 0);
  const avgPct = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
  const latestTrend = sessions.length > 0 ? sessions[0].trend : null;

  return (
    <div>
      <button onClick={() => navigate('/student/practice')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4 text-sm font-medium">
        <ChevronLeft className="w-4 h-4" /> Back to Practice Hub
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-500 mt-1">Track your practice performance over time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Sessions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{avgPct}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500 font-medium">Streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{streak} day{streak !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            {latestTrend > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            <span className="text-xs text-gray-500 font-medium">Latest Trend</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {latestTrend !== null ? `${latestTrend > 0 ? '+' : ''}${latestTrend}%` : '--'}
          </div>
        </div>
      </div>

      {/* Score Trend Chart */}
      <ScoreChart sessions={sessions} />

      {/* Category Breakdown */}
      <CategoryBreakdown stats={categoryStats} />

      {/* Session History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Session History</h3>
        <div className="space-y-3">
          {sessions.map((s) => {
            const pct = s.totalMarks > 0 ? Math.round((s.score / s.totalMarks) * 100) : 0;
            const colors = TYPE_COLORS[s.type] || TYPE_COLORS.aptitude;
            const date = new Date(s.completedAt);
            return (
              <div key={s.sessionId} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-xs font-bold ${colors.text}`}>{pct}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{TYPE_LABELS[s.type] || s.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {s.company || s.topic}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date.toLocaleDateString()}</span>
                    <span>{s.score}/{s.totalMarks} marks</span>
                    <span>{s.questionCount} Qs</span>
                  </div>
                </div>
                <TrendBadge trend={s.trend} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
