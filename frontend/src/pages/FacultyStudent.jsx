import React, { useState } from 'react';

// Individual Student Analytics - single-file static demo
// - Uses only useState for interactions
// - Visuals built with SVG and divs, no chart libraries

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
};

// helper for line chart points
function computeLinePoints(values, width = 520, height = 200, padding = 30) {
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + ((max - v) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

const FacultyStudent = () => {
  // static student dataset (per semester) with exam scores
  const students = [
    {
      id: 'ENR001',
      name: 'Aarav Singh',
      semesters: {
        '3rd': { avg: 82, passed: true, exams: [{ exam: 'Quiz1', score: 78 }, { exam: 'Mid', score: 84 }, { exam: 'End', score: 84 }] },
        '4th': { avg: 85, passed: true, exams: [{ exam: 'Quiz1', score: 80 }, { exam: 'Mid', score: 86 }, { exam: 'End', score: 89 }] },
      },
    },
    {
      id: 'ENR002',
      name: 'Priya Sharma',
      semesters: {
        '3rd': { avg: 91, passed: true, exams: [{ exam: 'Quiz1', score: 90 }, { exam: 'Mid', score: 92 }, { exam: 'End', score: 91 }] },
        '4th': { avg: 88, passed: true, exams: [{ exam: 'Quiz1', score: 85 }, { exam: 'Mid', score: 90 }, { exam: 'End', score: 89 }] },
      },
    },
    {
      id: 'ENR003',
      name: 'Rohit Patel',
      semesters: {
        '3rd': { avg: 76, passed: true, exams: [{ exam: 'Quiz1', score: 72 }, { exam: 'Mid', score: 78 }, { exam: 'End', score: 78 }] },
        '4th': { avg: 74, passed: true, exams: [{ exam: 'Quiz1', score: 70 }, { exam: 'Mid', score: 76 }, { exam: 'End', score: 76 }] },
      },
    },
  ];

  const semesters = ['3rd', '4th'];
  const [query, setQuery] = useState(''); // mock search
  const [selectedSemester, setSelectedSemester] = useState('3rd');
  const [selectedId, setSelectedId] = useState(students[0].id);

  // filtered list based on search query
  const filtered = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase()));
  const active = students.find((s) => s.id === selectedId) || filtered[0] || students[0];
  const semData = active.semesters[selectedSemester];

  // derive metrics
  const overallAvg = semData.avg;
  const passStatus = semData.passed ? 'Passed' : 'Failed';
  // determine trend (simple: compare last two exams)
  const scores = semData.exams.map((e) => e.score);
  const trend = scores.length >= 2 ? (scores[scores.length - 1] > scores[scores.length - 2] ? 'improving' : scores[scores.length - 1] < scores[scores.length - 2] ? 'declining' : 'stable') : 'stable';

  const linePoints = computeLinePoints(scores, 520, 200, 30);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Individual Student Performance Analysis</h1>
          <p className="text-gray-600 mt-1">Search and inspect a student's exam performance, strengths and weaknesses.</p>
        </header>

        {/* Controls: search + semester */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input aria-label="Search student" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or enrollment" className="px-3 py-2 rounded border w-full sm:w-64" />
            <button className="ml-2 px-3 py-2 bg-white border rounded" onClick={() => { if (filtered[0]) setSelectedId(filtered[0].id); }}>Select</button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Semester:</span>
            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="px-3 py-2 border rounded bg-white">
              {semesters.map((s) => (
                <option key={s} value={s}>{s} Semester</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student list */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Students</h3>
            <ul className="space-y-2">
              {filtered.map((s) => (
                <li key={s.id} className={`p-2 rounded cursor-pointer ${s.id === selectedId ? 'bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => setSelectedId(s.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-sm text-gray-600">{s.id}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{s.semesters[selectedSemester].avg}%</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary metrics */}
          <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{active.name} <span className="text-sm text-gray-500">({active.id})</span></h2>
                <div className="text-sm text-gray-600">Semester: {selectedSemester} • Status: <span className={`font-semibold ${semData.passed ? 'text-green-600' : 'text-red-600'}`}>{passStatus}</span></div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Overall Avg</div>
                <div className="text-2xl font-bold">{overallAvg}%</div>
                <div className="text-sm text-gray-600">Trend: <span className={`font-semibold ${trend === 'improving' ? 'text-green-600' : trend === 'declining' ? 'text-red-600' : 'text-gray-700'}`}>{trend}</span></div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Overall performance comparison */}
            <div className="mb-5">
              <div className="text-sm text-gray-600 mb-2">Performance vs Class Average</div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded h-6 overflow-hidden">
                    {/* student bar */}
                    <div style={{ width: `${overallAvg}%`, height: '100%', background: COLORS.primary }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Student: {overallAvg}%</div>
                </div>
                <div style={{ width: 120 }}>
                  <div className="w-full bg-gray-100 rounded h-6 overflow-hidden">
                    <div style={{ width: `80%`, height: '100%', background: '#c7d2fe' }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Class Avg: 80%</div>
                </div>
              </div>
            </div>

            {/* Exam-wise performance (SVG line) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold">Exam-wise Performance</h4>
                <div className="text-sm text-gray-500">Scores across exams</div>
              </div>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 560 220`} className="w-full h-52">
                  {/* grid lines */}
                  {[0, 25, 50, 75, 100].map((g) => {
                    const y = ((100 - g) / 100) * (180) + 20;
                    return <line key={g} x1={30} x2={520} y1={y} y2={y} stroke="#eef2f7" />;
                  })}

                  {/* polyline */}
                  <polyline fill="none" stroke={COLORS.primary} strokeWidth={3} points={linePoints} />

                  {/* points */}
                  {semData.exams.map((ex, i) => {
                    const pts = linePoints.split(' ');
                    const [xStr, yStr] = pts[i].split(',');
                    const cx = parseFloat(xStr) + 30;
                    const cy = parseFloat(yStr) + 20;
                    return (
                      <g key={ex.exam}>
                        <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={COLORS.primary} strokeWidth={2} />
                        <text x={cx - 18} y={cy - 10} fontSize={11} fill="#374151">{ex.exam}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600 mb-2">Strengths</div>
                  <ul className="list-disc list-inside text-sm text-green-700">
                    {semData.exams.filter((e) => e.score >= 85).map((e) => <li key={e.exam}>{e.exam} — {e.score}%</li>)}
                    {semData.exams.filter((e) => e.score >= 85).length === 0 && <li className="text-gray-600">No standout strengths</li>}
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600 mb-2">Weaknesses</div>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {semData.exams.filter((e) => e.score < 75).map((e) => <li key={e.exam}>{e.exam} — {e.score}%</li>)}
                    {semData.exams.filter((e) => e.score < 75).length === 0 && <li className="text-gray-600">No weak areas</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyStudent;
