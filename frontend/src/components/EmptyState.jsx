/**
 * EmptyState component for when no exams are found
 */

import { FileText } from 'lucide-react'

/**
 * @param {Object} props
 * @param {string} [props.message]
 * @param {string} [props.description]
 * @param {() => void} [props.onRefresh]
 */
export default function EmptyState({ 
  message = 'No exams found', 
  description = 'You have no exams assigned at this time.',
  onRefresh 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-slate-100 rounded-full p-6 mb-4">
        <FileText className="w-12 h-12 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{message}</h3>
      <p className="text-base text-slate-600 mb-6 text-center max-w-md">
        {description}
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Refresh
        </button>
      )}
    </div>
  )
}





