import React, { useState } from 'react';

// Semester-wise Analytics (single-file)
// - Frontend-only, static demo data
// - Uses only React + useState + SVG/divs for charts
// - No external chart libraries, no context, no extra hooks

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
};

// helper: compute polyline points for an array of numeric scores
function computeLinePoints(values, width = 560, height = 220, padding = 30) {
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

const FacultySemester = () => {
  // static dataset per semester
  const data = {
    '3rd': {
      name: '3rd Semester',
      total: 45,
      passed: 40,
      failed: 5,
      avg: 78,
      exams: [
        { exam: 'Quiz 1', score: 70 },
        { exam: 'Quiz 2', score: 74 },
        { exam: 'Midterm', score: 80 },
        { exam: 'Quiz 3', score: 77 },
        { exam: 'End', score: 84 },
      ],
      distribution: { excellent: 8, good: 20, average: 12, poor: 5 },
    },
    '4th': {
      name: '4th Semester',
      total: 42,
      passed: 38,
      failed: 4,
      avg: 81,
      exams: [
        { exam: 'Quiz 1', score: 72 },
        { exam: 'Quiz 2', score: 76 },
        { exam: 'Midterm', score: 82 },
        { exam: 'Quiz 3', score: 80 },
        { exam: 'End', score: 86 },
      ],
      distribution: { excellent: 10, good: 18, average: 12, poor: 2 },
    },
    '5th': {
      name: '5th Semester',
      total: 38,
      passed: 34,
      failed: 4,
      avg: 79,
      exams: [
        { exam: 'Quiz 1', score: 68 },
        { exam: 'Quiz 2', score: 73 },
        { exam: 'Midterm', score: 78 },
        { exam: 'Quiz 3', score: 80 },
        { exam: 'End', score: 85 },
      ],
      distribution: { excellent: 6, good: 20, average: 10, poor: 2 },
    },
  };

  const semesters = ['3rd', '4th', '5th'];
  const [selected, setSelected] = useState('3rd');
  const [hover, setHover] = useState({ visible: false, x: 0, y: 0, text: '' });

  const active = data[selected];

  // derived values
  const passPct = Math.round((active.passed / active.total) * 100);
  const failPct = Math.round((active.failed / active.total) * 100);
  const distTotal = Object.values(active.distribution).reduce((s, v) => s + v, 0) || 1;

  // line chart points
  const scores = active.exams.map((e) => e.score);
  const polypoints = computeLinePoints(scores, 560, 220, 30);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Semester-wise Student Analysis</h1>
          <p className="text-gray-600 mt-1">Analyze semester performance: exams, pass/fail, and distribution for the selected semester.</p>
        </header>

        {/* Semester Selector */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-sm text-gray-700">Select Semester:</span>
          <div className="inline-flex rounded-md bg-white shadow-sm">
            {semesters.map((s) => (
              <button
                key={s}
                onClick={() => setSelected(s)}
                className={`px-3 py-2 text-sm font-medium ${selected === s ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
              >
                {data[s].name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-semibold">{active.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Pass %</p>
            <p className="text-2xl font-semibold text-green-600">{passPct}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Fail %</p>
            <p className="text-2xl font-semibold text-red-600">{failPct}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Avg Score</p>
            <p className="text-2xl font-semibold">{active.avg}%</p>
          </div>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance trend (SVG line) */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Semester Performance Trend</h2>
              <p className="text-sm text-gray-500">Scores across exams</p>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 600 260`} className="w-full h-64">
                {/* grid lines */}
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = ((100 - g) / 100) * (220) + 20;
                  return <line key={g} x1={40} x2={560} y1={y} y2={y} stroke="#eef2f7" />;
                })}

                {/* labels left */}
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = ((100 - g) / 100) * (220) + 24;
                  return (
                    <text key={g} x={10} y={y} fontSize={12} fill="#6b7280">{g}</text>
                  );
                })}

                {/* polyline */}
                <polyline fill="none" stroke={COLORS.primary} strokeWidth={3} points={polypoints} />

                {/* points and labels */}
                {active.exams.map((ex, i) => {
                  const pts = polypoints.split(' ');
                  const [xStr, yStr] = pts[i].split(',');
                  const cx = parseFloat(xStr) + 40; // shift because of left labels
                  const cy = parseFloat(yStr) + 20;
                  return (
                    <g key={ex.exam}>
                      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={COLORS.primary} strokeWidth={2} onMouseEnter={(ev) => setHover({ visible: true, x: ev.clientX, y: ev.clientY, text: `${ex.exam}: ${ex.score}%` })} onMouseLeave={() => setHover({ visible: false, x: 0, y: 0, text: '' })} />
                      <text x={cx - 20} y={cy - 10} fontSize={11} fill="#374151">{ex.exam}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Pass vs Fail & Distribution */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-3">Pass vs Fail & Distribution</h2>

            {/* Pass vs Fail bar */}
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Pass vs Fail</div>
              <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                <div style={{ width: `${passPct}%`, background: COLORS.success, height: '100%' }} />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.success }} /> <span>Pass {active.passed}</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.danger }} /> <span>Fail {active.failed}</span></div>
              </div>
            </div>

            {/* Distribution segmented bar */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Performance Distribution</div>
              <div className="w-full bg-gray-100 rounded h-6 overflow-hidden flex items-stretch">
                {Object.entries(active.distribution).map(([k, v]) => {
                  const pct = Math.round((v / distTotal) * 100);
                  const color = k === 'excellent' ? COLORS.success : k === 'good' ? COLORS.primary : k === 'average' ? COLORS.accent : COLORS.danger;
                  return <div key={k} style={{ width: `${pct}%`, background: color, height: '100%' }} title={`${k}: ${v} (${pct}%)`} />;
                })}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(active.distribution).map(([k, v]) => {
                  const color = k === 'excellent' ? COLORS.success : k === 'good' ? COLORS.primary : k === 'average' ? COLORS.accent : COLORS.danger;
                  const pct = Math.round((v / distTotal) * 100);
                  return (
                    <div key={k} className="flex items-center gap-3 text-sm">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
                      <div>
                        <div className="capitalize">{k}</div>
                        <div className="text-xs text-gray-600">{v} students • {pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* tooltip */}
        {hover.visible && (
          <div style={{ position: 'fixed', left: hover.x + 12, top: hover.y + 12, background: '#111827', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, zIndex: 60 }}>
            {hover.text}
          </div>
        )}

        <footer className="mt-6 text-sm text-gray-500">All data is static demo data for semester analytics.</footer>
      </div>
    </div>
  );
};

export default FacultySemester;
