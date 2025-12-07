import React from 'react'
import { 
  HelpCircle, 
  Clock, 
  Shield, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

/**
 * GuidelinesView - Shows exam guidelines and instructions
 */
export default function GuidelinesView() {
  const guidelines = [
    {
      icon: Clock,
      title: 'Time Management',
      description: 'Each exam has a specific time limit. Make sure to complete all questions within the allocated time.',
      color: 'blue'
    },
    {
      icon: Shield,
      title: 'Academic Integrity',
      description: 'Maintain academic honesty. Any form of cheating or plagiarism will result in immediate disqualification.',
      color: 'red'
    },
    {
      icon: FileText,
      title: 'Answer Submission',
      description: 'Review your answers before submitting. Once submitted, you cannot modify your responses.',
      color: 'green'
    },
    {
      icon: AlertTriangle,
      title: 'Technical Issues',
      description: 'If you encounter any technical problems during the exam, contact support immediately.',
      color: 'yellow'
    }
  ]

  const rules = [
    { text: 'Ensure a stable internet connection before starting', type: 'required' },
    { text: 'Do not switch tabs or applications during the exam', type: 'required' },
    { text: 'Keep your camera and microphone ready if required', type: 'required' },
    { text: 'Read all questions carefully before answering', type: 'recommended' },
    { text: 'Save your progress frequently if auto-save is not enabled', type: 'recommended' }
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Guidelines</h1>
        <p className="text-gray-600">
          Important information and rules for taking exams on Examecho
        </p>
      </div>

      {/* Important Guidelines Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {guidelines.map((guideline, index) => {
          const Icon = guideline.icon
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">{guideline.title}</h3>
                  <p className="text-sm text-gray-600">{guideline.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rules List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-gray-600" />
          Exam Rules & Requirements
        </h2>
        <ul className="space-y-3">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-3">
              {rule.type === 'required' ? (
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-gray-700">{rule.text}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                  rule.type === 'required' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {rule.type === 'required' ? 'Required' : 'Recommended'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Additional Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
        <p className="text-gray-600 mb-4">
          If you have any questions or need assistance, please contact your instructor or the support team.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
            Email: support@quizportal.edu
          </span>
          <span className="px-3 py-1 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
            Phone: +1 (555) 123-4567
          </span>
        </div>
      </div>
    </div>
  )
}

