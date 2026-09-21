import { computed, ref } from 'vue'
import { dateKey } from '@/lib/calendar'
import { loadRecords, saveRecords, type DayRecord, type Records } from '@/lib/storage'
import { hmToMin } from '@/lib/time'

// 模块级单例状态，两个页面共享。uni 存储是同步的，启动时直接读出来。
const records = ref<Records>(loadRecords())
const now = ref(new Date())
setInterval(() => {
  now.value = new Date()
}, 1000)

export function usePunch() {
  const todayKey = computed(() => dateKey(now.value))
  const today = computed<DayRecord>(() => records.value[todayKey.value] ?? {})

  function update(key: string, patch: (r: DayRecord) => DayRecord | undefined) {
    const next = { ...records.value }
    const r = patch({ ...(next[key] ?? {}) })
    if (!r || (r.checkIn === undefined && r.checkOut === undefined)) delete next[key]
    else next[key] = r
    records.value = next
    saveRecords(next)
  }

  /** 上班打卡：只记第一次 */
  const checkIn = () => update(todayKey.value, (r) => (r.checkIn ? r : { ...r, checkIn: Date.now() }))
  /** 下班打卡：以最后一次为准 */
  const checkOut = () => update(todayKey.value, (r) => ({ ...r, checkOut: Date.now() }))
  /** 撤销上班打卡会清掉整天 */
  const undoCheckIn = () => update(todayKey.value, () => undefined)
  const undoCheckOut = () =>
    update(todayKey.value, (r) => {
      const { checkOut: _omit, ...rest } = r
      return rest
    })
  const clearDay = (key: string) => update(key, () => undefined)

  /** 手动设置某日上下班时间（"HH:mm"），用于补卡或修正 */
  const setDayTimes = (key: string, inHm: string, outHm?: string) =>
    update(key, () => {
      const [y, m, d] = key.split('-').map(Number)
      const at = (hm: string) => {
        const min = hmToMin(hm)
        return new Date(y, m - 1, d, Math.floor(min / 60), min % 60).getTime()
      }
      const r: DayRecord = { checkIn: at(inHm) }
      if (outHm) r.checkOut = at(outHm)
      return r
    })

  return {
    records,
    now,
    todayKey,
    today,
    checkIn,
    checkOut,
    undoCheckIn,
    undoCheckOut,
    clearDay,
    setDayTimes,
  }
}
