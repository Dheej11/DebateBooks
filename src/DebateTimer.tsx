import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  debateTimerPresets,
  formatTimerDisplay,
  type DebateTimerPreset,
} from './debateTimerPresets'
import './DebateTimer.css'

const defaultPreset = debateTimerPresets.find((preset) => preset.label === '1AC / 2AC / 2NC')
  ?? debateTimerPresets[0]

const presetGroups = ['Policy', 'LD', 'Quick'] as const

export default function DebateTimer() {
  const [searchParams] = useSearchParams()
  const theme = searchParams.get('theme') ?? 'dark'

  const [label, setLabel] = useState(defaultPreset.label)
  const [durationSeconds, setDurationSeconds] = useState(defaultPreset.seconds)
  const [remainingSeconds, setRemainingSeconds] = useState(defaultPreset.seconds)
  const [isRunning, setIsRunning] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('8')
  const [customSeconds, setCustomSeconds] = useState('0')

  const endTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

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

  const applyPreset = useCallback((preset: DebateTimerPreset) => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setLabel(preset.label)
    setDurationSeconds(preset.seconds)
    setRemainingSeconds(preset.seconds)
    setCustomMinutes(String(Math.floor(preset.seconds / 60)))
    setCustomSeconds(String(preset.seconds % 60))
    document.title = `${formatTimerDisplay(preset.seconds)} — ${preset.label}`
  }, [stopInterval])

  const resetTimer = useCallback(() => {
    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setRemainingSeconds(durationSeconds)
    document.title = `${formatTimerDisplay(durationSeconds)} — ${label}`
  }, [durationSeconds, label, stopInterval])

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

  const applyCustomDuration = useCallback(() => {
    const minutes = Math.max(0, Number.parseInt(customMinutes, 10) || 0)
    const seconds = Math.min(59, Math.max(0, Number.parseInt(customSeconds, 10) || 0))
    const total = minutes * 60 + seconds

    if (total <= 0) {
      return
    }

    stopInterval()
    endTimeRef.current = null
    setIsRunning(false)
    setLabel('Custom')
    setDurationSeconds(total)
    setRemainingSeconds(total)
    document.title = `${formatTimerDisplay(total)} — Custom`
  }, [customMinutes, customSeconds, stopInterval])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.title = `${formatTimerDisplay(defaultPreset.seconds)} — ${defaultPreset.label}`
    return () => {
      document.title = 'DebateFiles'
    }
  }, [])

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
      document.title = `${formatTimerDisplay(nextRemaining)} — ${label}`
    }

    tick()
    intervalRef.current = window.setInterval(tick, 100)
    return stopInterval
  }, [isRunning, label, stopInterval])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        return
      }

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
          <p className="debate-timer-label">{label}</p>
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
              document.title = `${formatTimerDisplay(0)} — ${label}`
            }}
          >
            End Now
          </button>
        </section>

        <section className="debate-timer-custom">
          <label>
            Minutes
            <input
              type="number"
              min="0"
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
          </label>
          <label>
            Seconds
            <input
              type="number"
              min="0"
              max="59"
              value={customSeconds}
              onChange={(event) => setCustomSeconds(event.target.value)}
            />
          </label>
          <button type="button" onClick={applyCustomDuration}>Set</button>
        </section>

        <section className="debate-timer-presets">
          <h2>Presets</h2>
          {presetGroups.map((group) => (
            <div key={group} className="debate-timer-preset-group">
              <h3>{group}</h3>
              <div className="debate-timer-preset-grid">
                {debateTimerPresets
                  .filter((preset) => preset.group === group)
                  .map((preset) => (
                    <button
                      key={`${group}-${preset.label}`}
                      type="button"
                      className={
                        label === preset.label && durationSeconds === preset.seconds
                          ? 'active'
                          : ''
                      }
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                      <span>{formatTimerDisplay(preset.seconds)}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      <footer className="debate-timer-footer">
        Space to start/pause · R to reset
      </footer>
    </div>
  )
}
