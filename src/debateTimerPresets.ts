export type DebateFormat = 'Policy' | 'LD' | 'PF'

export const debateFormats: DebateFormat[] = ['Policy', 'LD', 'PF']

/** Speech lengths used in each format (seconds). */
export const formatDurations: Record<DebateFormat, number[]> = {
  PF: [2 * 60, 3 * 60, 4 * 60],
  Policy: [2 * 60, 3 * 60, 8 * 60],
  LD: [3 * 60, 4 * 60, 6 * 60, 7 * 60],
}

export const formatTimerDisplay = (seconds: number): string => {
  const abs = Math.abs(seconds)
  const minutes = Math.floor(abs / 60)
  const secs = abs % 60
  const time = `${minutes}:${secs.toString().padStart(2, '0')}`
  return seconds < 0 ? `+${time}` : time
}

export const formatDurationLabel = (seconds: number): string => formatTimerDisplay(seconds)
