export default function ExamChart({ data = [] }) {
  const getColorForPercentage = (percentage) => {
    if (percentage >= 80) return "from-green-400 to-green-600";
    if (percentage >= 60) return "from-blue-400 to-blue-600";
    if (percentage >= 40) return "from-yellow-400 to-yellow-600";
    return "from-red-400 to-red-600";
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 80) return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Excellent</span>;
    if (percentage >= 60) return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Good</span>;
    if (percentage >= 40) return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Fair</span>;
    return <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Needs Work</span>;
  };

  return (
    <section className="w-full">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">📊 Exam Performance</h3>
      <div className="space-y-4">
        {data.length > 0 ? (
          data.map((d, i) => {
            const percentage = d.percentage ?? 0;
            return (
              <div key={i} className="hover:bg-gray-50 p-3 rounded-lg transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-700">{d.examName || `Exam ${i + 1}`}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-indigo-600">{Math.round(percentage)}%</span>
                    {getStatusBadge(percentage)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getColorForPercentage(percentage)} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center py-4">No exam data available yet</p>
        )}
      </div>
    </section>
  );
}
