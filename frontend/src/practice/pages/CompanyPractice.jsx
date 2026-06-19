import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Brain, Monitor, Mic, ChevronLeft, Loader2, ArrowRight, Minus, Plus, CheckCircle2, Clock } from 'lucide-react';
import { getCompanies, startPractice } from '../services/practiceApi';

const COMPANY_COLORS = {
  TCS: 'blue',
  Infosys: 'orange',
  Wipro: 'purple',
  Google: 'emerald',
  Amazon: 'amber',
  Microsoft: 'sky',
  Accenture: 'violet',
  Cognizant: 'cyan',
};

export default function CompanyPractice() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getCompanies()
      .then((res) => setCompanies(res.data || []))
      .catch((e) => console.error('Failed to load companies:', e))
      .finally(() => setLoading(false));
  }, []);

  const selectedData = companies.find((c) => c.company === selectedCompany);

  const handleStart = async (type) => {
    if (!selectedCompany || starting) return;
    setStarting(true);
    try {
      const res = await startPractice({
        type,
        company: selectedCompany,
        count: questionCount,
      });
      navigate('/student/practice/exam', {
        state: { session: res.data, type, company: selectedCompany },
      });
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setStarting(false);
    }
  };

  const getMaxForType = (type) => {
    if (!selectedData) return 0;
    if (type === 'aptitude') return selectedData.aptitudeCount;
    if (type === 'technical_mcq') return selectedData.technicalMcqCount;
    return selectedData.spokenCount;
  };

  const getTimeEstimate = (count, type) => {
    const secs = type === 'technical_spoken' ? count * 180 : count * 90;
    return Math.ceil(secs / 60);
  };

  // Max across all categories for the selected company
  const globalMax = selectedData
    ? Math.max(selectedData.aptitudeCount || 0, selectedData.technicalMcqCount || 0, selectedData.spokenCount || 0)
    : 50;

  const handleIncrement = () => setQuestionCount((prev) => Math.min(prev + 1, globalMax));
  const handleDecrement = () => setQuestionCount((prev) => Math.max(prev - 1, 1));
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setQuestionCount(Math.max(1, Math.min(val, globalMax)));
    else if (e.target.value === '') setQuestionCount(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/student/practice')}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-3 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Practice Hub
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Company-Wise Practice</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Select a company below, configure the number of questions, and start practicing.
        </p>
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {companies.map((c) => {
          const isSelected = selectedCompany === c.company;
          return (
            <button
              key={c.company}
              onClick={() => {
                setSelectedCompany(isSelected ? null : c.company);
                setQuestionCount(5);
              }}
              className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-400 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-base font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {c.company}
                </h3>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Aptitude</span>
                  <span className="font-semibold text-gray-700">{c.aptitudeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical</span>
                  <span className="font-semibold text-gray-700">{c.technicalMcqCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spoken</span>
                  <span className="font-semibold text-gray-700">{c.spokenCount}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs font-semibold text-gray-600">
                {c.totalQuestions} total questions
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Practice Configuration Panel ── */}
      {selectedCompany && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {selectedCompany} — Configure Practice
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Set the question count and select a practice mode to begin.
            </p>
          </div>

          {/* Stepper */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Questions</label>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={handleDecrement}
                  disabled={questionCount <= 1}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={globalMax}
                  value={questionCount}
                  onChange={handleInputChange}
                  className="w-14 text-center text-base font-bold text-gray-900 py-2 border-x border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={handleIncrement}
                  disabled={questionCount >= globalMax}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-gray-400">Max {globalMax}</span>
            </div>
          </div>

          {/* Practice Mode Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'aptitude', label: 'Aptitude', icon: Brain, max: getMaxForType('aptitude') },
              { type: 'technical_mcq', label: 'Technical MCQ', icon: Monitor, max: getMaxForType('technical_mcq') },
              { type: 'technical_spoken', label: 'Spoken Interview', icon: Mic, max: getMaxForType('technical_spoken') },
            ].map(({ type, label, icon: Icon, max }) => {
              const count = Math.min(questionCount, max);
              const time = getTimeEstimate(count, type);
              return (
                <button
                  key={type}
                  onClick={() => handleStart(type)}
                  disabled={starting || max === 0}
                  className="text-left p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                      <Icon className="w-4 h-4 text-indigo-600" /> {label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {max > 0 ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span>{count} questions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>~{time} min</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">No questions available</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {starting && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Preparing your practice session...
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedCompany && companies.length > 0 && (
        <div className="text-center py-10 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select a company above to get started</p>
        </div>
      )}
    </div>
  );
}
