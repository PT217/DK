<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePunch } from '@/composables/usePunch'
import { exportBackup, mergeRecords, parseBackup, summarize, type ParseResult } from '@/lib/backup'
import { confirmDialog, toast } from '@/lib/dialog'

const { records, replaceRecords } = usePunch()

const LAST_EXPORT_KEY = 'backup-last-export'
const lastExport = ref<number>(Number(uni.getStorageSync(LAST_EXPORT_KEY)) || 0)
const stat = computed(() => summarize(records.value))
const pasted = ref('')
const busy = ref(false)

function fmt(ms: number) {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function markExported() {
  lastExport.value = Date.now()
  uni.setStorageSync(LAST_EXPORT_KEY, String(lastExport.value))
}

/* ---------- 导出 ---------- */

function copyToClipboard() {
  const text = exportBackup(records.value)
  uni.setClipboardData({
    data: text,
    showToast: false,
    success: () => {
      markExported()
      toast(`已复制 ${stat.value.count} 条记录，粘贴到备忘录或聊天窗口即可保存`)
    },
    fail: () => toast('复制失败'),
  })
}

/** App 端：写成文件并用系统预览打开，预览页右上角可以「存储到文件」或发给微信 */
async function saveAsFile() {
  // #ifdef APP-PLUS
  busy.value = true
  try {
    const text = exportBackup(records.value)
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const name = `打卡备份-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
    const path = await writeDocFile(name, text)
    markExported()
    uni.openDocument({
      filePath: path,
      showMenu: true,
      fail: () => toast(`已保存到应用文档目录：${name}，但无法打开预览`),
    })
  } catch (e) {
    toast('保存失败：' + String((e as Error)?.message ?? e))
  } finally {
    busy.value = false
  }
  // #endif
  // #ifndef APP-PLUS
  downloadInBrowser()
  // #endif
}

// #ifdef APP-PLUS
function writeDocFile(name: string, text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      '_doc/',
      (dir) => {
        ;(dir as PlusIoDirectoryEntry).getFile(
          name,
          { create: true },
          (file) => {
            file.createWriter(
              (writer) => {
                writer.onwriteend = () => resolve(plus.io.convertLocalFileSystemURL(file.fullPath ?? `_doc/${name}`))
                writer.onerror = () => reject(new Error('写文件失败'))
                writer.write(text)
              },
              () => reject(new Error('无法创建写入器')),
            )
          },
          () => reject(new Error('无法创建文件')),
        )
      },
      () => reject(new Error('无法访问文档目录')),
    )
  })
}
// #endif

// #ifndef APP-PLUS
function downloadInBrowser() {
  const text = exportBackup(records.value)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `打卡备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  markExported()
}
// #endif

/* ---------- 导入 ---------- */

function importFromClipboard() {
  uni.getClipboardData({
    success: (res) => applyText(String(res.data ?? '')),
    fail: () => toast('读取剪贴板失败'),
  })
}

function importFromPaste() {
  applyText(pasted.value)
}

async function applyText(text: string) {
  let parsed: ParseResult
  try {
    parsed = parseBackup(text)
  } catch (e) {
    toast((e as Error).message)
    return
  }
  const desc =
    `${parsed.count} 条记录，${parsed.from} 至 ${parsed.to}` +
    (parsed.skipped ? `，另有 ${parsed.skipped} 条格式不对已跳过` : '') +
    (parsed.exportedAt ? `\n导出于 ${fmt(Date.parse(parsed.exportedAt))}` : '')

  uni.showActionSheet({
    itemList: ['合并：同一天以导入为准，其余保留', '替换：清空现有记录后导入'],
    title: desc,
    success: async (res) => {
      if (res.tapIndex === 0) {
        replaceRecords(mergeRecords(records.value, parsed.records))
        toast(`已合并，现有 ${summarize(records.value).count} 条记录`)
      } else {
        const ok = await confirmDialog(`现有 ${stat.value.count} 条记录将被全部清除，改为导入的 ${parsed.count} 条。确定？`)
        if (!ok) return
        replaceRecords(parsed.records)
        toast(`已替换为 ${parsed.count} 条记录`)
      }
      pasted.value = ''
    },
  })
}
</script>

<template>
  <view class="page backup">
    <view class="card">
      <view class="row">
        <text>当前记录</text>
        <text class="bold">{{ stat.count }} 条</text>
      </view>
      <view v-if="stat.count" class="row">
        <text>日期范围</text>
        <text class="bold">{{ stat.from }} 至 {{ stat.to }}</text>
      </view>
      <view class="row">
        <text>上次导出</text>
        <text :class="lastExport ? 'bold' : 'muted'">{{ lastExport ? fmt(lastExport) : '从未' }}</text>
      </view>
    </view>

    <view class="section-title">导出</view>
    <view class="card">
      <button class="act" hover-class="pressed" :disabled="!stat.count" @click="copyToClipboard">复制到剪贴板</button>
      <button class="act" hover-class="pressed" :disabled="!stat.count || busy" @click="saveAsFile">
        <!-- #ifdef APP-PLUS -->
        保存为文件
        <!-- #endif -->
        <!-- #ifndef APP-PLUS -->
        下载文件
        <!-- #endif -->
      </button>
      <view class="tip">
        复制后粘贴到备忘录、微信文件传输助手都可以。保存为文件后在预览页点分享，可存到「文件」App 或发给微信。
      </view>
    </view>

    <view class="section-title">导入</view>
    <view class="card">
      <button class="act" hover-class="pressed" @click="importFromClipboard">从剪贴板导入</button>
      <textarea
        v-model="pasted"
        class="paste"
        placeholder="或把备份内容粘贴到这里"
        :maxlength="-1"
        auto-height
      />
      <button class="act" hover-class="pressed" :disabled="!pasted.trim()" @click="importFromPaste">导入上面的内容</button>
      <view class="tip">导入时可以选择合并或替换。合并不会删除现有记录，同一天以导入的为准。</view>
    </view>

    <view class="section-title">数据在哪里</view>
    <view class="card note">
      <view>记录只存在这台手机上应用自己的存储区，不上传。</view>
      <view>覆盖安装新版本不会丢，卸载会丢，换手机也不会自动带过去。</view>
      <view>手机整机备份（iCloud 或电脑备份）会包含这些数据。</view>
      <view>换手机或重装前，先在这里导出一份。</view>
    </view>
  </view>
</template>

<style scoped>
.section-title {
  color: #8e8e93;
  font-size: 13px;
  margin: 18px 4px 6px;
}
.bold {
  font-weight: 700;
}
.act {
  display: block;
  width: 100%;
  margin: 0 0 10px;
  padding: 12px 0;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  border: none;
  line-height: normal;
}
.act::after {
  border: none;
}
.act.pressed {
  opacity: 0.6;
}
.act[disabled] {
  opacity: 0.35;
  color: #007aff;
}
.tip {
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.6;
  margin-top: 2px;
}
.paste {
  width: 100%;
  min-height: 90px;
  box-sizing: border-box;
  padding: 10px;
  margin: 0 0 10px;
  border-radius: 10px;
  background: #f2f2f7;
  font-size: 13px;
  font-family: Menlo, Consolas, monospace;
}
.note {
  font-size: 14px;
  line-height: 1.8;
  color: #3a3a3c;
}
</style>
