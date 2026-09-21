<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePunch } from '@/composables/usePunch'
import { hasHolidayData, KIND_LABEL } from '@/lib/calendar'
import { STANDARD_HOURS, WORK_END, WORK_START } from '@/lib/config'
import { confirmDialog, toast } from '@/lib/dialog'
import { monthSummary, type DayStat } from '@/lib/stats'
import { formatClock, formatDuration, hmToMin } from '@/lib/time'

const { records, now, todayKey, setDayTimes, clearDay } = usePunch()

const year = ref(now.value.getFullYear())
const month = ref(now.value.getMonth() + 1)

function shift(delta: number) {
  const d = new Date(year.value, month.value - 1 + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const summary = computed(() => monthSummary(records.value, year.value, month.value, now.value))
const diff = computed(() => summary.value.workedMinutes - summary.value.requiredMinutes)
const noData = computed(() => !hasHolidayData(year.value))
const STANDARD_MIN = STANDARD_HOURS * 60

function weekday(date: string) {
  return '周' + WEEK[new Date(date + 'T00:00:00').getDay()]
}
function kindLabel(d: DayStat) {
  return d.info.name ? `${KIND_LABEL[d.info.kind]}·${d.info.name}` : KIND_LABEL[d.info.kind]
}
function dayNum(date: string) {
  return Number(date.slice(-2))
}
function isShort(d: DayStat) {
  return d.info.isWorkday && !!d.rec?.checkOut && d.minutes < STANDARD_MIN
}

/* 补卡 / 修改面板 */
const editing = ref<DayStat | null>(null)
const inHm = ref(WORK_START)
const outHm = ref(WORK_END)
const hasOut = ref(true)

function edit(d: DayStat) {
  editing.value = d
  inHm.value = d.rec?.checkIn ? formatClock(d.rec.checkIn) : WORK_START
  outHm.value = d.rec?.checkOut ? formatClock(d.rec.checkOut) : WORK_END
  hasOut.value = !d.rec?.checkIn || !!d.rec?.checkOut
}
function onPickIn(e: { detail: { value: string } }) {
  inHm.value = e.detail.value
}
function onPickOut(e: { detail: { value: string } }) {
  outHm.value = e.detail.value
}
function onToggleOut(e: Event) {
  hasOut.value = (e as unknown as { detail: { value: boolean } }).detail.value
}
function save() {
  if (!editing.value) return
  if (hasOut.value && hmToMin(outHm.value) <= hmToMin(inHm.value)) {
    toast('下班时间要晚于上班时间')
    return
  }
  setDayTimes(editing.value.info.date, inHm.value, hasOut.value ? outHm.value : undefined)
  editing.value = null
}
async function clear() {
  if (!editing.value) return
  if (await confirmDialog(`清除 ${editing.value.info.date} 的记录？`)) {
    clearDay(editing.value.info.date)
    editing.value = null
  }
}
</script>

<template>
  <view class="page month-view">
    <view class="nav">
      <button class="arrow" hover-class="none" @click="shift(-1)">‹</button>
      <text class="title">{{ year }}年{{ month }}月</text>
      <button class="arrow" hover-class="none" @click="shift(1)">›</button>
    </view>

    <view class="card totals">
      <view v-if="noData" class="warn">尚无 {{ year }} 年节假日数据，暂按周一至周五计算</view>
      <view class="row">
        <text>应出勤</text>
        <text class="bold">{{ summary.requiredDays }} 天 · {{ formatDuration(summary.requiredMinutes) }}</text>
      </view>
      <view class="row">
        <text>已完成</text>
        <text class="bold">{{ summary.workedDays }} 天 · {{ formatDuration(summary.workedMinutes) }}</text>
      </view>
      <view class="row">
        <text>{{ diff >= 0 ? '已超出' : '还需要' }}</text>
        <text class="bold" :class="diff >= 0 ? 'ok' : 'todo'">{{ formatDuration(Math.abs(diff)) }}</text>
      </view>
    </view>

    <view class="hint">点任一天可补卡或修改</view>

    <view class="days">
      <view
        v-for="d in summary.days"
        :key="d.info.date"
        class="day"
        :class="[d.info.kind, { today: d.info.date === todayKey, off: !d.info.isWorkday }]"
        @click="edit(d)"
      >
        <view class="d">
          <text class="num">{{ dayNum(d.info.date) }}</text>
          <text class="wd">{{ weekday(d.info.date) }}</text>
        </view>
        <view class="k"><text class="badge" :class="d.info.kind">{{ kindLabel(d) }}</text></view>
        <view class="t">
          <text v-if="d.rec?.checkIn">
            {{ formatClock(d.rec.checkIn) }} – {{ d.rec.checkOut ? formatClock(d.rec.checkOut) : '…' }}
          </text>
          <text v-else class="muted">—</text>
        </view>
        <view class="h" :class="{ short: isShort(d) }">{{ d.minutes ? formatDuration(d.minutes) : '' }}</view>
      </view>
    </view>

    <!-- 补卡 / 修改面板 -->
    <view v-if="editing" class="mask" @click="editing = null">
      <view class="sheet" @click.stop>
        <view class="sheet-title">{{ editing.info.date }} {{ weekday(editing.info.date) }}</view>
        <view class="field">
          <text>上班</text>
          <picker mode="time" :value="inHm" @change="onPickIn">
            <view class="pick">{{ inHm }}</view>
          </picker>
        </view>
        <view class="field">
          <text>下班</text>
          <view class="field-right">
            <switch :checked="hasOut" color="#007aff" style="transform: scale(0.8)" @change="onToggleOut" />
            <picker v-if="hasOut" mode="time" :value="outHm" @change="onPickOut">
              <view class="pick">{{ outHm }}</view>
            </picker>
            <text v-else class="muted">未打卡</text>
          </view>
        </view>
        <view class="actions">
          <button v-if="editing.rec" class="link danger" hover-class="none" @click="clear">清除记录</button>
          <view class="spacer" />
          <button class="link" hover-class="none" @click="editing = null">取消</button>
          <button class="link primary" hover-class="none" @click="save">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 4px 0 12px;
}
.nav .title {
  font-size: 17px;
  font-weight: 700;
}
.arrow {
  color: #007aff;
  font-size: 26px;
  padding: 0 12px;
  line-height: 1;
}
.bold {
  font-weight: 700;
}
.hint {
  color: #8e8e93;
  font-size: 12px;
  text-align: center;
  margin: 12px 0 6px;
}
.days {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.day {
  display: grid;
  grid-template-columns: 52px 1fr 1.2fr 76px;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5ea;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.day:last-child {
  border-bottom: 0;
}
.day.off {
  background: rgba(142, 142, 147, 0.06);
}
.day.today {
  box-shadow: inset 3px 0 0 #007aff;
}
.d {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.d .num {
  font-size: 17px;
  font-weight: 700;
}
.d .wd {
  color: #8e8e93;
  font-size: 11px;
}
.t {
  text-align: right;
}
.h {
  text-align: right;
  color: #34c759;
  font-weight: 600;
}
.h.short {
  color: #ff9500;
}

/* 底部面板 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  z-index: 10;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 18px 20px calc(env(safe-area-inset-bottom) + 16px);
}
.sheet-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 10px;
}
.field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e5ea;
  font-size: 16px;
}
.field-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pick {
  min-width: 80px;
  text-align: center;
  padding: 6px 12px;
  border-radius: 10px;
  background: #f2f2f7;
  font-variant-numeric: tabular-nums;
}
.actions {
  display: flex;
  align-items: center;
  margin-top: 12px;
}
.actions .spacer {
  flex: 1;
}
.link.primary {
  font-weight: 700;
}
.link.danger {
  color: #ff3b30;
}
</style>
