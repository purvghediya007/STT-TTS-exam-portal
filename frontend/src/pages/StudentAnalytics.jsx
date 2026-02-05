import { useEffect, useState } from "react";
import ExamChart from "../components/ExamChart";
import TypeChart from "../components/TypeChart";
import api from "../api/axiosInstance";

export default function StudentAnalytics({ studentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    setData(null);
    setError(null);
    setLoading(true);

    api
      .get(`/analytics/student/${studentId}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setError(err.response?.data || err.message || "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex justify-center items-center h-96"><p className="text-gray-500 text-lg">Loading analytics...</p></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><zp className="text-red-700">Error: {String(error)}</zp></div>;
  if (!data) return <p className="text-gray-500">No data available</p>;

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Performance Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <ExamChart data={data.examWise} />
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <TypeChart data={data.typeWise} />
        </div>
      </div>
    </div>
  );
}
