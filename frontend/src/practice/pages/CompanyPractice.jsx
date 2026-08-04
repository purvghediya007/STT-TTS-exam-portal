import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Brain, Monitor, Mic, ChevronLeft, Loader2, ArrowRight, Minus, Plus, CheckCircle2, Clock } from 'lucide-react';
import { getCompanies, startPractice } from '../services/practiceApi';
import logger from '../../utils/logger';

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
  const [aptitudeCount, setAptitudeCount] = useState(5);
  const [technicalMcqCount, setTechnicalMcqCount] = useState(5);
  const [spokenCount, setSpokenCount] = useState(5);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getCompanies()
      .then((res) => setCompanies(res.data || []))
      .catch((e) => logger.error('Failed to load companies:', e))
      .finally(() => setLoading(false));
  }, []);

  const selectedData = companies.find((c) => c.company === selectedCompany);

  useEffect(() => {
    if (selectedData) {
      setAptitudeCount(Math.min(10, selectedData.aptitudeCount || 0));
      setTechnicalMcqCount(Math.min(10, selectedData.technicalMcqCount || 0));
      setSpokenCount(Math.min(5, selectedData.spokenCount || 0));
    }
  }, [selectedCompany, companies, selectedData]);

  const handleStart = async (type) => {
    if (!selectedCompany || starting) return;
    setStarting(true);
    let count = 5;
    if (type === 'aptitude') count = aptitudeCount;
    else if (type === 'technical_mcq') count = technicalMcqCount;
    else if (type === 'technical_spoken') count = spokenCount;

    try {
      const res = await startPractice({
        type,
        company: selectedCompany,
        count: count,
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

  const stylesMap = {
    blue: {
      text: 'text-blue-600',
      ring: 'focus:ring-blue-500 focus:border-blue-500',
      btn: 'bg-blue-600 hover:bg-blue-700',
    },
    indigo: {
      text: 'text-indigo-600',
      ring: 'focus:ring-indigo-500 focus:border-indigo-500',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
    },
    green: {
      text: 'text-green-600',
      ring: 'focus:ring-green-500 focus:border-green-500',
      btn: 'bg-green-600 hover:bg-green-700',
    }
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

          {/* Practice Mode Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'aptitude', label: 'Aptitude', icon: Brain, max: getMaxForType('aptitude'), count: aptitudeCount, setCount: setAptitudeCount, color: 'blue' },
              { type: 'technical_mcq', label: 'Technical MCQ', icon: Monitor, max: getMaxForType('technical_mcq'), count: technicalMcqCount, setCount: setTechnicalMcqCount, color: 'indigo' },
              { type: 'technical_spoken', label: 'Spoken Interview', icon: Mic, max: getMaxForType('technical_spoken'), count: spokenCount, setCount: setSpokenCount, color: 'green' },
            ].map(({ type, label, icon: Icon, max, count, setCount, color }) => {
              const time = getTimeEstimate(count || 1, type);
              const styles = stylesMap[color];
              return (
                <div
                  key={type}
                  className="flex flex-col justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                        <Icon className={`w-4 h-4 ${styles.text}`} /> {label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      {max > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span>Available Questions:</span>
                            <span className="font-semibold text-gray-700">{max}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Est. Time:</span>
                            <span className="font-semibold text-gray-700">~{time} min</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">No questions available</span>
                      )}
                    </div>
                  </div>

                  {max > 0 && (
                    <div className="space-y-3 mt-auto pt-2 border-t border-gray-200">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Number of Questions</label>
                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={count}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setCount(Math.max(1, Math.min(val, max)));
                            } else if (e.target.value === '') {
                              setCount('');
                            }
                          }}
                          onBlur={() => {
                            if (count === '' || count < 1) {
                              setCount(Math.min(type === 'technical_spoken' ? 5 : 10, max));
                            }
                          }}
                          className={`w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 ${styles.ring}`}
                          placeholder={`Max ${max}`}
                        />
                      </div>
                      <button
                        onClick={() => handleStart(type)}
                        disabled={starting || count === '' || count < 1}
                        className={`w-full ${styles.btn} disabled:bg-gray-300 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm shadow-sm`}
                      >
                        Start Practice <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
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
