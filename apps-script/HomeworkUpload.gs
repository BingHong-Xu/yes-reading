/**
 * 永貞國小數位閱讀成果網 — 學生作業拍照自動上傳 Google Drive 接收端 (Google Apps Script)
 * 目標雲端資料夾：「永貞閱讀網成果」 (ID: 1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak)
 * 雲端資料夾網址：https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing
 * 線上腳本專案網址：https://script.google.com/d/1ib953S4wbSMz6ey5hC3aZOyudQT-KoPgOKPGXsNGxgNOMZKUT-2YNDG5/edit
 */

const TARGET_FOLDER_ID = "1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak";
const PORTAL_URL = "https://binghong-xu.github.io/yes-reading/";
const LOG_SHEET_NAME = "學生閱讀作業自動收件紀錄表";
const MAX_DECODED_BYTES = 15 * 1024 * 1024; // 15 MB

function doGet(e) {
  try {
    var rootFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    var execUrl = "";
    try {
      execUrl = ScriptApp.getService().getUrl() || "";
    } catch (ignore) {}

    if (e && e.parameter && e.parameter.format === "json") {
      return jsonResponse_({
        ok: true,
        service: "YongzhenReadingHomeworkUpload",
        folderName: rootFolder.getName(),
        folderId: TARGET_FOLDER_ID,
        execUrl: execUrl,
        timestamp: new Date().toISOString()
      });
    }

    var bindLink = execUrl
      ? PORTAL_URL + "?gas=" + encodeURIComponent(execUrl) + "#homework-zone"
      : PORTAL_URL + "#homework-zone";

    var html = [
      "<!DOCTYPE html><html lang='zh-Hant'><head><meta charset='utf-8'>",
      "<meta name='viewport' content='width=device-width,initial-scale=1'>",
      "<title>永貞閱讀網成果 — 雲端收件後台已就緒</title>",
      "<style>body{font-family:sans-serif;background:#f8fafc;color:#0f172a;padding:32px;line-height:1.6}",
      ".card{max-width:640px;margin:0 auto;background:#fff;border:2px solid #1e3a8a;border-radius:16px;padding:28px;box-shadow:0 12px 30px rgba(15,23,42,.08)}",
      "h1{color:#1e3a8a;font-size:1.35rem;margin-top:0}",
      ".code{background:#f1f5f9;padding:10px 12px;border-radius:8px;font-family:monospace;word-break:break-all;font-size:.9rem}",
      ".btn{display:inline-block;margin-top:16px;background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700}",
      "</style></head><body><div class='card'>",
      "<h1>✅ 永貞國小數位閱讀成果網｜雲端作業收件端點運作中</h1>",
      "<p>已成功連結目標雲端資料夾：<strong>" + rootFolder.getName() + "</strong>（<code>" + TARGET_FOLDER_ID + "</code>）</p>",
      execUrl ? "<p>您的專屬收件端點網址：</p><div class='code'>" + execUrl + "</div>" : "",
      "<a class='btn' href='" + bindLink + "'>🚀 一鍵綁定並返回【永貞國小數位閱讀成果網】</a>",
      "</div></body></html>"
    ].join("");

    return HtmlService.createHtmlOutput(html).setTitle("永貞閱讀網成果 — 雲端收件後台已就緒");
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
    var targetFolder = rootFolder;
    try {
      targetFolder = getOrCreateSubfolder_(rootFolder, topic);
    } catch (subErr) {
      targetFolder = rootFolder;
    }

    var blob = Utilities.newBlob(bytes, mimeType, safeFileName);
    blob.setDescription("永貞國小閱讀作業｜班級：" + studentClass + "｜座號：" + seatNo + "｜姓名：" + studentName + "｜主題：" + topic + (note ? "｜備註：" + note : ""));
    var createdFile = targetFolder.createFile(blob);

    try {
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
    } catch (logErr) {
      // 若試算表 API 未啟用或權限受限，不影響學生作業檔案本身寫入雲端硬碟
    }

    return jsonResponse_({
      ok: true,
      fileId: createdFile.getId(),
      fileName: safeFileName,
      fileUrl: createdFile.getUrl(),
      folderName: rootFolder.getName() + (targetFolder.getId() !== rootFolder.getId() ? " / " + targetFolder.getName() : "")
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
