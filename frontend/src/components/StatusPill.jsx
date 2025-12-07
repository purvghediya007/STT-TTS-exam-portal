/**
 * StatusPill component for exam status badges
 */

/**
 * @param {Object} props
 * @param {'live' | 'upcoming' | 'finished'} props.status
 * @param {boolean} [props.pulse] - Whether to show pulsing animation for live status
 */
export default function StatusPill({ status, pulse = false }) {
  const statusConfig = {
    live: {
      label: 'Live',
      className: 'bg-danger-light text-danger-dark border-danger-dark/20',
      pulseClass: pulse ? 'animate-pulse' : '',
    },
    upcoming: {
      label: 'Upcoming',
      className: 'bg-primary-100 text-primary-600 border-primary-300',
    },
    finished: {
      label: 'Finished',
      className: 'bg-slate-100 text-slate-600 border-slate-300',
    },
  }

  const config = statusConfig[status] || statusConfig.finished

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.className} ${config.pulseClass || ''}`}
      aria-label={`Status: ${config.label}`}
    >
      {status === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-dark opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-dark"></span>
        </span>
      )}
      {config.label}
    </span>
  )
}





