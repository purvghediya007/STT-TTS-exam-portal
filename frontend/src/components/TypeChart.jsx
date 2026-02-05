import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  mcq: "#3b82f6",
  viva: "#10b981",
  interview: "#f59e0b"
};

const ICONS = {
  mcq: "✓",
  viva: "🎤",
  interview: "💼"
};

export default function TypeChart({ data = [], activeType = null, onSelect = () => {} }) {
  const labelMap = { 
    mcq: 'MCQ', 
    viva: 'Viva Interview', 
    interview: 'Interview' 
  };

  // Filter to show only MCQ, Viva, and Interview types
  const filteredData = data.filter(t => ['mcq', 'viva', 'interview'].includes(t.type?.toLowerCase()));

  const getTrendIcon = (percentage) => {
    if (percentage >= 80) return "📈";
    if (percentage >= 60) return "→";
    return "📉";
  };

  return (
    <section className="w-full">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">🎯 Question Type Performance</h3>
      
      <div className="space-y-4">
        {filteredData.length > 0 ? (
          <>
            {/* Progress Bars */}
            <ul className="space-y-4">
              {filteredData.map((t, i) => {
                const pct = Math.max(0, Math.min(100, t.percentage || 0));
                const isActive = activeType && activeType === t.type;
                const label = labelMap[t.type] || (t.type ? `${t.type.charAt(0).toUpperCase()}${t.type.slice(1)}` : `Type ${i + 1}`);

                return (
                  <li
                    key={i}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-indigo-100 border-2 border-indigo-500' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                    onClick={() => onSelect(t.type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelect(t.type) }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{ICONS[t.type] || "📋"}</span>
                        <span className="font-semibold text-gray-700">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: COLORS[t.type] || "#6b7280" }}>
                          {Math.round(pct)}%
                        </span>
                        <span className="text-lg">{getTrendIcon(pct)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[t.type] || "#6b7280",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-gray-200">
              {filteredData.map((t, i) => (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">{labelMap[t.type]}</div>
                  <div className="text-lg font-bold" style={{ color: COLORS[t.type] }}>
                    {Math.round(t.percentage || 0)}%
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">No performance data available yet</p>
        )}
      </div>
    </section>
  );
}
