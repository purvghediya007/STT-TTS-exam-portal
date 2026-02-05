import React, { useState } from 'react';

// FacultyOverview (single-file) - uses only React and SVG / divs for charts
// No external chart libraries to avoid hook/context issues

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
};

// helper: generate polyline points for SVG line chart
function linePoints(data, width = 600, height = 260, padding = 20) {
  const max = Math.max(...data.map((d) => d.avg));
  const min = Math.min(...data.map((d) => d.avg));
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (data.length - 1);
  return data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y = padding + ((max - d.avg) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

// helper: create SVG arc path for pie slices
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'L', cx, cy, 'Z'].join(' ');
  return d;
}
function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(angleInRadians), y: cy + r * Math.sin(angleInRadians) };
}

const FacultyOverview = () => {
  // static data
  const summary = { totalStudents: 180, avgScore: 82, passRate: 89, exams: 6 };

  const trendData = [
    { exam: 'Exam 1', avg: 72 },
    { exam: 'Exam 2', avg: 75 },
    { exam: 'Exam 3', avg: 78 },
    { exam: 'Midterm', avg: 80 },
    { exam: 'Exam 4', avg: 82 },
    { exam: 'Final', avg: 85 },
  ];

  const examScores = [
    { name: 'Exam 1', score: 72 },
    { name: 'Exam 2', score: 75 },
    { name: 'Exam 3', score: 78 },
    { name: 'Midterm', score: 80 },
    { name: 'Exam 4', score: 82 },
    { name: 'Final', score: 85 },
  ];

  const distribution = [
    { name: 'Excellent', value: 28, color: COLORS.success },
    { name: 'Good', value: 45, color: COLORS.primary },
    { name: 'Average', value: 38, color: COLORS.accent },
    { name: 'Poor', value: 14, color: COLORS.danger },
  ];

  const passFail = { pass: 160, fail: 20 };

  // interaction state
  const [hover, setHover] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [selectedExam, setSelectedExam] = useState(null);

  // SVG sizes
  const svgWidth = 640;
  const svgHeight = 300;

  // compute pie slices
  const totalDist = distribution.reduce((s, d) => s + d.value, 0);
  let startAngle = 0;
  const slices = distribution.map((d) => {
    const angle = (d.value / totalDist) * 360;
    const slice = { ...d, startAngle, endAngle: startAngle + angle };
    startAngle += angle;
    return slice;
  });

  const maxScore = 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Department Overview Analytics</h1>
          <p className="text-gray-600 mt-2">Static demo of department-level performance. No external libraries used for charts.</p>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-bold">{summary.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-2xl font-bold">{summary.avgScore}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Overall Pass %</p>
            <p className="text-2xl font-bold">{summary.passRate}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Exams</p>
            <p className="text-2xl font-bold">{summary.exams}</p>
          </div>
        </section>

        {/* Charts grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line-style trend using SVG polyline */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Performance Trend</h2>
              <p className="text-sm text-gray-500">Average score across exams</p>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-72">
                {/* grid lines */}
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = ((100 - g) / 100) * (svgHeight - 40) + 20;
                  return <line key={g} x1={40} x2={svgWidth - 20} y1={y} y2={y} stroke="#e6e7eb" />;
                })}

                {/* labels on left */}
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = ((100 - g) / 100) * (svgHeight - 40) + 20;
                  return (
                    <text key={g} x={10} y={y + 4} fontSize={12} fill="#6b7280">{g}</text>
                  );
                })}

                {/* polyline path */}
                <polyline
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  points={linePoints(trendData, svgWidth - 60, svgHeight - 40, 20)}
                />

                {/* points and interactive hover */}
                {trendData.map((d, i) => {
                  const pts = linePoints(trendData, svgWidth - 60, svgHeight - 40, 20).split(' ');
                  const [xStr, yStr] = pts[i].split(',');
                  const cx = parseFloat(xStr) + 40; // shift right for left labels
                  const cy = parseFloat(yStr) + 20;
                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#fff"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        onMouseEnter={(e) => setHover({ visible: true, x: e.clientX, y: e.clientY, text: `${d.exam}: ${d.avg}%` })}
                        onMouseLeave={() => setHover({ visible: false, x: 0, y: 0, text: '' })}
                      />
                      <text x={cx - 20} y={cy - 12} fontSize={12} fill="#374151">{d.exam}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Exam-wise bar chart (div based) */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Exam-wise Performance</h2>
              <p className="text-sm text-gray-500">Average score per exam</p>
            </div>

            <div className="space-y-3">
              {examScores.map((e) => {
                const pct = (e.score / maxScore) * 100;
                return (
                  <div key={e.name} className="flex items-center gap-4">
                    <div className="w-28 text-sm text-gray-700">{e.name}</div>
                    <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden" onMouseEnter={(ev) => setHover({ visible: true, x: ev.clientX, y: ev.clientY, text: `${e.name}: ${e.score}%` })} onMouseLeave={() => setHover({ visible: false, x: 0, y: 0, text: '' })}>
                      <div className="h-6" style={{ width: `${pct}%`, background: COLORS.primary }} />
                    </div>
                    <div className="w-12 text-right font-medium">{e.score}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Distribution & Pass/Fail */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Pie chart built with SVG arcs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Performance Distribution</h3>
            <div className="flex items-center gap-6">
              <svg width={260} height={260} viewBox="0 0 260 260">
                <defs />
                {slices.map((s, idx) => (
                  <path key={s.name} d={describeArc(130, 130, 80, s.startAngle, s.endAngle)} fill={s.color} stroke="#fff" strokeWidth={2} onMouseEnter={(ev) => setHover({ visible: true, x: ev.clientX, y: ev.clientY, text: `${s.name}: ${s.value}` })} onMouseLeave={() => setHover({ visible: false, x: 0, y: 0, text: '' })} />
                ))}
                {/* center label */}
                <circle cx={130} cy={130} r={45} fill="#fff" />
                <text x={130} y={130} textAnchor="middle" dy={6} fontSize={14} fill="#374151">Distribution</text>
              </svg>

              <div className="space-y-2">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm text-gray-700">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pass vs Fail */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3">Pass vs Fail Overview</h3>
            <div className="mb-3 text-sm text-gray-700">Overall pass/fail counts</div>
            <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden mb-3">
              <div style={{ width: `${(passFail.pass / (passFail.pass + passFail.fail)) * 100}%`, height: '100%', background: COLORS.success }} />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.success }} /> <span className="text-sm">Pass: {passFail.pass}</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.danger }} /> <span className="text-sm">Fail: {passFail.fail}</span></div>
            </div>
          </div>
        </section>

        {/* tooltip */}
        {hover.visible && (
          <div style={{ position: 'fixed', left: hover.x + 12, top: hover.y + 12, background: '#111827', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, zIndex: 60 }}>
            {hover.text}
          </div>
        )}

        <footer className="mt-8 text-sm text-gray-500">All data shown is static demo data for the department overview.</footer>
      </div>
    </div>
  );
};

export default FacultyOverview;
