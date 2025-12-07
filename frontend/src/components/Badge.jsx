/**
 * Badge component for attempts, re-records, etc.
 */

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'default' | 'success' | 'warning' | 'brand'} [props.variant]
 */
export default function Badge({ children, variant = 'default' }) {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-success-light text-success-dark border-success-dark/20',
    warning: 'bg-warning-light text-warning-dark border-warning-dark/20',
    brand: 'bg-brand-100 text-brand-600 border-brand-300',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}





