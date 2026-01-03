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
    <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 pt-1 pb-4 space-y-4">
      {/* Page Header - Clean Light Blue Theme */}
      <div className="pb-3 border-b border-blue-100">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Exam <span className="text-blue-600">Guidelines</span>
        </h1>
        <p className="text-sm text-gray-600">
          Important information and rules for taking exams on Examecho
        </p>
      </div>

      {/* Important Guidelines Cards - Light Blue Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guidelines.map((guideline, index) => {
          const Icon = guideline.icon
          const colorConfig = {
            blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
            red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
            green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
            yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' }
          }
          const colors = colorConfig[guideline.color] || colorConfig.blue
          
          return (
            <div
              key={index}
              className="bg-white border-[0.5px] border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1.5 text-gray-900">{guideline.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{guideline.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rules List - Clean Light Blue Theme */}
      <div className="bg-white border-[0.5px] border-blue-200 rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          Exam Rules & Requirements
        </h2>
        <ul className="space-y-2.5">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2.5">
              {rule.type === 'required' ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-700">{rule.text}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  rule.type === 'required' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {rule.type === 'required' ? 'Required' : 'Recommended'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Additional Information - Clean Light Blue Theme */}
      <div className="bg-white border-[0.5px] border-blue-200 rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          Need Help?
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          If you have any questions or need assistance, please contact your instructor or the support team.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200 font-medium">
            Email: support@quizportal.edu
          </span>
          <span className="px-3 py-1.5 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200 font-medium">
            Phone: +1 (555) 123-4567
          </span>
        </div>
      </div>
    </div>
  )
}

