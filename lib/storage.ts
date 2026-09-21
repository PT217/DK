export interface DayRecord {
  /** 上班打卡时间戳（毫秒） */
  checkIn?: number
  /** 下班打卡时间戳（毫秒） */
  checkOut?: number
}

/** key 为 YYYY-MM-DD */
export type Records = Record<string, DayRecord>

const KEY = 'punch-records-v1'

/** 本地存储：App 上是原生 KV 存储，H5 上是 localStorage */
export function loadRecords(): Records {
  const value = uni.getStorageSync(KEY)
  if (!value) return {}
  try {
    return (typeof value === 'string' ? JSON.parse(value) : value) as Records
  } catch {
    return {}
  }
}

export function saveRecords(records: Records): void {
  uni.setStorageSync(KEY, JSON.stringify(records))
}
