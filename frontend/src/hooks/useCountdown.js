/**
 * Custom hook for countdown timer
 * @param {string} endTime - ISO string of end time
 * @param {() => void} [onExpire] - Callback when countdown expires
 * @returns {{ remaining: number, formatted: string, expired: boolean }}
 */
import { useState, useEffect } from 'react'

export function useCountdown(endTime, onExpire) {
  const [remaining, setRemaining] = useState(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calculateRemaining = () => {
      const end = new Date(endTime)
      const now = new Date()
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
      
      setRemaining(diff)
      
      if (diff === 0 && !expired) {
        setExpired(true)
        if (onExpire) {
          onExpire()
        }
      }
    }

    calculateRemaining()
    const interval = setInterval(calculateRemaining, 1000)

    return () => clearInterval(interval)
  }, [endTime, onExpire, expired])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  return {
    remaining,
    formatted: formatTime(remaining),
    expired,
  }
}





