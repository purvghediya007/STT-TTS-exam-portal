import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosInstance";

export default function FacultyExamAttempts() {
  const { examId } = useParams();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 🔹 Fetch attempts
  const fetchAttempts = async () => {
    try {
      setLoading(true);

      const res = await api.get(
        `/exams/${examId}/attempts`
      );

      setAttempts(res.data.attempts || []);
    } catch (err) {
      console.error("Error fetching attempts:", err);
      alert("Failed to load attempts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [examId]);

  // 🔹 Reallow student
  const handleReallow = async (studentId) => {
    if (!window.confirm("Allow this student to reattempt?")) return;

    try {
      setProcessingId(studentId);

      await api.patch(
        `/exams/${examId}/reallow/${studentId}`
      );

      alert("Student reallowed successfully");

      fetchAttempts(); // refresh
    } catch (err) {
      console.error("Error reallowing:", err);
      alert("Failed to reallow student");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">
        Manage Attempts
      </h1>

      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Loading attempts...
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No students found
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {attempts.map((a) => (
                <tr key={a._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {a.studentId?.username || "N/A"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {a.studentId?.email || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        a.status === "submitted"
                          ? "bg-green-100 text-green-700"
                          : a.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : a.status === "reallowed"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        handleReallow(a.studentId._id)
                      }
                      disabled={processingId === a.studentId._id}
                      className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processingId === a.studentId._id
                        ? "Processing..."
                        : "Allow Reattempt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}