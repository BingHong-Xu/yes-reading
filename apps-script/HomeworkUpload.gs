/**
 * 永貞國小數位閱讀成果網 — 學生作業拍照自動上傳 Google Drive 接收端 (Google Apps Script)
 * 目標雲端資料夾：「永貞閱讀網成果」 (ID: 1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak)
 *
 * 部署步驟：
 * 1. 使用擁有「永貞閱讀網成果」資料夾編輯權限的 Google 帳號登入 https://script.google.com/
 * 2. 新增專案 -> 將本檔案全部貼入 程式碼.gs
 * 3. 右上角「部署」->「新增部署作業」-> 類型選「網頁應用程式」
 *    - 執行身分：我（您的帳號）
 *    - 誰可以存取：任何人
 * 4. 複製產生的網頁應用程式網址 (https://script.google.com/macros/s/.../exec)
 * 5. 貼入網站 js/upload-config.js 的 appsScriptUrl 欄位（或於網站「教師雲端串接設定」貼上啟用）
 */

const TARGET_FOLDER_ID = "1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak";
const LOG_SHEET_NAME = "學生閱讀作業自動收件紀錄表";
const MAX_DECODED_BYTES = 15 * 1024 * 1024; // 15 MB

function doGet(e) {
  try {
    var rootFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    return jsonResponse_({
      ok: true,
      service: "YongzhenReadingHomeworkUpload",
      folderName: rootFolder.getName(),
      folderId: TARGET_FOLDER_ID,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: "Empty request body" });
    }

    var payload = JSON.parse(e.postData.contents);
    var base64Data = String(payload.base64Data || "");
    var rawName = String(payload.fileName || ("homework_" + Date.now() + ".jpg"));
    var mimeType = String(payload.mimeType || "image/jpeg");
    var topic = sanitizeSegment_(payload.topic || "一般閱讀作業");
    var studentClass = sanitizeSegment_(payload.studentClass || "未填班級");
    var seatNo = sanitizeSegment_(payload.seatNo || "00");
    var studentName = sanitizeSegment_(payload.studentName || "未填姓名");
    var note = String(payload.note || "").slice(0, 300);

    if (!base64Data) {
      return jsonResponse_({ ok: false, error: "缺少上傳檔案內容 (base64Data)" });
    }
    var allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedMimes.indexOf(mimeType) === -1) {
      return jsonResponse_({ ok: false, error: "不支援的檔案格式：" + mimeType });
    }

    var bytes = Utilities.base64Decode(base64Data);
    if (bytes.length > MAX_DECODED_BYTES) {
      return jsonResponse_({ ok: false, error: "檔案超過 15 MB 上限" });
    }

    var safeFileName = sanitizeFileName_(rawName);
    var rootFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    var topicFolder = getOrCreateSubfolder_(rootFolder, topic);
    var blob = Utilities.newBlob(bytes, mimeType, safeFileName);
    var createdFile = topicFolder.createFile(blob);

    appendSubmissionLog_(rootFolder, {
      submittedAt: new Date(),
      studentClass: studentClass,
      seatNo: seatNo,
      studentName: studentName,
      topic: topic,
      note: note,
      fileName: safeFileName,
      fileId: createdFile.getId(),
      fileUrl: createdFile.getUrl()
    });

    return jsonResponse_({
      ok: true,
      fileId: createdFile.getId(),
      fileName: safeFileName,
      folderName: rootFolder.getName() + " / " + topicFolder.getName()
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function getOrCreateSubfolder_(parentFolder, name) {
  var it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function sanitizeSegment_(s) {
  return String(s || "").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim().slice(0, 60) || "未分類";
}

function sanitizeFileName_(s) {
  var clean = String(s || "").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim();
  return clean.slice(0, 120) || ("upload_" + Date.now() + ".jpg");
}

function appendSubmissionLog_(rootFolder, entry) {
  var files = rootFolder.getFilesByName(LOG_SHEET_NAME);
  var ss = files.hasNext() ? SpreadsheetApp.openById(files.next().getId()) : null;
  if (!ss) {
    ss = SpreadsheetApp.create(LOG_SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(rootFolder);
    ss.getActiveSheet().appendRow(["繳交時間", "班級", "座號", "學生姓名", "作業主題", "學生備註", "檔案名稱", "雲端連結"]);
  }
  ss.getActiveSheet().appendRow([
    Utilities.formatDate(entry.submittedAt, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
    entry.studentClass,
    entry.seatNo,
    entry.studentName,
    entry.topic,
    entry.note,
    entry.fileName,
    entry.fileUrl
  ]);
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
