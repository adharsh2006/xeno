import { useState, useEffect, useRef } from 'react'

/**
 * Count-up animation hook
 * @param {number} end - target value
 * @param {number} duration - animation duration in ms
 * @param {boolean} trigger - start when true
 */
export function useCountUp(end, duration = 1000, trigger = true) {
  const [count, setCount] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!trigger || !end) return
    let startTime = null
    const startValue = 0

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(startValue + (end - startValue) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration, trigger])

  return count
}

/**
 * Debounce hook
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

/**
 * Polling hook: calls fn every intervalMs while active
 */
export function usePolling(fn, intervalMs, active = true) {
  useEffect(() => {
    if (!active) return
    fn()
    const interval = setInterval(fn, intervalMs)
    return () => clearInterval(interval)
  }, [active, intervalMs])
}
