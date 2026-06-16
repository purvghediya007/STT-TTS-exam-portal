import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Code, Code2, HelpCircle, Brain, Monitor, Mic,
  ChevronRight, Building2, BarChart3, Target, ArrowRight
} from 'lucide-react';

export default function PracticeHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Practice Hub</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Sharpen your skills with aptitude, technical, and interview preparation modules.
        </p>
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aptitude Topics', value: '8+', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Technical Subjects', value: '4', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Companies', value: '8', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Coding Problems', value: '6+', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Practice Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aptitude Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Aptitude</h2>
              <p className="text-xs text-gray-500">Quantitative & Logical Reasoning</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Master Numbers, Ages, Profit & Loss, TSD, Averages, Percentages, Ratios, and Interest with theory, formulas, and timed practice.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/student/practice/aptitude/learn')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Learning Mode
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/student/practice/aptitude/practice')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" /> Practice Test
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Technical Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Technical</h2>
              <p className="text-xs text-gray-500">CS Concepts & Interview Prep</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Test your knowledge of DBMS, OS, Computer Networks, and DSA through MCQ tests and spoken interview practice with AI evaluation.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/student/practice/technical/mcq')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-4 h-4" /> MCQ Mode
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/student/practice/technical/spoken')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Mic className="w-4 h-4" /> Spoken Interview
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Company Practice Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Company Practice</h2>
              <p className="text-xs text-gray-500">Prepare for specific companies</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-3 leading-relaxed">
            Practice questions frequently asked by TCS, Infosys, Wipro, Google, Amazon, Microsoft, Accenture, and Cognizant.
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {['TCS', 'Infosys', 'Wipro', 'Google', 'Amazon', 'Microsoft'].map((c) => (
              <span key={c} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded font-medium">{c}</span>
            ))}
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">+2</span>
          </div>

          <button
            onClick={() => navigate('/student/practice/company')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-violet-50 hover:bg-violet-100 rounded-lg text-violet-700 text-sm font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Browse Companies
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Coding Practice Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Coding Practice</h2>
              <p className="text-xs text-gray-500">DSA & SQL Problems</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Solve data structures, algorithms, and SQL problems in a LeetCode-style editor with support for C, C++, Java, Python, and JavaScript.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/student/practice/coding?category=dsa')}
              className="flex items-center justify-between px-3 py-2.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4" /> DSA
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/student/practice/coding?category=sql')}
              className="flex items-center justify-between px-3 py-2.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-4 h-4" /> SQL
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* My Progress Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">My Progress</h2>
              <p className="text-xs text-gray-500">Track your improvement</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            View score trends, compare your performance over time, track practice streaks, and see category-wise breakdown of your results.
          </p>

          <button
            onClick={() => navigate('/student/practice/history')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-700 text-sm font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> View Progress
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Guidelines ── */}
      <button
        onClick={() => navigate('/student/practice/guidelines')}
        className="w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Guidelines & Information</h3>
            <p className="text-xs text-gray-500">System requirements, rules, and tips</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
    </div>
  );
}
