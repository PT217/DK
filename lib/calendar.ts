import { COUNT_MAKEUP_DAYS, STANDARD_HOURS } from './config'
import type { HolidayDay, HolidayFile } from './holidaySource'
import h2026 from '@/data/2026.json'

/** 日期 -> 节假日/调休信息 */
const SPECIAL = new Map<string, HolidayDay>()
/** 年份 -> 该年已登记的全部条目 */
const YEARS = new Map<number, HolidayDay[]>()

/**
 * 登记一年的节假日数据，同年旧数据整体替换。返回内容是否有变化。
 * 内置的 data/*.json 在模块加载时登记；联网下载的数据在启动后登记，会覆盖内置的同年数据。
 */
export function registerHolidayFile(file: HolidayFile): boolean {
  const prev = YEARS.get(file.year)
  if (prev && JSON.stringify(prev) === JSON.stringify(file.days)) return false
  for (const d of prev ?? []) SPECIAL.delete(d.date)
  const days = file.days.map((d) => ({ name: d.name, date: d.date, isOffDay: d.isOffDay }))
  for (const d of days) SPECIAL.set(d.date, d)
  YEARS.set(file.year, days)
  return true
}

/**
 * 内置兜底数据，只放当前年份一份，来源 https://github.com/NateScarlet/holiday-cn。
 * 其他年份由 holidayStore 联网获取，无需手动添加文件。
 */
registerHolidayFile(h2026 as HolidayFile)

/** 已有节假日数据的年份 */
export function holidayYears(): number[] {
  return [...YEARS.entries()]
    .filter(([, days]) => days.length > 0)
    .map(([year]) => year)
    .sort()
}

export function hasHolidayData(year: number): boolean {
  return (YEARS.get(year)?.length ?? 0) > 0
}

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
