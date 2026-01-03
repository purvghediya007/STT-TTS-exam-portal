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
    <div className="p-4">

      {/* ---------- HEADER: SEARCH + SORT ---------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full sm:w-64 border-[0.5px] border-blue-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white"
          />
        </div>

        {/* Sort Menu */}
        <div className="relative inline-flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              if (e.target.value !== "subject") {
                setShowSubjectMenu(false);
              }
            }}
            className="flex-1 sm:flex-none px-3 py-2 border-[0.5px] border-blue-200 rounded-lg text-sm cursor-pointer focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white"
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
              className="px-3 py-2 text-sm border-[0.5px] border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            >
              Choose subject
            </button>
          )}

          {/* Subject dropdown menu - opens on click for easy selection */}
          {sortBy === "subject" && showSubjectMenu && (
            <div className="absolute top-full right-0 mt-2 z-50">
              <div className="bg-white border-[0.5px] border-blue-200 rounded-lg shadow-lg p-2 w-56 max-h-64 overflow-auto">
                <div className="text-xs font-semibold text-blue-700 uppercase mb-2 px-2">Filter by Subject</div>
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
                        className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded mt-1 font-medium"
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
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left border-b border-blue-100 text-xs text-blue-700 uppercase bg-blue-50/50">
              <th className="py-2.5 px-3 font-semibold">Sr</th>
              <th className="py-2.5 px-3 font-semibold">
                <div className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Exam Name
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">Subject</th>
              <th className="py-2.5 px-3 font-semibold">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Date / Time Taken
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
              <th className="py-2.5 px-3 font-semibold">
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Result
                </div>
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">Analysis</th>
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
                <tr key={ex.id} className="border-b border-blue-50 hover:bg-blue-50/30 text-sm transition-colors">
                  <td className="py-3 px-3 text-gray-600 font-medium" data-label="Sr">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-3 font-medium text-gray-900" data-label="Exam Name">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className="line-clamp-2">{ex.title}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-gray-700" data-label="Subject">
                    {ex.subject}
                  </td>

                  <td className="py-3 px-3" data-label="Date / Time Taken">
                    <div className="flex flex-col leading-snug">
                      <span className="font-medium text-gray-900">{dateLabel}</span>
                      <span className="text-xs text-gray-500">Time taken: {timeTakenLabel}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3" data-label="Status">
                    {status === 'Submitted' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Submitted
                      </span>
                    )}
                    {status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                    {status === 'Absent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold">
                        <XCircle className="w-3 h-3" />
                        Absent
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3" data-label="Result">
                    {score != null ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-md border border-blue-200">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs font-bold text-blue-700">
                            {score}
                          </span>
                          {maxScore && (
                            <span className="text-[10px] text-blue-600 font-medium">
                              /{maxScore}
                            </span>
                          )}
                        </div>
                        <div className="h-3 w-[1px] bg-blue-300"></div>
                        <div className="flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5 text-blue-600" />
                          <span className="text-[9px] text-blue-600 font-semibold">pts</span>
                        </div>
                        {percentage != null && (
                          <>
                            <div className="h-3 w-[1px] bg-blue-300"></div>
                            <span className="text-[10px] font-bold text-blue-700">{percentage}%</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right" data-label="Analysis">
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
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${score != null
                          ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer shadow-sm hover:shadow-md'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                      title={score != null ? 'View exam results' : 'Results not available yet'}
                    >
                      <Eye className="w-3.5 h-3.5" />
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
        <div className="text-center py-12 px-4">
          <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-gray-700 text-base font-semibold mb-2">No exam history found</p>
          <p className="text-gray-500 text-sm">
            {search || subjectFilter
              ? "Try adjusting your search or filter criteria"
              : "Complete your first exam to see it here"}
          </p>
        </div>
      )}
    </div>
  );
}
