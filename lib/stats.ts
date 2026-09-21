import { dateKey, monthDays, type DayInfo } from './calendar'
import { STANDARD_HOURS } from './config'
import type { DayRecord, Records } from './storage'
import { MIN_PER_DAY, minutesOfDay, workedMinutes } from './time'

/** 一条记录的有效工时（分钟）。未打下班卡时可传 now，计算进行中的工时。 */
export function recordMinutes(rec: DayRecord | undefined, now?: Date): number {
  if (!rec?.checkIn) return 0
  const inDate = new Date(rec.checkIn)
  let outDate: Date
  if (rec.checkOut) outDate = new Date(rec.checkOut)
  else if (now && dateKey(now) === dateKey(inDate)) outDate = now
  else return 0
  const inMin = minutesOfDay(inDate)
  // 跨过午夜的下班卡按当天 24:00 截止
  const outMin = dateKey(outDate) === dateKey(inDate) ? minutesOfDay(outDate) : MIN_PER_DAY
  return workedMinutes(inMin, outMin)
}

export interface DayStat {
  info: DayInfo
  rec?: DayRecord
  minutes: number
}

export interface MonthSummary {
  year: number
  month: number
  requiredDays: number
  requiredMinutes: number
  workedDays: number
  workedMinutes: number
  days: DayStat[]
}

export function monthSummary(records: Records, year: number, month: number, now?: Date): MonthSummary {
  const days: DayStat[] = monthDays(year, month).map((info) => {
    const rec = records[info.date]
    return { info, rec, minutes: recordMinutes(rec, now) }
  })
  const requiredDays = days.filter((d) => d.info.isWorkday).length
  return {
    year,
    month,
    requiredDays,
    requiredMinutes: requiredDays * STANDARD_HOURS * 60,
    workedDays: days.filter((d) => d.minutes > 0).length,
    workedMinutes: days.reduce((s, d) => s + d.minutes, 0),
    days,
  }
}
