import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Clock, Award, Calendar, FileText, Eye, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/**
 * Extract subject name from exam title
 * Logic:
 *  - Take first 1–2 words
 *  - If matches known patterns, return them
 *  - Otherwise return first word
 */
function extractSubject(title = "") {
  if (!title) return "General";

  const words = title.split(" ");

  // Known multi-word subjects
  const knownSubjects = [
    "Computer Networks",
    "Operating Systems",
    "Data Structures",
    "Machine Learning",
    "Artificial Intelligence",
  ];

  const firstTwo = `${words[0]} ${words[1] || ""}`.trim();

  if (knownSubjects.includes(firstTwo)) return firstTwo;

  return words[0]; // fallback
}

/** Format duration with fallback */
function formatDuration(exam) {
  if (exam.timeTakenSec)
    return Math.floor(exam.timeTakenSec / 60) + " min";

  if (exam.durationMin)
    return exam.durationMin + " min";

  return "-";
}

export default function HistoryTable({ exams = [] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);

  // Attach subject to each exam
  const enriched = useMemo(() => {
    return exams.map((ex) => ({
      ...ex,
      subject: extractSubject(ex.title),
    }));
  }, [exams]);

  // Build list of unique subjects
  const subjects = [...new Set(enriched.map((e) => e.subject))];

  // Filter by search + subject filter
  const filtered = useMemo(() => {
    return enriched.filter((ex) => {
      const s = search.toLowerCase();
      const matchesSearch =
        ex.title.toLowerCase().includes(s) ||
        ex.subject.toLowerCase().includes(s);

      const matchesSubject =
        !subjectFilter || ex.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [enriched, search, subjectFilter]);

  // Sort results
  const sorted = useMemo(() => {
    const arr = [...filtered];

    switch (sortBy) {
      case "marks":
        return arr.sort((a, b) => {
          const sa =
            a.result?.score ??
            a.pointsAwarded ??
            a.totalScore ??
            0;
          const sb =
            b.result?.score ??
            b.pointsAwarded ??
            b.totalScore ??
            0;
          return sb - sa;
        });

      case "subject":
        return arr.sort((a, b) => a.subject.localeCompare(b.subject));

      case "duration":
        return arr.sort(
          (a, b) =>
            (a.timeTakenSec || a.durationMin || 0) -
            (b.timeTakenSec || b.durationMin || 0)
        );

      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title));

      default:
        return arr.sort((a, b) => {
          const da = a.endsAt ? new Date(a.endsAt).getTime() : 0;
          const db = b.endsAt ? new Date(b.endsAt).getTime() : 0;
          return db - da; // newest first
        });
    }
  }, [filtered, sortBy]);

  return (
    <div className="bg-white p-6 rounded-xl shadow border">

      {/* ---------- HEADER: SEARCH + SORT ---------- */}
      <div className="flex items-center justify-between mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort Menu */}
        <div className="relative inline-flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              if (e.target.value !== "subject") {
                setShowSubjectMenu(false);
              }
            }}
            className="px-4 py-2 border rounded-lg text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by: Date</option>
            <option value="marks">Sort by: Marks</option>
            <option value="subject">Sort by: Subject</option>
            <option value="duration">Sort by: Duration</option>
            <option value="title">Sort by: Exam Name</option>
          </select>

          {sortBy === "subject" && (
            <button
              type="button"
              onClick={() => setShowSubjectMenu((prev) => !prev)}
              className="px-3 py-2 text-sm border rounded-lg bg-white hover:bg-blue-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              Choose subject
            </button>
          )}

          {/* Subject dropdown menu - opens on click for easy selection */}
          {sortBy === "subject" && showSubjectMenu && (
            <div className="absolute top-full right-0 mt-2 z-50">
              <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-56 max-h-64 overflow-auto">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Filter by Subject</div>
                {subjects.length > 0 ? (
                  <>
                    {subjects.map((subj) => (
                      <button
                        key={subj}
                        className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-50 transition-colors ${subjectFilter === subj ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-700"
                          }`}
                        onClick={() => {
                          setSubjectFilter(subjectFilter === subj ? null : subj);
                          setShowSubjectMenu(false);
                        }}
                      >
                        {subj}
                      </button>
                    ))}
                    {subjectFilter && (
                      <button
                        onClick={() => {
                          setSubjectFilter(null);
                          setShowSubjectMenu(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded mt-1 font-medium"
                      >
                        Clear Filter
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No subjects available</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="overflow-x-auto table-responsive history-table-wrapper">
        <table className="min-w-full history-table">
          <thead>
            <tr className="text-left border-b text-xs text-slate-500 uppercase bg-gray-50">
              <th className="py-3 px-4 font-semibold">Sr</th>
              <th className="py-3 px-4 font-semibold">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Exam Name
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Subject</th>
              <th className="py-3 px-4 font-semibold">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date / Time Taken
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Result
                </div>
              </th>
              <th className="py-3 px-4 text-right font-semibold">Analysis</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((ex, idx) => {
              const endedAt = ex.endsAt ? new Date(ex.endsAt) : null
              const dateLabel = endedAt ? endedAt.toLocaleDateString() : '-'

              const score = ex.result?.score ?? ex.pointsAwarded ?? ex.totalScore ?? null
              const maxScore = ex.result?.maxScore ?? ex.totalScore ?? ex.pointsTotal ?? null
              const percentage = score != null && maxScore ? Math.round((score / maxScore) * 100) : null
              const timeTakenLabel = formatDuration(ex)

              const status = score != null
                ? 'Submitted'
                : endedAt
                  ? 'Pending'
                  : 'Absent'

              return (
                <tr key={ex.id} className="border-t hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4" data-label="Sr">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-4 font-medium" data-label="Exam Name">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span className="line-clamp-2">{ex.title}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4" data-label="Subject">
                    {ex.subject}
                  </td>

                  <td className="py-3 px-4" data-label="Date / Time Taken">
                    <div className="flex flex-col leading-snug">
                      <span className="font-medium text-gray-900">{dateLabel}</span>
                      <span className="text-xs text-gray-500">Time taken: {timeTakenLabel}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4" data-label="Status">
                    {status === 'Submitted' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Submitted
                      </span>
                    )}
                    {status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                    {status === 'Absent' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        <XCircle className="w-3 h-3" />
                        Absent
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4" data-label="Result">
                    {score != null ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          {score}{maxScore ? ` / ${maxScore}` : ''} pts
                        </span>
                        {percentage != null && (
                          <span className="text-xs text-gray-600">{percentage}%</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right" data-label="Analysis">
                    <button
                      onClick={() => {
                        if (score != null) {
                          navigate(`/student/exams/${ex.id}/results`, {
                            state: {
                              score: score,
                              maxScore: maxScore,
                              percentage: percentage
                            }
                          })
                        } else {
                          alert('Results are not available yet. Please wait for faculty to grade your submission.')
                        }
                      }}
                      disabled={score == null}
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${score != null
                          ? 'bg-slate-900 text-white hover:bg-slate-700 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      title={score != null ? 'View exam results' : 'Results not available yet'}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sorted.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">No exam history found</p>
          <p className="text-gray-400 text-sm">
            {search || subjectFilter
              ? "Try adjusting your search or filter criteria"
              : "Complete your first exam to see it here"}
          </p>
        </div>
      )}
    </div>
  );
}
