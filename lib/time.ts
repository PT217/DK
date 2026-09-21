import { BREAKS, COUNT_EARLY, COUNT_OVERTIME, WORK_END, WORK_START } from './config'

export const MIN_PER_DAY = 24 * 60

/** "08:30" -> 510 */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

/** 510 -> "08:30" */
export function minToHm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 某个时刻是当天的第几分钟 */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** 两个区间的重叠长度 */
export function overlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
}

/**
 * 由上下班打卡时刻（当天分钟数）计算有效工时（分钟）。
 * 扣除休息时段；早到默认不计，加班默认计入，见 config.ts。
 */
export function workedMinutes(checkInMin: number, checkOutMin: number): number {
  const start = COUNT_EARLY ? checkInMin : Math.max(checkInMin, hmToMin(WORK_START))
  const end = COUNT_OVERTIME ? checkOutMin : Math.min(checkOutMin, hmToMin(WORK_END))
  if (end <= start) return 0
  let total = end - start
  for (const [b1, b2] of BREAKS) total -= overlap(start, end, hmToMin(b1), hmToMin(b2))
  return total
}

/** 480 -> "8小时"，450 -> "7小时30分"，0 -> "0小时" */
export function formatDuration(min: number): string {
  const sign = min < 0 ? '-' : ''
  const abs = Math.abs(Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (m === 0) return `${sign}${h}小时`
  if (h === 0) return `${sign}${m}分`
  return `${sign}${h}小时${m}分`
}

/** 时间戳 -> "08:30" */
export function formatClock(ms: number): string {
  return minToHm(minutesOfDay(new Date(ms)))
}
