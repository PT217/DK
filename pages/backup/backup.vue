<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePunch } from '@/composables/usePunch'
import { exportBackup, mergeRecords, parseBackup, summarize, type ParseResult } from '@/lib/backup'
import { confirmDialog, toast } from '@/lib/dialog'
// #ifdef MP-WEIXIN
import { chooseChatFileText, shareFileToChat, writeUserFile } from '@/lib/mpFile'
// #endif

const { records, replaceRecords } = usePunch()

const LAST_EXPORT_KEY = 'backup-last-export'
const lastExport = ref<number>(Number(uni.getStorageSync(LAST_EXPORT_KEY)) || 0)
const stat = computed(() => summarize(records.value))
const pasted = ref('')
const busy = ref(false)

const p2 = (n: number) => String(n).padStart(2, '0')
function fmt(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
function fileName() {
  const d = new Date()
  return `打卡备份-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.json`
}
function markExported() {
  lastExport.value = Date.now()
  uni.setStorageSync(LAST_EXPORT_KEY, String(lastExport.value))
}
function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg !== '已取消') toast(msg)
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

// #ifdef APP-PLUS
/** App：写成文件并用系统预览打开，预览页右上角可以「存储到文件」或发给微信 */
async function saveAsFile() {
  busy.value = true
  try {
    const name = fileName()
    const path = await writeDocFile(name, exportBackup(records.value))
    markExported()
    uni.openDocument({
      filePath: path,
      showMenu: true,
      fail: () => toast(`已保存到应用文档目录：${name}，但无法打开预览`),
    })
  } catch (e) {
    fail(e)
  } finally {
    busy.value = false
  }
}
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

// #ifdef H5
/** 浏览器：直接下载 */
function downloadInBrowser() {
  const blob = new Blob([exportBackup(records.value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName()
  a.click()
  URL.revokeObjectURL(url)
  markExported()
}
// #endif

// #ifdef MP-WEIXIN
/** 微信小程序：写成文件后发到聊天，发给「文件传输助手」就存下来了 */
async function sendToChat() {
  busy.value = true
  try {
    const name = fileName()
    const path = await writeUserFile(name, exportBackup(records.value))
    await shareFileToChat(path, name)
    markExported()
  } catch (e) {
    fail(e)
  } finally {
    busy.value = false
  }
}
/** 微信小程序：从聊天记录里选备份文件 */
async function importFromChat() {
  try {
    await applyText(await chooseChatFileText())
  } catch (e) {
    fail(e)
  }
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
    (parsed.exportedAt ? `。导出于 ${fmt(Date.parse(parsed.exportedAt))}` : '')

  uni.showActionSheet({
    itemList: ['合并：同一天以导入为准，其余保留', '替换：清空现有记录后导入'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        if (!(await confirmDialog(`${desc}。\n合并到现有 ${stat.value.count} 条记录中，同一天以导入为准。`, '确认合并'))) return
        replaceRecords(mergeRecords(records.value, parsed.records))
        toast(`已合并，现有 ${summarize(records.value).count} 条记录`)
      } else {
        if (!(await confirmDialog(`${desc}。\n现有 ${stat.value.count} 条记录将被全部清除。`, '确认替换'))) return
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
      <!-- #ifdef APP-PLUS -->
      <button class="act" hover-class="pressed" :disabled="!stat.count || busy" @click="saveAsFile">保存为文件</button>
      <view class="tip">复制后粘贴到备忘录、微信文件传输助手都可以。保存为文件后在预览页点分享，可存到「文件」App 或发给微信。</view>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <button class="act" hover-class="pressed" :disabled="!stat.count || busy" @click="downloadInBrowser">下载文件</button>
      <view class="tip">复制后粘贴到备忘录或聊天窗口即可保存，或直接下载成 json 文件。</view>
      <!-- #endif -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="act" hover-class="pressed" :disabled="!stat.count || busy" @click="sendToChat">发送到微信聊天</button>
      <view class="tip">发给「文件传输助手」或自己的收藏就存下来了。复制到剪贴板后也可以粘贴到备忘录。</view>
      <!-- #endif -->
    </view>

    <view class="section-title">导入</view>
    <view class="card">
      <button class="act" hover-class="pressed" @click="importFromClipboard">从剪贴板导入</button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="act" hover-class="pressed" @click="importFromChat">从微信聊天选择文件</button>
      <!-- #endif -->
      <textarea v-model="pasted" class="paste" placeholder="或把备份内容粘贴到这里" :maxlength="-1" auto-height />
      <button class="act" hover-class="pressed" :disabled="!pasted.trim()" @click="importFromPaste">导入上面的内容</button>
      <view class="tip">导入时可以选择合并或替换。合并不会删除现有记录，同一天以导入的为准。</view>
    </view>

    <view class="section-title">数据在哪里</view>
    <view class="card note">
      <!-- #ifdef MP-WEIXIN -->
      <view>记录只存在微信为这个小程序分配的本机存储里，不上传。</view>
      <view>小程序更新版本不会丢；删除小程序、清理微信存储空间、换手机都会丢。</view>
      <view>换手机或清理前，先在这里导出一份。</view>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view>记录只存在这台手机上应用自己的存储区，不上传。</view>
      <view>覆盖安装新版本不会丢，卸载会丢，换手机也不会自动带过去。</view>
      <view>手机整机备份（iCloud 或电脑备份）会包含这些数据。</view>
      <view>换手机或重装前，先在这里导出一份。</view>
      <!-- #endif -->
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
  background: rgba(0, 122, 255, 0.1);
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
