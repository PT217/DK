# 打卡（uni-app 版）

只有「上班打卡」「下班打卡」两个按钮的打卡应用。按中国法定节假日与调休安排计算每月应出勤工时，数据只存在本机。

技术栈：uni-app（Vue 3 + TypeScript），用 HBuilderX 云打包出 iOS 的 ipa，通过蒲公英分发给测试设备。全程在 Windows 上完成，不需要 Mac。

## 规则

| 项目 | 值 | 位置 |
|---|---|---|
| 上班 / 下班 | 08:30 / 19:00 | `lib/config.ts` |
| 休息时段 | 12:00–14:00、18:00–18:30 | 同上 |
| 每日标准工时 | 8 小时 | 同上 |
| 早到 | 不计 | `COUNT_EARLY` |
| 加班（19:00 之后） | 计入 | `COUNT_OVERTIME` |
| 调休补班日 | 计入应出勤 | `COUNT_MAKEUP_DAYS` |

每月应出勤 = 该月（周一至周五 − 法定节假日 + 调休补班日）× 8 小时。

## 目录

```
App.vue              全局样式
main.js              入口
pages.json           页面注册与导航栏
manifest.json        应用配置（AppID、版本、图标）
pages/index/         主界面：两个打卡按钮 + 本月统计
pages/month/         月度明细：逐日记录，可补卡修改
composables/usePunch 打卡状态与本地存储
lib/                 纯计算：作息规则、工时、日历、统计
data/                国务院节假日安排 JSON
```

`npm test` 只跑 `lib/` 下的单元测试，打包不依赖 npm。

---

## 一、为什么要付费开发者账号

| 方式 | 有效期 | 设备数 | 是否可用蒲公英 |
|---|---|---|---|
| 免费 Apple ID，Xcode 签名 | 7 天 | 3 台 | 否，必须连电脑 |
| 个人开发者账号，Ad Hoc | 1 年 | 100 台 | 是 |
| 企业开发者账号，In-House | 1 年 | 不限 | 是，但只对公司开放且极难申请 |
| TestFlight | 90 天 | 10000 人 | 不需要蒲公英，走 App Store Connect |

要用蒲公英分发，走 **Ad Hoc** 这条路。需要一个 Apple Developer Program 个人账号，每年 99 美元，国内约 688 元，在 <https://developer.apple.com/programs/enroll/> 用 Apple ID 申请，通常 1 到 2 天通过。

Ad Hoc 的限制：只能装在预先登记 UDID 的设备上，每年最多 100 台。新增设备要重新生成描述文件并重新打包。

## 二、Windows 上生成证书

以下命令在 Git Bash 里运行，Git for Windows 自带 OpenSSL。

### 1. 生成私钥和证书请求

```bash
mkdir -p ~/ios-cert && cd ~/ios-cert
openssl genrsa -out ios_distribution.key 2048
openssl req -new -key ios_distribution.key -out ios_distribution.csr \
  -subj "/emailAddress=你的邮箱/CN=你的名字/C=CN"
```

`ios_distribution.key` 是私钥，务必保存好，丢了就要重做整套证书。

### 2. 在苹果后台申请证书

打开 <https://developer.apple.com/account/resources/certificates/list>：

1. 点 **+** → 选 **Apple Distribution** → Continue。
2. 上传上一步的 `ios_distribution.csr` → Continue。
3. 下载得到 `distribution.cer`，放进 `~/ios-cert/`。

### 3. 转成 .p12

```bash
cd ~/ios-cert
openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
openssl pkcs12 -export -legacy -inkey ios_distribution.key -in distribution.pem -out ios_distribution.p12
```

会提示设置导出密码，这个密码就是后面 HBuilderX 里要填的「证书私钥密码」。

`-legacy` 是给 OpenSSL 3.x 用的，让生成的 p12 采用旧加密格式，否则云打包可能报证书密码错误。如果你的 OpenSSL 是 1.x 且报 `unknown option -legacy`，去掉这个参数即可。

### 4. 登记 App ID

<https://developer.apple.com/account/resources/identifiers/list>：

1. 点 **+** → **App IDs** → **App** → Continue。
2. Description 随便填，Bundle ID 选 **Explicit**，填一个反域名，例如 `com.你的名字.punchclock`。记住它，后面要保持一致。
3. Capabilities 什么都不用勾 → Register。

### 5. 登记测试设备的 UDID

先拿到每台 iPhone 的 UDID。最省事的办法：在 iPhone 的 Safari 里打开 <https://www.pgyer.com/tools/udid>，按提示安装一个描述文件，页面就会显示 UDID。Windows 上也可以用爱思助手查看。

然后到 <https://developer.apple.com/account/resources/devices/list>：点 **+** → Platform 选 iOS → 填设备名和 UDID → Continue → Register。多台设备可以用 **Register Multiple Devices** 上传文件。

### 6. 生成 Ad Hoc 描述文件

<https://developer.apple.com/account/resources/profiles/list>：

1. 点 **+** → Distribution 下选 **Ad Hoc** → Continue。
2. App ID 选第 4 步登记的那个 → Continue。
3. Certificates 选第 2 步的证书 → Continue。
4. Devices 勾选要安装的设备 → Continue。
5. 起个名字 → Generate → Download，得到 `xxx.mobileprovision`。

到这里手上应该有三样东西：`ios_distribution.p12`、它的密码、`xxx.mobileprovision`。

## 三、HBuilderX 云打包

1. 从 <https://www.dcloud.io/hbuilderx.html> 下载 **App开发版** 并安装，注册并登录 DCloud 账号，按提示完成账号认证。
2. **文件 → 导入 → 从本地目录导入**，选本项目目录。
3. 双击打开 `manifest.json`，在 **基础配置** 里点「重新获取」生成 uni-app 应用标识（AppID）。应用名称和版本号按需改。
4. 可选：**App图标配置** 里上传一张 1024×1024 的图，点「自动生成所有图标并替换」。
5. 在项目上右键 → **发行 → 原生App-云打包**：
   - 勾选 **iOS**，取消 Android。
   - 选 **使用苹果证书**。
   - Bundle ID 填第 4 步登记的那个。
   - 证书私钥密码填 p12 的导出密码。
   - 证书 profile 文件选 `.mobileprovision`。
   - 私钥证书选 `.p12`。
   - 点 **打包**。
6. 等几分钟到十几分钟，控制台会打印下载链接。也可以在 **发行 → 原生App-云打包 → 查看云打包状态** 里下载。得到 `.ipa` 文件。

免费账号每天云打包次数有限制，打包前先在 HBuilderX 里 **运行 → 运行到浏览器** 把功能过一遍。

## 四、蒲公英分发

1. 在 <https://www.pgyer.com> 注册，进入 **上传应用**，把 `.ipa` 拖进去。
2. 上传完成得到一个下载页链接和二维码。
3. 测试设备用 Safari 打开链接，点安装，回到桌面等图标出现即可。Ad Hoc 不需要去「设置」里信任证书。

装不上的常见原因：

- 设备 UDID 没登记进描述文件。回到第 5、6 步补上，重新生成描述文件，重新打包。
- Bundle ID 和描述文件对不上。
- 证书或描述文件已过期。证书和描述文件都是 1 年有效，到期前重新生成并重新打包，否则已装的应用会打不开。

## 五、更新节假日数据

节假日数据在 `data/<年份>.json`，来自 <https://github.com/NateScarlet/holiday-cn>，该仓库跟随国务院办公厅通知更新。每年通知发布后（一般是前一年 11 月）下载对应年份的 JSON 覆盖进去，并确认 `lib/calendar.ts` 顶部已 import。没有数据的年份会按周一至周五计算，界面上会有提示。

## 六、数据存储

打卡记录通过 `uni.setStorageSync` 存在本机，键为 `punch-records-v1`，格式：

```json
{ "2026-09-21": { "checkIn": 1789999800000, "checkOut": 1790037600000 } }
```

在月度明细里点任意一天可以补卡、修改或清除记录。卸载应用数据会一起清除。
