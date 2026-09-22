import { describe, expect, it } from 'vitest'
import { parseHolidayFile, shouldCheck, SOURCES, yearsToSync } from './holidaySource'

describe('parseHolidayFile', () => {
  const good = { year: 2027, papers: [], days: [{ name: '元旦', date: '2027-01-01', isOffDay: true }] }
  it('合法数据', () => {
    const f = parseHolidayFile(good, 2027)
    expect(f).toEqual({ year: 2027, days: [{ name: '元旦', date: '2027-01-01', isOffDay: true }] })
  })
  it('接受 JSON 字符串', () => expect(parseHolidayFile(JSON.stringify(good), 2027)?.days).toHaveLength(1))
  it('days 为空表示尚未发布，合法', () => expect(parseHolidayFile({ year: 2027, days: [] }, 2027)).toEqual({ year: 2027, days: [] }))
  it('年份对不上', () => expect(parseHolidayFile(good, 2026)).toBeNull())
  it('条目缺字段', () => expect(parseHolidayFile({ year: 2027, days: [{ name: '元旦', date: '2027-01-01' }] }, 2027)).toBeNull())
  it('日期不属于该年', () => expect(parseHolidayFile({ year: 2027, days: [{ name: 'x', date: '2026-01-01', isOffDay: true }] }, 2027)).toBeNull())
  it('不是 JSON', () => expect(parseHolidayFile('<html>', 2027)).toBeNull())
  it('HTML 错误页', () => expect(parseHolidayFile({ error: 'Not Found' }, 2027)).toBeNull())
})

describe('yearsToSync', () => {
  it('9 月只查今年', () => expect(yearsToSync(new Date(2026, 8, 22))).toEqual([2026]))
  it('10 月起连明年一起查', () => expect(yearsToSync(new Date(2026, 9, 1))).toEqual([2026, 2027]))
  it('12 月连明年一起查', () => expect(yearsToSync(new Date(2026, 11, 15))).toEqual([2026, 2027]))
})

describe('shouldCheck', () => {
  const now = new Date(2026, 11, 1, 9, 0)
  const hoursAgo = (h: number) => now.getTime() - h * 3600 * 1000
  it('从未查过', () => expect(shouldCheck(undefined, false, now)).toBe(true))
  it('没数据，12 小时前查过，不查', () => expect(shouldCheck(hoursAgo(12), false, now)).toBe(false))
  it('没数据，25 小时前查过，查', () => expect(shouldCheck(hoursAgo(25), false, now)).toBe(true))
  it('有数据，10 天前查过，不查', () => expect(shouldCheck(hoursAgo(24 * 10), true, now)).toBe(false))
  it('有数据，31 天前查过，查', () => expect(shouldCheck(hoursAgo(24 * 31), true, now)).toBe(true))
})

describe('SOURCES', () => {
  it('三个来源都指向 holiday-cn 的年份文件', () => {
    const urls = SOURCES.map((s) => s(2027))
    expect(urls).toHaveLength(3)
    for (const u of urls) expect(u).toMatch(/holiday-cn.*2027\.json$/)
  })
})
