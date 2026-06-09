export interface DebateTimerPreset {
  label: string
  seconds: number
  group: 'Policy' | 'LD' | 'Quick'
}

export const debateTimerPresets: DebateTimerPreset[] = [
  { group: 'Policy', label: '1AC / 2AC / 2NC', seconds: 8 * 60 },
  { group: 'Policy', label: '1NC', seconds: 8 * 60 },
  { group: 'Policy', label: '1NR / 2NR', seconds: 2 * 60 },
  { group: 'Policy', label: 'Cross-Ex', seconds: 3 * 60 },
  { group: 'Policy', label: 'Prep', seconds: 8 * 60 },
  { group: 'LD', label: 'Aff Constructive', seconds: 6 * 60 },
  { group: 'LD', label: 'Neg Constructive', seconds: 7 * 60 },
  { group: 'LD', label: 'Aff Rebuttal', seconds: 4 * 60 },
  { group: 'LD', label: 'Neg Rebuttal', seconds: 6 * 60 },
  { group: 'LD', label: 'Aff Summary', seconds: 3 * 60 },
  { group: 'LD', label: 'Neg Summary', seconds: 3 * 60 },
  { group: 'LD', label: 'Aff Final', seconds: 2 * 60 },
  { group: 'LD', label: 'Neg Final', seconds: 2 * 60 },
  { group: 'LD', label: 'Cross-Ex', seconds: 3 * 60 },
  { group: 'LD', label: 'Prep', seconds: 4 * 60 },
  { group: 'Quick', label: '2:00', seconds: 2 * 60 },
  { group: 'Quick', label: '3:00', seconds: 3 * 60 },
  { group: 'Quick', label: '5:00', seconds: 5 * 60 },
  { group: 'Quick', label: '6:00', seconds: 6 * 60 },
  { group: 'Quick', label: '8:00', seconds: 8 * 60 },
  { group: 'Quick', label: '10:00', seconds: 10 * 60 },
]

export const formatTimerDisplay = (seconds: number): string => {
  const abs = Math.abs(seconds)
  const minutes = Math.floor(abs / 60)
  const secs = abs % 60
  const time = `${minutes}:${secs.toString().padStart(2, '0')}`
  return seconds < 0 ? `+${time}` : time
}
