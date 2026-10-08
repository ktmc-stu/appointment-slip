# Appointment Slip 列印系统
静态网站（GitHub Pages）+ Firebase Realtime Database 跨装置即时同步。
小票尺寸 80×140mm，浏览器直接打印，每张底部固定附 `Printed at YYYY-MM-DD HH:mm:ss`。

## 页面
- `index.html` 控制台：单笔录入 / Excel 汇入 / 编辑删除 / 学校名称
- `kiosk.html` Kiosk：按日期筛选 → 点卡片选取 → 列印全部 / 列印已选 / 测试页

## 部署到 GitHub Pages
1. 新建 repo，照目录结构上传全部文件
2. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
3. 打开 `https://<用户名>.github.io/<repo>/`

## 开启跨装置同步（Firebase，免费）
1. console.firebase.google.com → 新增专案
2. Build → Realtime Database → Create Database → 选地区 → **Start in test mode**
3. 专案设定（⚙）→ Your apps → Web（`</>`）→ 注册 app → 复制 firebaseConfig
4. 贴入 `js/config.js` 的 `firebase` 栏位（`databaseURL` 必填），重新部署
5. 长期使用：Database → Rules 改为
   `{ "rules": { ".read": true, ".write": true } }`
   ⚠️ 这代表知道网址者可读写；介意请改用 Firebase Authentication。

## Excel 格式
第一行为标题，栏位名可自动辨认：Form / Class No / Should see / Date / Time / Room / Remark
（中文也可：日期、时间、备注、座号…）；汇入前可手动改对应并预览。

## 打印设置（Chrome / Edge）
- 目的地选小票机，纸张大小 **80 × 140 mm**（如没有，先在打印机偏好里新增自定义纸张）
- 边距：无 · 缩放：100% · 取消勾选页眉页脚
