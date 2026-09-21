import { COUNT_MAKEUP_DAYS, STANDARD_HOURS } from './config'
import h2025 from '@/data/2025.json'
import h2026 from '@/data/2026.json'
import h2027 from '@/data/2027.json'

interface HolidayDay {
  name: string
  date: string
  isOffDay: boolean
}
interface HolidayFile {
  year: number
  days: HolidayDay[]
}

/** 国务院节假日安排，数据来源 https://github.com/NateScarlet/holiday-cn */
const FILES: HolidayFile[] = [h2025, h2026, h2027]
const SPECIAL = new Map<string, HolidayDay>()
for (const f of FILES) for (const d of f.days) SPECIAL.set(d.date, d)

/** 已内置节假日数据的年份 */
export const HOLIDAY_YEARS = FILES.filter((f) => f.days.length > 0).map((f) => f.year)

export type DayKind = 'workday' | 'weekend' | 'holiday' | 'makeup'

export interface DayInfo {
  /** YYYY-MM-DD */
  date: string
  kind: DayKind
  /** 节假日名称，如 春节 */
  name?: string
  /** 是否计入应出勤 */
  isWorkday: boolean
}

export const KIND_LABEL: Record<DayKind, string> = {
  workday: '工作日',
  weekend: '休息日',
  holiday: '法定节假日',
  makeup: '调休上班',
}

/** 本地日期 -> YYYY-MM-DD。不能用 toISOString，那会变成 UTC 日期。 */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function dayInfo(d: Date): DayInfo {
  const date = dateKey(d)
  const special = SPECIAL.get(date)
  if (special) {
    return special.isOffDay
      ? { date, kind: 'holiday', name: special.name, isWorkday: false }
      : { date, kind: 'makeup', name: special.name, isWorkday: COUNT_MAKEUP_DAYS }
  }
  const wd = d.getDay()
  if (wd === 0 || wd === 6) return { date, kind: 'weekend', isWorkday: false }
  return { date, kind: 'workday', isWorkday: true }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 某月每一天的信息，month 取 1 到 12 */
export function monthDays(year: number, month: number): DayInfo[] {
  const n = daysInMonth(year, month)
  const out: DayInfo[] = []
  for (let d = 1; d <= n; d++) out.push(dayInfo(new Date(year, month - 1, d)))
  return out
}

export function monthWorkdays(year: number, month: number): DayInfo[] {
  return monthDays(year, month).filter((d) => d.isWorkday)
}

/** 当月应出勤工时（小时） */
export function monthRequiredHours(year: number, month: number): number {
  return monthWorkdays(year, month).length * STANDARD_HOURS
}

export function hasHolidayData(year: number): boolean {
  return HOLIDAY_YEARS.includes(year)
}
