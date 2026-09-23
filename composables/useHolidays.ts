import { ref } from 'vue'
import { loadCachedHolidays, syncHolidays, type SyncResult } from '@/lib/holidayStore'

/** 节假日数据每次变化加一。页面的 computed 读它一下，数据更新后就会自动重算。 */
export const holidayVersion = ref(0)

let syncing: Promise<SyncResult> | null = null

/** 应用启动时调用：把上次下载的数据装进日历 */
export function initHolidays(): void {
  if (loadCachedHolidays().length > 0) holidayVersion.value++
}

/** 联网检查更新。同一时刻只跑一个。force 为 true 时忽略检查间隔。 */
export function refreshHolidays(force = false): Promise<SyncResult> {
  if (syncing) return syncing
  syncing = syncHolidays(new Date(), force)
    .then((r) => {
      if (r.updated.length > 0) holidayVersion.value++
      return r
    })
    .finally(() => {
      syncing = null
    })
  return syncing
}

/** 手动刷新后给用户的一句话反馈 */
export function describeSync(r: SyncResult): string {
  if (r.updated.length > 0) return `已更新 ${r.updated.join('、')} 年节假日安排`
  if (r.pending.length > 0) return `${r.pending.join('、')} 年安排国务院尚未发布`
  if (r.failed.length > 0) {
    // #ifdef MP-WEIXIN
    return '获取失败：小程序只能访问后台登记的备案域名，见 README'
    // #endif
    // #ifndef MP-WEIXIN
    return '获取失败，请检查网络'
    // #endif
  }
  return '节假日数据已是最新'
}

export function useHolidays() {
  return { holidayVersion, refreshHolidays, describeSync }
}
