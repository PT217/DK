/** 节假日数据的来源与校验。纯函数，不依赖 uni 运行时，可单独测试。 */

export interface HolidayDay {
  name: string
  date: string
  isOffDay: boolean
}

export interface HolidayFile {
  year: number
  days: HolidayDay[]
}

/**
 * 数据来源，按顺序逐个尝试，成功即停。
 * 前两个是 jsDelivr CDN 镜像，国内可直连；最后一个是 GitHub 原始地址。
 * 上游仓库 https://github.com/NateScarlet/holiday-cn 跟随国务院办公厅通知更新。
 */
export const SOURCES: ReadonlyArray<(year: number) => string> = [
  (y) => `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${y}.json`,
  (y) => `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${y}.json`,
  (y) => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${y}.json`,
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 校验下载到的内容。形状不对返回 null。
 * days 为空数组是合法的，表示国务院尚未发布该年安排。
 */
export function parseHolidayFile(raw: unknown, year: number): HolidayFile | null {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { year?: unknown; days?: unknown }
  if (o.year !== year || !Array.isArray(o.days)) return null
  const days: HolidayDay[] = []
  for (const d of o.days) {
    if (!d || typeof d !== 'object') return null
    const { name, date, isOffDay } = d as Record<string, unknown>
    if (typeof name !== 'string' || typeof date !== 'string' || typeof isOffDay !== 'boolean') return null
    if (!DATE_RE.test(date) || !date.startsWith(`${year}-`)) return null
    days.push({ name, date, isOffDay })
  }
  return { year, days }
}

/**
 * 需要保证有数据的年份。
 * 今年始终检查；明年从 10 月起开始检查，因为国务院一般在 10 月底到 12 月初发布次年安排。
 */
export function yearsToSync(now: Date): number[] {
  const y = now.getFullYear()
  return now.getMonth() + 1 >= 10 ? [y, y + 1] : [y]
}

const DAY = 24 * 60 * 60 * 1000

/**
 * 是否该联网检查某一年。
 * 没有数据的年份每天查一次，直到拿到；已有数据的年份 30 天复查一次，因为官方偶有修订。
 */
export function shouldCheck(lastCheckMs: number | undefined, hasData: boolean, now: Date): boolean {
  if (lastCheckMs === undefined) return true
  const age = now.getTime() - lastCheckMs
  return age >= (hasData ? 30 * DAY : DAY)
}
