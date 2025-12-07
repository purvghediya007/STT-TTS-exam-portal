/**
 * Custom hook for debounced value
 * @param {string} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default 250)
 * @returns {string} - Debounced value
 */
import { useState, useEffect } from 'react'

export function useDebouncedValue(value, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}





