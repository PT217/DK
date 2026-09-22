<script setup lang="ts">
import { computed } from 'vue'
import { useHolidays } from '@/composables/useHolidays'
import { usePunch } from '@/composables/usePunch'
import { dayInfo, hasHolidayData, KIND_LABEL } from '@/lib/calendar'
import { STANDARD_HOURS } from '@/lib/config'
import { confirmDialog, toast } from '@/lib/dialog'
import { monthSummary, recordMinutes } from '@/lib/stats'
import { formatClock, formatDuration } from '@/lib/time'

const { now, today, records, checkIn, checkOut, undoCheckIn, undoCheckOut } = usePunch()
const { holidayVersion, refreshHolidays, describeSync } = useHolidays()

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
// 下面几个 computed 都读一下 holidayVersion，节假日数据联网更新后会自动重算
const info = computed(() => (holidayVersion.value, dayInfo(now.value)))
const dateText = computed(
  () => `${now.value.getMonth() + 1}月${now.value.getDate()}日 周${WEEK[now.value.getDay()]}`,
)
const clockText = computed(() => now.value.toTimeString().slice(0, 8))
const kindText = computed(() =>
  info.value.name ? `${KIND_LABEL[info.value.kind]} · ${info.value.name}` : KIND_LABEL[info.value.kind],
)

const todayMinutes = computed(() => recordMinutes(today.value, now.value))
const inProgress = computed(() => !!today.value.checkIn && !today.value.checkOut)

const summary = computed(
  () => (holidayVersion.value, monthSummary(records.value, now.value.getFullYear(), now.value.getMonth() + 1, now.value)),
)
const diff = computed(() => summary.value.workedMinutes - summary.value.requiredMinutes)
const pct = computed(() =>
  summary.value.requiredMinutes
    ? Math.min(100, Math.round((summary.value.workedMinutes / summary.value.requiredMinutes) * 100))
    : 0,
)
const noData = computed(() => (holidayVersion.value, !hasHolidayData(now.value.getFullYear())))

async function onCheckOut() {
  if (today.value.checkOut) {
    const ok = await confirmDialog(`已在 ${formatClock(today.value.checkOut)} 打过下班卡，更新为现在？`)
    if (!ok) return
  }
  checkOut()
}
async function onUndoIn() {
  if (await confirmDialog('撤销今天的上班打卡？下班打卡也会一并清除。')) undoCheckIn()
}
async function onUndoOut() {
  if (await confirmDialog('撤销今天的下班打卡？')) undoCheckOut()
}
function openMonth() {
  uni.navigateTo({ url: '/pages/month/month' })
}
function openBackup() {
  uni.navigateTo({ url: '/pages/backup/backup' })
}
async function fetchNow() {
  toast('正在获取…')
  toast(describeSync(await refreshHolidays(true)))
}
</script>

<template>
  <view class="page home">
    <view class="head">
      <text class="date">{{ dateText }}</text>
      <text class="badge" :class="info.kind">{{ kindText }}</text>
    </view>

    <view class="clock">{{ clockText }}</view>

    <view class="punch">
      <button class="btn in" hover-class="pressed" :disabled="!!today.checkIn" @click="checkIn">
        <text class="label">上班打卡</text>
        <text class="time">{{ today.checkIn ? formatClock(today.checkIn) : '未打卡' }}</text>
      </button>
      <button class="btn out" hover-class="pressed" :disabled="!today.checkIn" @click="onCheckOut">
        <text class="label">下班打卡</text>
        <text class="time">{{ today.checkOut ? formatClock(today.checkOut) : '未打卡' }}</text>
      </button>
    </view>

    <view class="undo">
      <button v-if="today.checkOut" class="link" hover-class="none" @click="onUndoOut">撤销下班打卡</button>
      <button v-if="today.checkIn" class="link" hover-class="none" @click="onUndoIn">撤销上班打卡</button>
    </view>

    <view class="today">
      <text>今日工时</text>
      <text class="big">{{ formatDuration(todayMinutes) }}</text>
      <text v-if="inProgress" class="muted small">（进行中）</text>
      <text class="muted">/ {{ STANDARD_HOURS }}小时</text>
    </view>

    <view class="card month" @click="openMonth">
      <view class="row head-row">
        <text class="bold">{{ summary.month }}月统计</text>
        <text class="muted">查看明细 ›</text>
      </view>
      <view v-if="noData" class="warn" @click.stop="fetchNow">
        尚无 {{ summary.year }} 年节假日数据，暂按周一至周五计算<text class="act">立即获取</text>
      </view>
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
      <view class="bar"><view class="fill" :style="{ width: pct + '%' }" /></view>
    </view>

    <view class="footer">
      <button class="link muted" hover-class="none" @click="openBackup">数据备份与恢复</button>
    </view>
  </view>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
}
.date {
  font-size: 17px;
  font-weight: 600;
}
.clock {
  font-size: 56px;
  font-weight: 200;
  text-align: center;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
  margin: 18px 0 26px;
}
.punch {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 118px;
  border-radius: 22px;
  color: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}
.btn.pressed {
  transform: scale(0.97);
}
.btn[disabled] {
  opacity: 0.45;
  color: #fff;
  box-shadow: none;
}
.btn.in {
  background: #34c759;
}
.btn.out {
  background: #5856d6;
}
.btn .label {
  font-size: 22px;
  font-weight: 700;
}
.btn .time {
  font-size: 15px;
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}
.undo {
  display: flex;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  margin-top: 6px;
}
.today {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin: 14px 0 18px;
  font-size: 15px;
}
.today .big {
  font-size: 22px;
  font-weight: 700;
}
.today .small {
  font-size: 12px;
}
.bold {
  font-weight: 700;
}
.head-row {
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5ea;
  margin-bottom: 4px;
}
.bar {
  height: 6px;
  background: #e5e5ea;
  border-radius: 3px;
  margin-top: 10px;
  overflow: hidden;
}
.bar .fill {
  height: 100%;
  background: #007aff;
  border-radius: 3px;
  transition: width 0.3s;
}
.footer {
  text-align: center;
  margin-top: 18px;
}
.footer .link {
  font-size: 13px;
}
</style>
