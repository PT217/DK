import { describe, expect, it } from 'vitest'
import {
  dateKey,
  dayInfo,
  hasHolidayData,
  holidayYears,
  monthRequiredHours,
  monthWorkdays,
  registerHolidayFile,
} from './calendar'

describe('dayInfo', () => {
  it('普通工作日', () => expect(dayInfo(new Date(2026, 8, 21)).kind).toBe('workday'))
  it('周末', () => expect(dayInfo(new Date(2026, 8, 19)).kind).toBe('weekend'))
  it('法定节假日 中秋', () => {
    const d = dayInfo(new Date(2026, 8, 25))
    expect(d.kind).toBe('holiday')
    expect(d.name).toBe('中秋节')
    expect(d.isWorkday).toBe(false)
  })
  it('调休上班 9月20日周日', () => {
    const d = dayInfo(new Date(2026, 8, 20))
    expect(d.kind).toBe('makeup')
    expect(d.isWorkday).toBe(true)
  })
  it('dateKey 用本地日期', () => expect(dateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01'))
})

describe('每月应出勤', () => {
  it('内置了 2026 年数据', () => {
    expect(holidayYears()).toEqual([2026])
    expect(hasHolidayData(2026)).toBe(true)
  })
  // 22 个周一至周五，减 9/25 中秋，加 9/20 调休 = 22 天
  it('2026 年 9 月 22 天 176 小时', () => {
    expect(monthWorkdays(2026, 9)).toHaveLength(22)
    expect(monthRequiredHours(2026, 9)).toBe(176)
  })
  // 22 个周一至周五，减 10/1 10/2 10/5 10/6 10/7，加 10/10 调休 = 18 天
  it('2026 年 10 月 18 天 144 小时', () => expect(monthRequiredHours(2026, 10)).toBe(144))
  // 20 个周一至周五，减春节 2/16-2/20 与 2/23，加 2/14 2/28 调休 = 16 天
  it('2026 年 2 月 16 天 128 小时', () => expect(monthRequiredHours(2026, 2)).toBe(128))
})

describe('运行时登记新数据', () => {
  it('2027 年内置为空，按周一至周五算', () => {
    expect(hasHolidayData(2027)).toBe(false)
    expect(dayInfo(new Date(2027, 0, 1)).kind).toBe('workday') // 2027-01-01 是周五
  })
  it('登记后立即生效，可覆盖', () => {
    const changed = registerHolidayFile({
      year: 2027,
      days: [
        { name: '元旦', date: '2027-01-01', isOffDay: true },
        { name: '元旦', date: '2027-01-03', isOffDay: false },
      ],
    })
    expect(changed).toBe(true)
    expect(hasHolidayData(2027)).toBe(true)
    expect(dayInfo(new Date(2027, 0, 1))).toMatchObject({ kind: 'holiday', name: '元旦', isWorkday: false })
    expect(dayInfo(new Date(2027, 0, 3))).toMatchObject({ kind: 'makeup', isWorkday: true }) // 周日调休
  })
  it('相同内容再登记一次，报告无变化', () => {
    const same = registerHolidayFile({
      year: 2027,
      days: [
        { name: '元旦', date: '2027-01-01', isOffDay: true },
        { name: '元旦', date: '2027-01-03', isOffDay: false },
      ],
    })
    expect(same).toBe(false)
  })
  it('换一份数据，旧条目被清掉', () => {
    registerHolidayFile({ year: 2027, days: [{ name: '春节', date: '2027-02-05', isOffDay: true }] })
    expect(dayInfo(new Date(2027, 0, 1)).kind).toBe('workday')
    expect(dayInfo(new Date(2027, 1, 5)).kind).toBe('holiday')
  })
})
