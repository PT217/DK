/** 打卡记录的导入导出。纯函数，不依赖 uni 运行时。 */
import type { DayRecord, Records } from './storage'

export const BACKUP_APP = 'punch-clock'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  records: Records
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 生成备份文本（带缩进的 JSON，方便人看） */
export function exportBackup(records: Records, now = new Date()): string {
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    records: sortRecords(records),
  }
  return JSON.stringify(backup, null, 2)
}

export interface ParseResult {
  records: Records
  /** 合法条目数 */
  count: number
  /** 被丢弃的条目数 */
  skipped: number
  /** 记录覆盖的日期范围 */
  from?: string
  to?: string
  exportedAt?: string
}

/**
 * 解析备份文本。接受两种格式：exportBackup 的输出，或直接是 records 对象。
 * 单条不合法的记录跳过，整体不是 JSON 或没有记录则抛错。
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text.trim())
  } catch {
    throw new Error('不是有效的 JSON 文本')
  }
  if (!raw || typeof raw !== 'object') throw new Error('内容格式不对')

  const o = raw as Record<string, unknown>
  let source: Record<string, unknown>
  let exportedAt: string | undefined
  if (o.app === BACKUP_APP && o.records && typeof o.records === 'object') {
    source = o.records as Record<string, unknown>
    if (typeof o.exportedAt === 'string') exportedAt = o.exportedAt
  } else {
    source = o
  }

  const records: Records = {}
  let skipped = 0
  for (const [key, val] of Object.entries(source)) {
    const rec = toRecord(key, val)
    if (rec) records[key] = rec
    else skipped++
  }
  const keys = Object.keys(records).sort()
  if (keys.length === 0) throw new Error('里面没有打卡记录')
  return { records, count: keys.length, skipped, from: keys[0], to: keys[keys.length - 1], exportedAt }
}

function toRecord(key: string, val: unknown): DayRecord | null {
  if (!DATE_RE.test(key) || !val || typeof val !== 'object') return null
  const { checkIn, checkOut } = val as Record<string, unknown>
  const rec: DayRecord = {}
  if (checkIn !== undefined) {
    if (!isMs(checkIn)) return null
    rec.checkIn = checkIn
  }
  if (checkOut !== undefined) {
    if (!isMs(checkOut)) return null
    rec.checkOut = checkOut
  }
  if (rec.checkIn === undefined && rec.checkOut === undefined) return null
  return rec
}

function isMs(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

/** 合并：同一天以导入的为准，其余保留 */
export function mergeRecords(current: Records, incoming: Records): Records {
  return sortRecords({ ...current, ...incoming })
}

function sortRecords(records: Records): Records {
  const out: Records = {}
  for (const k of Object.keys(records).sort()) out[k] = records[k]
  return out
}

/** 统计信息，给备份页显示 */
export function summarize(records: Records): { count: number; from?: string; to?: string } {
  const keys = Object.keys(records).sort()
  return { count: keys.length, from: keys[0], to: keys[keys.length - 1] }
}
