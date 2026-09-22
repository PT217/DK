<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { initHolidays, refreshHolidays } from '@/composables/useHolidays'

// 启动时先装入上次下载的节假日数据，再按需联网检查。
// 什么时候查、多久查一次由 lib/holidaySource.ts 决定，这里只管触发。
onLaunch(() => {
  initHolidays()
  refreshHolidays().catch(() => {})
})
// 长期挂后台的应用回到前台也检查一次，间隔控制会拦住多余的请求
onShow(() => {
  refreshHolidays().catch(() => {})
})
</script>

<style>
/* 全局样式：App.vue 里不加 scoped 的 style 对所有页面生效 */
page {
  background: #f2f2f7;
  color: #1c1c1e;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  padding: 12px 16px calc(env(safe-area-inset-bottom) + 24px);
}
.muted {
  color: #8e8e93;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 15px;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #e5e5ea;
  color: #8e8e93;
  white-space: nowrap;
}
.badge.workday {
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
}
.badge.holiday {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}
.badge.makeup {
  background: rgba(255, 149, 0, 0.15);
  color: #ff9500;
}
.ok {
  color: #34c759;
}
.todo {
  color: #ff9500;
}
.warn {
  color: #ff9500;
  font-size: 13px;
  margin: 0 0 6px;
  line-height: 1.5;
}
.warn .act {
  color: #007aff;
  margin-left: 4px;
}
/* 去掉 uni 内置 button 的默认样式 */
.btn,
.link,
.arrow {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  line-height: normal;
  font-size: inherit;
  color: inherit;
}
.btn::after,
.link::after,
.arrow::after {
  border: none;
}
.link {
  color: #007aff;
  font-size: 15px;
  padding: 8px;
  display: inline-block;
}
</style>
