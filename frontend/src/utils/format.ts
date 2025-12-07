/**
 * Date formatting utilities for exam times and durations
 */

/**
 * Format a date string to a readable format: "Sep 1, 2025 • 10:00 AM — 11:00 AM"
 */
export function formatExamTimeRange(
  startsAt: string,
  endsAt: string
): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)

  const dateStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${dateStr} • ${startTime} — ${endTime}`
}

/**
 * Format duration in minutes to a readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Format time per question in seconds
 */
export function formatTimePerQuestion(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}

/**
 * Calculate time remaining until a date and return formatted string: "12m 34s"
 */
export function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt)
  const now = new Date()
  const diff = Math.max(0, end.getTime() - now.getTime())

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Get seconds remaining until a date
 */
export function getSecondsRemaining(endsAt: string): number {
  const end = new Date(endsAt)
  const now = new Date()
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
}



