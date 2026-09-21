import { describe, expect, it } from 'vitest'
import { monthSummary, recordMinutes } from './stats'

const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m).getTime()

describe('recordMinutes', () => {
  it('完整一天', () => expect(recordMinutes({ checkIn: at(21, 8, 30), checkOut: at(21, 19, 0) })).toBe(480))
  it('未打下班卡且传入 now，算进行中', () =>
    expect(recordMinutes({ checkIn: at(21, 8, 30) }, new Date(2026, 8, 21, 11, 0))).toBe(150))
  it('未打下班卡且已过当天，记 0', () =>
    expect(recordMinutes({ checkIn: at(20, 8, 30) }, new Date(2026, 8, 21, 11, 0))).toBe(0))
  // 8:30 到 24:00 共 930 分钟，扣午休 120 与晚休 30 = 780
  it('跨午夜下班按 24:00 截止', () =>
    expect(recordMinutes({ checkIn: at(21, 8, 30), checkOut: at(22, 1, 0) })).toBe(780))
})

describe('monthSummary', () => {
  it('2026 年 9 月', () => {
    const s = monthSummary(
      {
        '2026-09-21': { checkIn: at(21, 8, 30), checkOut: at(21, 19, 0) },
        '2026-09-22': { checkIn: at(22, 9, 0), checkOut: at(22, 18, 0) },
      },
      2026,
      9,
    )
    expect(s.requiredDays).toBe(22)
    expect(s.requiredMinutes).toBe(22 * 480)
    expect(s.workedDays).toBe(2)
    expect(s.workedMinutes).toBe(480 + 420)
    expect(s.days).toHaveLength(30)
  })
})
