import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Code2, Search, CheckCircle2, Loader2, Filter } from 'lucide-react';
import { getCodingProblems, getCodingTopics } from '../services/codingApi';
import logger from '../../utils/logger';

const DIFF_COLORS = {
  easy: 'text-green-600 bg-green-50',
  medium: 'text-amber-600 bg-amber-50',
  hard: 'text-red-600 bg-red-50',
};

export default function CodingProblemList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';

  const [problems, setProblems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: initialCategory,
    topic: '',
    difficulty: '',
  });

  useEffect(() => {
    Promise.all([
      getCodingProblems(filters),
      getCodingTopics().then((r) => r.data),
    ])
      .then(([problemsRes, topicsRes]) => {
        setProblems(problemsRes.data || []);
        setTopics(topicsRes.data || []);
      })
      .catch((err) => logger.error(err))
      .finally(() => setLoading(false));
  }, [filters]);

  const filteredProblems = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const topicsForCategory = filters.category
    ? topics.filter((t) => t.category === filters.category)
    : topics;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === 'category' ? { topic: '' } : {}) }));
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/student/practice')}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-3 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Practice Hub
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coding Practice</h1>
            <p className="text-gray-500 text-sm">
              {filters.category === 'sql' ? 'SQL Query Problems' : filters.category === 'dsa' ? 'Data Structures & Algorithms' : 'DSA & SQL Problems'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          <option value="dsa">DSA</option>
          <option value="sql">SQL</option>
        </select>
        <select
          value={filters.topic}
          onChange={(e) => handleFilterChange('topic', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Topics</option>
          {topicsForCategory.map((t) => (
            <option key={t.topic} value={t.topic}>
              {t.topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} ({t.count})
            </option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Problem Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-10">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Topic</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Difficulty</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Solved</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((p, idx) => (
                <tr
                  key={p._id}
                  onClick={() => navigate(`/student/practice/coding/problem/${p.slug}`)}
                  className="border-b border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    {p.isSolved ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{p.title}</span>
                    <div className="sm:hidden mt-0.5">
                      <span className="text-xs text-gray-400">
                        {p.topic?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {p.topic?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${DIFF_COLORS[p.difficulty]}`}>
                      {p.difficulty?.charAt(0).toUpperCase() + p.difficulty?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-xs text-gray-400">{p.solvedCount || 0}</span>
                  </td>
                </tr>
              ))}
              {filteredProblems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    No problems found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
