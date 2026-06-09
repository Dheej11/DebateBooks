import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  debateFormats,
  formatDurationLabel,
  formatDurations,
  formatTimerDisplay,
  type DebateFormat,
} from './debateTimerPresets'
import './DebateTimer.css'

const defaultFormat: DebateFormat = 'Policy'
const defaultDuration = formatDurations[defaultFormat][formatDurations[defaultFormat].length - 1]

export default function DebateTimer() {
  const [searchParams] = useSearchParams()
  const theme = searchParams.get('theme') ?? 'dark'

  const [format, setFormat] = useState<DebateFormat>(defaultFormat)
  const [durationSeconds, setDurationSeconds] = useState(defaultDuration)
  const [remainingSeconds, setRemainingSeconds] = useState(defaultDuration)
  const [isRunning, setIsRunning] = useState(false)

  const endTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  const timerLabel = `${format} · ${formatDurationLabel(durationSeconds)}`
  const availableDurations = formatDurations[format]

  const clockClassName = useMemo(() => {
    if (remainingSeconds < 0) {
      return 'debate-timer-clock overtime'
    }
    if (remainingSeconds <= 30) {
      return 'debate-timer-clock critical'
    }
    if (remainingSeconds <= 60) {
      return 'debate-timer-clock warning'
    }
    return 'debate-timer-clock'
  }, [remainingSeconds])

  const statusText = useMemo(() => {
    if (!isRunning && remainingSeconds === durationSeconds) {
      return 'Ready'
    }
    if (isRunning && remainingSeconds >= 0) {
      return 'Running'
    }
    if (isRunning && remainingSeconds < 0) {
      return 'Overtime'
    }
    if (remainingSeconds <= 0) {
      return 'Time expired'
    }
    return 'Paused'
  }, [durationSeconds, isRunning, remainingSeconds])

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const syncDocumentTitle = useCallback((seconds: number, currentFormat: DebateFormat) => {
    document.title = `${formatTimerDisplay(seconds)} — ${currentFormat}`
  }, [])

  const selectDuration = useCallback((seconds: number, currentFormat: DebateFormat = format) => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setDurationSeconds(seconds)
    setRemainingSeconds(seconds)
    syncDocumentTitle(seconds, currentFormat)
  }, [format, stopInterval, syncDocumentTitle])

  const selectFormat = useCallback((nextFormat: DebateFormat) => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setFormat(nextFormat)

    const durations = formatDurations[nextFormat]
    const nextDuration =
      durations.find((seconds) => seconds === durationSeconds) ?? durations[durations.length - 1]

    setDurationSeconds(nextDuration)
    setRemainingSeconds(nextDuration)
    syncDocumentTitle(nextDuration, nextFormat)
  }, [durationSeconds, stopInterval, syncDocumentTitle])

  const resetTimer = useCallback(() => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setRemainingSeconds(durationSeconds)
    syncDocumentTitle(durationSeconds, format)
  }, [durationSeconds, format, stopInterval, syncDocumentTitle])

  const startTimer = useCallback(() => {
    endTimeRef.current = Date.now() + remainingSeconds * 1000
    setIsRunning(true)
  }, [remainingSeconds])

  const pauseTimer = useCallback(() => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
  }, [stopInterval])

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer()
      return
    }
    startTimer()
  }, [isRunning, pauseTimer, startTimer])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    syncDocumentTitle(defaultDuration, defaultFormat)
    return () => {
      document.title = 'DebateFiles'
    }
  }, [syncDocumentTitle])

  useEffect(() => {
    if (!isRunning || endTimeRef.current === null) {
      stopInterval()
      return
    }

    const tick = () => {
      if (endTimeRef.current === null) {
        return
      }
      const nextRemaining = Math.ceil((endTimeRef.current - Date.now()) / 1000)
      setRemainingSeconds(nextRemaining)
      syncDocumentTitle(nextRemaining, format)
    }

    tick()
    intervalRef.current = window.setInterval(tick, 100)
    return stopInterval
  }, [format, isRunning, stopInterval, syncDocumentTitle])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        toggleTimer()
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        resetTimer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [resetTimer, toggleTimer])

  return (
    <div className="debate-timer-page">
      <header className="debate-timer-header">
        <div>
          <h1>Debate Timer</h1>
          <p>Pop this out on a second screen during rounds.</p>
        </div>
      </header>

      <div className="debate-timer-body">
        <section className="debate-timer-display">
          <p className="debate-timer-label">{timerLabel}</p>
          <p className={clockClassName}>{formatTimerDisplay(remainingSeconds)}</p>
          <p className="debate-timer-status">{statusText}</p>
        </section>

        <section className="debate-timer-controls">
          <button type="button" className="primary" onClick={toggleTimer}>
            {isRunning ? 'Pause' : remainingSeconds === durationSeconds ? 'Start' : 'Resume'}
          </button>
          <button type="button" onClick={resetTimer}>Reset</button>
          <button
            type="button"
            onClick={() => {
              pauseTimer()
              setRemainingSeconds(0)
              syncDocumentTitle(0, format)
            }}
          >
            End Now
          </button>
        </section>

        <section className="debate-timer-format">
          <div className="debate-timer-format-switch" role="tablist" aria-label="Debate format">
            {debateFormats.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={format === option}
                className={format === option ? 'active' : ''}
                onClick={() => selectFormat(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="debate-timer-durations">
          <div className="debate-timer-duration-grid">
            {availableDurations.map((seconds) => (
              <button
                key={`${format}-${seconds}`}
                type="button"
                className={durationSeconds === seconds ? 'active' : ''}
                onClick={() => selectDuration(seconds)}
              >
                {formatDurationLabel(seconds)}
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="debate-timer-footer">
        Space to start/pause · R to reset
      </footer>
    </div>
  )
}
