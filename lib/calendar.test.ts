import { describe, expect, it } from 'vitest'
import { dateKey, dayInfo, HOLIDAY_YEARS, monthRequiredHours, monthWorkdays } from './calendar'

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
  it('内置了 2026 年数据', () => expect(HOLIDAY_YEARS).toContain(2026))
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
