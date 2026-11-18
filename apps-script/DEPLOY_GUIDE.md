# 永貞國小「學生作業拍照自動上傳 Google 雲端」部署指引

本網站前端（GitHub Pages 靜態網頁）已內建手機／平板相機即時拍照、圖檔自動壓縮與標準檔名命名功能。由於靜態網頁無法將 Google 私人授權金鑰寫入公開程式碼中，因此需透過 **Google 免費官方服務 Google Apps Script Web App** 作為安全寫入橋樑，將學生作業自動存入您的雲端資料夾：

- **目標資料夾名稱**：`永貞閱讀網成果`
- **目標資料夾 ID**：`1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak`
- **資料夾網址**：https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing

---

## 3 分鐘啟用步驟（一次性設定）

1. 使用**具備 `1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak` 編輯權限**的 Google 帳號，開啟 https://script.google.com/ 並點選「**新專案**」。
2. 清空預設程式碼，完整貼入同目錄下的 [`HomeworkUpload.gs`](./HomeworkUpload.gs) 內容，按 **Ctrl + S** 儲存（專案可命名為 `永貞作業拍照收件端點`）。
3. 點擊右上角藍色按鈕「**部署**」→「**新增部署作業**」。
4. 左側齒輪「選取類型」挑選「**網頁應用程式（Web app）**」：
   - **執行身分（Execute as）**：選 **我（Me）**
   - **誰可以存取（Who has access）**：選 **任何人（Anyone）**
5. 點擊「**部署**」並完成 Google 權限授予（若跳出未驗證應用程式畫面，點「進階」→「前往…（不安全）」→「允許」）。
6. 複製產生的「**網頁應用程式 URL**」（格式如 `https://script.google.com/macros/s/AKfycb.../exec`）。
7. 啟用方式（二選一）：
   - **全校學生全面生效（推薦）**：將該網址填入網站檔案 `js/upload-config.js` 的 `appsScriptUrl: "您的網址"` 並推送至 GitHub `yes-reading`。
   - **單機即時測試**：直接於網站「拍照並上傳專區」底部的「教師雲端串接設定」貼上網址並按儲存測試。

## 自動化結果
每次學生拍照或上傳後，後端會自動：
1. 在「永貞閱讀網成果」資料夾下**依作業主題自動建立子資料夾**。
2. 以 `日期_班級_座號_姓名_作業主題.jpg` 格式存入壓縮後清晰作業圖檔（或 PDF）。
3. 自動建立／更新一份《學生閱讀作業自動收件紀錄表》Google 試算表方便教師快速核對交件名單與檔案超連結。
