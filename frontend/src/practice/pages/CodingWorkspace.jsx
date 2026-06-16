import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Send, Loader2, CheckCircle2, XCircle, Clock, Cpu, ChevronDown, ChevronUp, Lightbulb, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { getCodingProblem, runCode, submitCode } from '../services/codingApi';

const LANGUAGES = [
  { key: 'python', label: 'Python', monacoLang: 'python' },
  { key: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { key: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { key: 'java', label: 'Java', monacoLang: 'java' },
  { key: 'c', label: 'C', monacoLang: 'c' },
];

const DIFF_COLORS = {
  easy: { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  medium: { text: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  hard: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const STATUS_CONFIG = {
  accepted: { label: 'Accepted', color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  wrong_answer: { label: 'Wrong Answer', color: '#dc2626', bg: '#fef2f2', icon: '❌' },
  runtime_error: { label: 'Runtime Error', color: '#dc2626', bg: '#fef2f2', icon: '💥' },
  time_limit_exceeded: { label: 'Time Limit Exceeded', color: '#d97706', bg: '#fffbeb', icon: '⏱️' },
  compilation_error: { label: 'Compilation Error', color: '#dc2626', bg: '#fef2f2', icon: '🔧' },
  memory_limit_exceeded: { label: 'Memory Limit', color: '#d97706', bg: '#fffbeb', icon: '💾' },
  internal_error: { label: 'Internal Error', color: '#6b7280', bg: '#f3f4f6', icon: '⚠️' },
};

/* ── Simple inline markdown renderer ── */
function RenderMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Convert **bold** → <strong>
    let html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Convert `code` → <code>
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:0.85em;color:#334155">$1</code>');
    if (!html.trim()) return <br key={i} />;
    return <p key={i} style={{ margin: '4px 0', lineHeight: '1.65' }} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export default function CodingWorkspace() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [bottomTab, setBottomTab] = useState('testcase'); // testcase | result

  useEffect(() => {
    getCodingProblem(slug)
      .then((res) => {
        setProblem(res.data);
        setCode(res.data.codeTemplates?.python || '');
      })
      .catch(() => {
        navigate('/student/practice/coding');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(problem?.codeTemplates?.[lang] || '');
    setResult(null);
  };

  const handleReset = () => {
    setCode(problem?.codeTemplates?.[language] || '');
    setResult(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setBottomTab('result');
    setActiveTab('results');
    try {
      const res = await runCode(slug, language, code);
      setResult(res.data);
    } catch (e) {
      setResult({ overallStatus: 'internal_error', results: [], compileError: e.response?.data?.message || e.message });
    }
    setRunning(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    setBottomTab('result');
    setActiveTab('results');
    try {
      const res = await submitCode(slug, language, code);
      setResult(res.data);
    } catch (e) {
      setResult({ overallStatus: 'internal_error', results: [], compileError: e.response?.data?.message || e.message });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>
    );
  }

  if (!problem) return null;

  const diffStyle = DIFF_COLORS[problem.difficulty] || {};
  const visibleTests = problem.testCases?.filter(tc => !tc.isHidden) || [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', overflow: 'hidden' }}>
      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#fff', borderBottom: '2px solid #6366f1',
        flexShrink: 0, zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={() => navigate('/student/practice/coding')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', padding: 4 }}>
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {problem.title}
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            color: diffStyle.text, background: diffStyle.bg, border: `1px solid ${diffStyle.border}`
          }}>
            {problem.difficulty?.charAt(0).toUpperCase() + problem.difficulty?.slice(1)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 8px', fontSize: 13, fontWeight: 500, background: '#fff', cursor: 'pointer' }}
          >
            {LANGUAGES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <button onClick={handleReset} title="Reset code" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={14} color="#6b7280" />
          </button>
          <button onClick={handleRun} disabled={running || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#374151', cursor: running ? 'wait' : 'pointer', opacity: running || submitting ? 0.6 : 1 }}>
            {running ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            Run
          </button>
          <button onClick={handleSubmit} disabled={running || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#16a34a', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff', cursor: submitting ? 'wait' : 'pointer', opacity: running || submitting ? 0.6 : 1 }}>
            {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            Submit
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT: Problem Description */}
        <div style={{ width: '42%', background: '#ffffff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            {['description', 'results'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#fff' : '#f9fafb',
                  color: activeTab === tab ? '#6366f1' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                }}>
                {tab === 'description' ? 'Description' : `Results ${result ? (result.overallStatus === 'accepted' ? '✅' : '❌') : ''}`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
            {activeTab === 'description' ? (
              <DescriptionPanel problem={problem} showHints={showHints} setShowHints={setShowHints} />
            ) : (
              <ResultsPanel result={result} running={running} submitting={submitting} />
            )}
          </div>
        </div>

        {/* RIGHT: Editor + Test Cases */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Monaco Editor */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language={LANGUAGES.find((l) => l.key === language)?.monacoLang || 'python'}
              value={code}
              onChange={(val) => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                padding: { top: 12 },
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Bottom Panel: Test Cases / Console */}
          <div style={{ height: 200, borderTop: '1px solid #3f3f46', background: '#1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Bottom Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #3f3f46', flexShrink: 0 }}>
              {[{ key: 'testcase', label: 'Test Cases' }, { key: 'result', label: 'Output' }].map(t => (
                <button key={t.key} onClick={() => setBottomTab(t.key)}
                  style={{
                    padding: '6px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: bottomTab === t.key ? '#2d2d2d' : '#1e1e1e',
                    color: bottomTab === t.key ? '#e5e7eb' : '#9ca3af',
                    borderBottom: bottomTab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bottom Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
              {bottomTab === 'testcase' ? (
                <TestCasePanel visibleTests={visibleTests} />
              ) : (
                <OutputPanel result={result} running={running} submitting={submitting} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Description Panel ── */
function DescriptionPanel({ problem, showHints, setShowHints }) {
  return (
    <div>
      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 11, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          {problem.topic?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
        {problem.tags?.map(t => (
          <span key={t} style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 4 }}>{t}</span>
        ))}
      </div>

      {/* Description */}
      <div style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
        <RenderMarkdown text={problem.description} />
      </div>

      {/* Examples */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Examples</h3>
        {problem.examples?.map((ex, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Input: </span>
              <code style={{ color: '#1e293b', fontSize: 13 }}>{ex.input}</code>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Output: </span>
              <code style={{ color: '#1e293b', fontSize: 13, fontWeight: 600 }}>{ex.output}</code>
            </div>
            {ex.explanation && (
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{ex.explanation}</div>
            )}
          </div>
        ))}
      </div>

      {/* Constraints */}
      {problem.constraints?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Constraints</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
            {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Hints */}
      {problem.hints?.length > 0 && (
        <div>
          <button onClick={() => setShowHints(!showHints)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#d97706', padding: 0 }}>
            <Lightbulb size={15} />
            {showHints ? 'Hide Hints' : `Show Hints (${problem.hints.length})`}
            {showHints ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showHints && (
            <div style={{ marginTop: 8 }}>
              {problem.hints.map((h, i) => (
                <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', marginBottom: 6, fontSize: 13, color: '#92400e' }}>
                  <strong>Hint {i + 1}:</strong> {h}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Test Case Panel (bottom of editor) ── */
function TestCasePanel({ visibleTests }) {
  const [activeCase, setActiveCase] = useState(0);
  if (!visibleTests.length) return <div style={{ color: '#9ca3af', fontSize: 13 }}>No visible test cases.</div>;

  const tc = visibleTests[activeCase];
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {visibleTests.map((_, i) => (
          <button key={i} onClick={() => setActiveCase(i)}
            style={{
              padding: '3px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
              background: activeCase === i ? '#3f3f46' : 'transparent',
              color: activeCase === i ? '#e5e7eb' : '#9ca3af',
            }}>
            Case {i + 1}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: '#9ca3af', fontWeight: 600 }}>Input:</span>
          <pre style={{ margin: '2px 0', padding: '6px 10px', background: '#27272a', borderRadius: 4, color: '#e5e7eb', fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{tc.input || '(empty)'}</pre>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontWeight: 600 }}>Expected Output:</span>
          <pre style={{ margin: '2px 0', padding: '6px 10px', background: '#27272a', borderRadius: 4, color: '#a3e635', fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{tc.expectedOutput || '(empty)'}</pre>
        </div>
      </div>
    </div>
  );
}

/* ── Output Panel (bottom, after run/submit) ── */
function OutputPanel({ result, running, submitting }) {
  if (running || submitting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#9ca3af', fontSize: 13 }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        {submitting ? 'Running all test cases...' : 'Running sample tests...'}
      </div>
    );
  }
  if (!result) {
    return <div style={{ color: '#6b7280', fontSize: 12, padding: 8 }}>Click <strong>Run</strong> to test with sample cases, or <strong>Submit</strong> to run all tests.</div>;
  }

  const cfg = STATUS_CONFIG[result.overallStatus] || { label: result.overallStatus, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };

  return (
    <div>
      {/* Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        {result.passedCount !== undefined && (
          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{result.passedCount}/{result.totalCount} passed</span>
        )}
      </div>

      {/* Compile Error */}
      {result.compileError && (
        <pre style={{ margin: '4px 0 8px', padding: 8, background: '#2d1b1b', borderRadius: 4, color: '#fca5a5', fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 100, overflow: 'auto' }}>{result.compileError}</pre>
      )}

      {/* Per Test Case */}
      {result.results?.map((tc, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #27272a', fontSize: 12 }}>
          <span>{tc.passed ? '✅' : '❌'}</span>
          <span style={{ color: tc.passed ? '#a3e635' : '#fca5a5', fontWeight: 600 }}>Test {i + 1}</span>
          <span style={{ color: '#6b7280', marginLeft: 'auto' }}>{tc.executionTime}ms</span>
          {!tc.passed && tc.input !== '(hidden)' && (
            <span style={{ color: '#9ca3af', fontSize: 11 }}>
              Expected: <span style={{ color: '#a3e635' }}>{tc.expectedOutput}</span> Got: <span style={{ color: '#fca5a5' }}>{tc.actualOutput || '(empty)'}</span>
            </span>
          )}
          {!tc.passed && tc.input === '(hidden)' && <span style={{ color: '#6b7280', fontSize: 11 }}>Hidden test</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Results Panel (left sidebar) ── */
function ResultsPanel({ result, running, submitting }) {
  if (running || submitting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40, color: '#6b7280' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>{submitting ? 'Running all test cases...' : 'Running...'}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>
        Run or Submit your code to see results here.
      </div>
    );
  }

  const cfg = STATUS_CONFIG[result.overallStatus] || { label: result.overallStatus, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };

  return (
    <div>
      {/* Status Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 8, marginBottom: 16,
        background: cfg.bg, border: `1px solid ${cfg.color}22`
      }}>
        <span style={{ fontSize: 24 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: cfg.color }}>{cfg.label}</div>
          {result.passedCount !== undefined && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>{result.passedCount} / {result.totalCount} test cases passed</div>
          )}
        </div>
      </div>

      {/* Compile Error */}
      {result.compileError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>Compilation Error:</p>
          <pre style={{ fontSize: 12, color: '#991b1b', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0 }}>{result.compileError}</pre>
        </div>
      )}

      {/* Test Cases */}
      <div>
        {result.results?.map((tc, i) => (
          <div key={i} style={{
            border: `1px solid ${tc.passed ? '#bbf7d0' : '#fecaca'}`,
            background: tc.passed ? '#f0fdf4' : '#fef2f2',
            borderRadius: 8, padding: 12, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tc.passed ? 0 : 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {tc.passed ? <CheckCircle2 size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
                Test {i + 1}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{tc.executionTime}ms</span>
            </div>

            {!tc.passed && tc.input !== '(hidden)' && (
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Input: </span>
                  <code style={{ color: '#334155' }}>{tc.input}</code>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Expected: </span>
                  <code style={{ color: '#16a34a', fontWeight: 600 }}>{tc.expectedOutput}</code>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Got: </span>
                  <code style={{ color: '#dc2626', fontWeight: 600 }}>{tc.actualOutput || '(no output)'}</code>
                </div>
                {tc.errorOutput && (
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Error: </span>
                    <code style={{ color: '#dc2626', fontSize: 12 }}>{tc.errorOutput}</code>
                  </div>
                )}
              </div>
            )}

            {!tc.passed && tc.input === '(hidden)' && (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Hidden test case</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
