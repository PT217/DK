import { describe, expect, it } from 'vitest'
import { exportBackup, mergeRecords, parseBackup, summarize } from './backup'

const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m).getTime()
const records = {
  '2026-09-22': { checkIn: at(22, 8, 30) },
  '2026-09-21': { checkIn: at(21, 8, 30), checkOut: at(21, 19, 0) },
}

describe('exportBackup / parseBackup 往返', () => {
  it('导出再导入得到相同记录，且按日期排序', () => {
    const text = exportBackup(records, new Date(2026, 8, 22, 10, 0))
    const parsed = JSON.parse(text)
    expect(parsed.app).toBe('punch-clock')
    expect(Object.keys(parsed.records)).toEqual(['2026-09-21', '2026-09-22'])
    const r = parseBackup(text)
    expect(r.records).toEqual(records)
    expect(r.count).toBe(2)
    expect(r.skipped).toBe(0)
    expect(r.from).toBe('2026-09-21')
    expect(r.to).toBe('2026-09-22')
    expect(r.exportedAt).toBeDefined()
  })
  it('也接受直接粘贴存储里的原始对象', () => {
    const r = parseBackup(JSON.stringify(records))
    expect(r.count).toBe(2)
    expect(r.exportedAt).toBeUndefined()
  })
})

describe('parseBackup 容错', () => {
  it('不是 JSON', () => expect(() => parseBackup('hello')).toThrow('JSON'))
  it('空对象', () => expect(() => parseBackup('{}')).toThrow('没有打卡记录'))
  it('数组', () => expect(() => parseBackup('[1,2]')).toThrow('没有打卡记录'))
  it('坏条目被跳过，好条目保留', () => {
    const r = parseBackup(
      JSON.stringify({
        '2026-09-21': { checkIn: at(21, 8, 30) },
        'not-a-date': { checkIn: 1 },
        '2026-09-22': { checkIn: 'abc' },
        '2026-09-23': {},
        '2026-09-24': null,
      }),
    )
    expect(r.count).toBe(1)
    expect(r.skipped).toBe(4)
  })
  it('前后有空白也能解析', () => expect(parseBackup('  \n' + JSON.stringify(records) + '\n ').count).toBe(2))
})

describe('mergeRecords', () => {
  it('同一天以导入为准，其余保留', () => {
    const merged = mergeRecords(records, { '2026-09-22': { checkIn: 1, checkOut: 2 }, '2026-09-01': { checkIn: 3 } })
    expect(Object.keys(merged)).toEqual(['2026-09-01', '2026-09-21', '2026-09-22'])
    expect(merged['2026-09-22']).toEqual({ checkIn: 1, checkOut: 2 })
    expect(merged['2026-09-21']).toEqual(records['2026-09-21'])
  })
})

describe('summarize', () => {
  it('有记录', () => expect(summarize(records)).toEqual({ count: 2, from: '2026-09-21', to: '2026-09-22' }))
  it('无记录', () => expect(summarize({})).toEqual({ count: 0, from: undefined, to: undefined }))
})
