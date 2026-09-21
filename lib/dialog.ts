/** 把 uni 的回调式弹窗包成 Promise，方便在页面里 await */

export function confirmDialog(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

export function toast(title: string): void {
  uni.showToast({ title, icon: 'none' })
}
