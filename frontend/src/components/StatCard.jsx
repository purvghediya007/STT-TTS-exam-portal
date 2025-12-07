/**
 * StatCard component for dashboard statistics
 */

/**
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {number} props.value
 * @param {string} props.label
 * @param {string} [props.color] - Color variant: 'primary', 'success', 'warning', 'danger'
 */
export default function StatCard({ icon, value, label, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-50 border-primary-200 text-primary-600',
    success: 'bg-success-light border-success-dark/20 text-success-dark',
    warning: 'bg-warning-light border-warning-dark/20 text-warning-dark',
    danger: 'bg-danger-light border-danger-dark/20 text-danger-dark',
  }

  const iconBgClasses = {
    primary: 'bg-primary-100',
    success: 'bg-success-light',
    warning: 'bg-warning-light',
    danger: 'bg-danger-light',
  }

  return (
    <div className={`bg-white rounded-xl border-2 p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
    </div>
  )
}





