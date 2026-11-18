# 永貞國小數位閱讀成果網 —「永貞閱讀網成果」雲端後台架接說明

網站已直接架接您的目標 Google Drive 雲端資料夾：
- **資料夾名稱**：`永貞閱讀網成果`
- **資料夾 ID**：`1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak`
- **雲端連結**：https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing
- **網站內嵌即時後台檢視器**：`https://drive.google.com/embeddedfolderview?id=1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak#grid`

---

## 一、目前已直接啟用之功能（免寫程式、開箱即用）

1. **學生端：即時拍照＋自動壓縮＋標準命名直連雲端**
   - 學生於首頁點擊 **「📸 學生拍照／上傳作業」**，填寫班級、座號、姓名與作業主題並完成拍照（或選取圖檔／PDF）。
   - 點擊 **「☁️ 確認上傳至『永貞閱讀網成果』雲端」** 後，系統會：
     1. 自動將影像最佳化並依規範重新命名為 `YYYYMMDD_班級_座號_姓名_作業主題.jpg`。
     2. 自動記錄於網站後台收件名冊。
     3. 自動下載該標準命名檔案並同步開啟 `永貞閱讀網成果` 雲端資料夾（若已綁定下方 Apps Script 端點，則直接於背景靜默寫入雲端硬碟）。

2. **教師後台：網站內直接檢視雲端資料夾＆匯出名冊**
   - 點擊首頁 **「📊 學習成果後台（永貞閱讀網成果）」**（或彈窗上方第 2 個分頁），即可直接在網頁內檢視 `永貞閱讀網成果` 雲端資料夾內的所有學生作品（支援 **🖼️ 縮圖格狀檢視** 與 **📋 詳細清單檢視** 切換、一鍵重新整理，以及匯出 `.CSV` 作業收件名冊）。

---

## 二、雲端資料夾權限設定（10 秒開啟寫入權限）

經系統檢測，目標資料夾 `永貞閱讀網成果`（擁有者：`bing@ms2.yes.mlc.edu.tw`）目前的連結分享權限預設為 **「檢視者 (Viewer)」**。請執行以下設定以允許學生與後台寫入作業檔案：

1. 使用 `bing@ms2.yes.mlc.edu.tw` 開啟 [永貞閱讀網成果 Google Drive 資料夾](https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing)。
2. 點擊標題右側或按右鍵選 **「共用 (Share)」**。
3. 將「一般存取權 — 知道連結的任何人」由「檢視者」改為 **「編輯者 (Editor)」**（或將 `keroro87124@gmail.com` 加入為編輯者），按下完成。

---

## 三、選用進階：一鍵啟用「已預建於您雲端硬碟」的免跳轉背景自動寫入腳本

我們已透過 Google Drive API 直接在您的雲端硬碟建立好完整的收件腳本專案，並已共用編輯權限給 `bing@ms2.yes.mlc.edu.tw`（**完全不需自行複製貼上程式碼**）：

- **已預建之 Google Apps Script 專案網址**：
  https://script.google.com/d/1x8I4WIHBZYQ3_36lFw5iPpUP_ao-xgkvJxdHi0OOZidXqrComsefqY5g/edit

若希望學生按下「確認上傳」時**完全免跳視窗、直接在背景自動寫入雲端資料夾**：
1. 點開上方預建專案連結。
2. 點選右上角 **「部署」 ➔ 「新增部署作業」**（類型選「網頁應用程式」、執行身分選「**我**」、誰可以存取選「**任何人**」）並按「部署」。
3. 點開產生的網頁應用程式網址，畫面會出現 **「🚀 一鍵綁定並返回【永貞國小數位閱讀成果網】」** 按鈕，點擊即可自動完成綁定（或將該 `.../exec` 網址填入 `js/upload-config.js` 的 `appsScriptUrl` 欄位）。
