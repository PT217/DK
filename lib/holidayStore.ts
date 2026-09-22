import { hasHolidayData, registerHolidayFile } from './calendar'
import { parseHolidayFile, shouldCheck, SOURCES, yearsToSync, type HolidayFile } from './holidaySource'

/** 已下载的数据：年份 -> 文件 */
const DATA_KEY = 'holiday-data-v1'
/** 上次联网检查时间：年份 -> 时间戳 */
const CHECK_KEY = 'holiday-check-v1'

type DataCache = Record<string, HolidayFile>
type CheckCache = Record<string, number>

function readJson<T>(key: string, fallback: T): T {
  const v = uni.getStorageSync(key)
  if (!v) return fallback
  try {
    return (typeof v === 'string' ? JSON.parse(v) : v) as T
  } catch {
    return fallback
  }
}

/** 启动时把上次下载的数据登记进日历，覆盖内置的同年数据。返回登记的年份。 */
export function loadCachedHolidays(): number[] {
  const cache = readJson<DataCache>(DATA_KEY, {})
  const years: number[] = []
  for (const f of Object.values(cache)) {
    if (f && Array.isArray(f.days) && f.days.length > 0) {
      registerHolidayFile(f)
      years.push(f.year)
    }
  }
  return years
}

function request(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 10000,
      dataType: 'json',
      success: (res) => (res.statusCode === 200 ? resolve(res.data) : reject(new Error(`HTTP ${res.statusCode}`))),
      fail: (err) => reject(err),
    })
  })
}

async function fetchYear(year: number): Promise<HolidayFile | null> {
  for (const source of SOURCES) {
    try {
      const file = parseHolidayFile(await request(source(year)), year)
      if (file) return file
    } catch {
      // 换下一个来源
    }
  }
  return null
}

export interface SyncResult {
  /** 下载到新内容并已生效的年份 */
  updated: number[]
  /** 下载成功但与现有数据相同的年份 */
  unchanged: number[]
  /** 上游还是空的，国务院尚未发布 */
  pending: number[]
  /** 所有来源都失败 */
  failed: number[]
}

/**
 * 按需联网更新节假日数据。
 * 检查哪些年份、多久查一次由 holidaySource.ts 决定；force 为 true 时忽略间隔立即查。
 */
export async function syncHolidays(now = new Date(), force = false): Promise<SyncResult> {
  const data = readJson<DataCache>(DATA_KEY, {})
  const checks = readJson<CheckCache>(CHECK_KEY, {})
  const result: SyncResult = { updated: [], unchanged: [], pending: [], failed: [] }
  let touched = false

  for (const year of yearsToSync(now)) {
    if (!force && !shouldCheck(checks[year], hasHolidayData(year), now)) continue
    touched = true
    const file = await fetchYear(year)
    if (!file) {
      result.failed.push(year)
      continue
    }
    checks[year] = now.getTime()
    if (file.days.length === 0) {
      result.pending.push(year)
      continue
    }
    data[year] = file
    if (registerHolidayFile(file)) result.updated.push(year)
    else result.unchanged.push(year)
  }

  if (touched) {
    uni.setStorageSync(DATA_KEY, JSON.stringify(data))
    uni.setStorageSync(CHECK_KEY, JSON.stringify(checks))
  }
  return result
}
