import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { getLearningTopics, getLearningContent } from '../services/practiceApi';

export default function AptitudeLearning() {
  const navigate = useNavigate();
  const { topicKey } = useParams();
  const [topics, setTopics] = useState([]);
  const [expandedTopic, setExpandedTopic] = useState(topicKey || null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('theory');

  useEffect(() => {
    getLearningTopics().then(res => {
      setTopics(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (expandedTopic) {
      setContentLoading(true);
      getLearningContent(expandedTopic).then(res => {
        setContent(res.data);
        setContentLoading(false);
        setActiveTab('theory');
      }).catch(() => setContentLoading(false));
    }
  }, [expandedTopic]);

  const tabs = [
    { key: 'theory', label: 'Theory' },
    { key: 'formulas', label: 'Formulas' },
    { key: 'examples', label: 'Solved Examples' },
    { key: 'tricks', label: 'Tricks & Shortcuts' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/student/practice')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Practice Hub
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Aptitude — Learning Mode</h1>
      <p className="text-gray-500 mb-6">Select a topic to study theory, formulas, solved examples, and shortcuts.</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Topic List */}
        <div className="lg:w-1/4 w-full">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-3 font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Topics
            </div>
            {loading ? (
              <div className="p-4 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : (
              <nav className="divide-y divide-gray-100">
                {topics.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setExpandedTopic(expandedTopic === t.key ? null : t.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      expandedTopic === t.key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{t.title}</span>
                    {expandedTopic === t.key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:w-3/4 w-full">
          {!expandedTopic && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-600">Select a topic</h3>
              <p className="text-sm text-gray-400 mt-1">Choose a topic from the sidebar to start learning.</p>
            </div>
          )}

          {expandedTopic && contentLoading && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500">Loading content...</p>
            </div>
          )}

          {expandedTopic && content && !contentLoading && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Topic Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4">
                <h2 className="text-xl font-bold">{content.title}</h2>
                <p className="text-blue-200 text-sm mt-1">{content.description}</p>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 flex overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'theory' && (
                  <div className="prose prose-sm max-w-none">
                    {content.theory?.split('\n\n').map((para, i) => (
                      <div key={i} className="mb-4">
                        {para.split('\n').map((line, j) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <h3 key={j} className="font-bold text-gray-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>;
                          }
                          if (line.startsWith('- ')) {
                            return <li key={j} className="text-gray-700 ml-4">{line.slice(2).replace(/\*\*/g, '')}</li>;
                          }
                          return <p key={j} className="text-gray-700">{line.replace(/\*\*/g, '')}</p>;
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'formulas' && (
                  <div className="space-y-3">
                    {content.formulas?.map((f, i) => (
                      <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 font-mono text-sm text-blue-900">
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'examples' && (
                  <div className="space-y-6">
                    {content.solvedExamples?.map((ex, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                        <h4 className="font-semibold text-gray-900 mb-3">Example {i + 1}: {ex.question}</h4>
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                          <p className="text-sm font-medium text-green-700 mb-2">Solution:</p>
                          {ex.solution.split('\n').map((line, j) => (
                            <p key={j} className="text-sm text-gray-700 font-mono">{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tricks' && (
                  <div className="space-y-3">
                    {content.tricks?.map((t, i) => (
                      <div key={i} className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                        <span className="text-yellow-600 font-bold text-lg">💡</span>
                        <p className="text-sm text-gray-800">{t}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
