import { describe, expect, it } from 'vitest'
import { formatDuration, hmToMin, minToHm, workedMinutes } from './time'

const w = (a: string, b: string) => workedMinutes(hmToMin(a), hmToMin(b))

describe('workedMinutes', () => {
  it('标准一天 8:30-19:00 正好 8 小时', () => expect(w('08:30', '19:00')).toBe(480))
  it('迟到半小时', () => expect(w('09:00', '19:00')).toBe(450))
  it('早退到 17:30，扣午休不扣晚休', () => expect(w('08:30', '17:30')).toBe(420))
  it('早到不计', () => expect(w('08:00', '19:00')).toBe(480))
  it('加班计入', () => expect(w('08:30', '20:00')).toBe(540))
  it('只在午休期间', () => expect(w('12:30', '13:30')).toBe(0))
  it('跨过午休', () => expect(w('11:00', '15:00')).toBe(120))
  it('下班早于上班', () => expect(w('19:00', '08:30')).toBe(0))
})

describe('format', () => {
  it('hm 往返', () => expect(minToHm(hmToMin('08:05'))).toBe('08:05'))
  it('formatDuration', () => {
    expect(formatDuration(480)).toBe('8小时')
    expect(formatDuration(450)).toBe('7小时30分')
    expect(formatDuration(30)).toBe('30分')
    expect(formatDuration(0)).toBe('0小时')
  })
})
