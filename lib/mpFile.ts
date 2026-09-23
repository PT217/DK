/**
 * 微信小程序专用：用户文件读写与聊天分享。
 * 只能在 MP-WEIXIN 条件编译块里调用，其他平台不会执行到这里。
 */
declare const wx: any

function userFilePath(name: string): string {
  return `${wx.env.USER_DATA_PATH}/${name}`
}

/**
 * 把文本同步写到小程序的用户文件目录，返回完整路径。失败时直接抛错。
 * 故意用同步接口：wx.shareFileMessage 必须在用户点击事件里同步调用，
 * 中间一旦 await 过异步写文件，真机就会报「can only be invoked by user TAP gesture」。
 */
export function writeUserFileSync(name: string, text: string): string {
  const filePath = userFilePath(name)
  uni.getFileSystemManager().writeFileSync(filePath, text, 'utf8')
  return filePath
}

/**
 * 把文件发到微信聊天（比如文件传输助手）。需要微信基础库 2.16.1 以上。
 * 必须在点击事件回调里同步调用，调用前不能有任何 await。
 * 用户在选人页面取消时抛出 message 为「已取消」的错误。
 */
export function shareFileToChat(filePath: string, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof wx.shareFileMessage !== 'function') {
      reject(new Error('当前微信版本不支持发送文件，请用复制到剪贴板'))
      return
    }
    wx.shareFileMessage({
      filePath,
      fileName,
      success: () => resolve(),
      fail: (e: { errMsg?: string }) => {
        const msg = e?.errMsg ?? '发送失败'
        reject(new Error(msg.includes('cancel') ? '已取消' : msg))
      },
    })
  })
}

/** 从聊天记录里选一个 json 文件并读出文本。用户取消时抛出 message 为「已取消」的错误。 */
export function chooseChatFileText(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json', 'txt'],
      success: (res) => {
        const f = res.tempFiles?.[0]
        if (!f) {
          reject(new Error('没有选择文件'))
          return
        }
        uni.getFileSystemManager().readFile({
          filePath: f.path,
          encoding: 'utf8',
          success: (r) => resolve(String(r.data)),
          fail: (e) => reject(new Error(e?.errMsg ?? '读文件失败')),
        })
      },
      fail: (e) => reject(new Error(String(e?.errMsg ?? '').includes('cancel') ? '已取消' : (e?.errMsg ?? '选择文件失败'))),
    })
  })
}
