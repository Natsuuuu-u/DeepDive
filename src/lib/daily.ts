export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextLocalMidnight(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

export function formatUntilNextDive(now = Date.now()): string {
  const seconds = Math.max(
    0,
    Math.ceil((getNextLocalMidnight(new Date(now)).getTime() - now) / 1000),
  )
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const remainingSeconds = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${remainingSeconds}`
}

export function getPreviousLocalDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const previous = new Date(year, month - 1, day)
  previous.setDate(previous.getDate() - 1)
  return getLocalDateKey(previous)
}
