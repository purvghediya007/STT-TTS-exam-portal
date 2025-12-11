/**
 * ErrorState component for error messages
 */

import { AlertTriangle } from 'lucide-react'

/**
 * @param {Object} props
 * @param {string} props.message
 * @param {() => void} [props.onRetry]
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-danger-light rounded-full p-4 mb-4">
        <AlertTriangle className="w-8 h-8 text-danger-dark" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h3>
      <p className="text-base text-slate-600 mb-6 text-center max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  )
}





