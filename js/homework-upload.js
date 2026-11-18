/* 永貞國小數位閱讀成果網 — 學生拍照上傳＆「永貞閱讀網成果」雲端後台模組 */
(() => {
  const CFG = window.YONGZHEN_UPLOAD_CONFIG || {
    driveFolderId: "1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak",
    driveFolderName: "永貞閱讀網成果",
    driveFolderUrl: "https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing",
    driveEmbedGridUrl: "https://drive.google.com/embeddedfolderview?id=1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak#grid",
    driveEmbedListUrl: "https://drive.google.com/embeddedfolderview?id=1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak#list",
    appsScriptUrl: ""
  };
  const LS_GAS_KEY = "yz_homework_gas_url_v1";
  const LS_LOG_KEY = "yz_homework_submissions_v1";

  const modal = document.getElementById("modal-homework");
  if (!modal) return;

  // 分頁切換元件
  const tabUploadBtn = document.getElementById("hw-tab-btn-upload");
  const tabBackendBtn = document.getElementById("hw-tab-btn-backend");
  const paneUpload = document.getElementById("hw-pane-upload");
  const paneBackend = document.getElementById("hw-pane-backend");

  // 表單與欄位
  const form = document.getElementById("hw-upload-form");
  const classEl = document.getElementById("hw-class");
  const seatEl = document.getElementById("hw-seat");
  const nameEl = document.getElementById("hw-name");
  const topicEl = document.getElementById("hw-topic");
  const noteEl = document.getElementById("hw-note");
  const fnPreviewEl = document.getElementById("hw-filename-preview");

  // 相機與預覽
  const videoEl = document.getElementById("hw-video");
  const previewImgEl = document.getElementById("hw-preview-img");
  const placeholderEl = document.getElementById("hw-cam-placeholder");
  const startCamBtn = document.getElementById("hw-start-cam");
  const flipCamBtn = document.getElementById("hw-flip-cam");
  const snapBtn = document.getElementById("hw-snap-btn");
  const retakeBtn = document.getElementById("hw-retake-btn");
  const fileInputEl = document.getElementById("hw-file-input");
  const fileInfoEl = document.getElementById("hw-file-info");

  // 送出與狀態回饋
  const submitBtn = document.getElementById("hw-submit-btn");
  const downloadBtn = document.getElementById("hw-download-btn");
  const feedbackEl = document.getElementById("hw-feedback");
  const bannerBadgeEl = document.getElementById("hw-banner-status");
  const modalEndpointBadge = document.getElementById("hw-endpoint-status");

  // 後台管理與內嵌 Google Drive 檢視器
  const driveIframe = document.getElementById("hw-drive-iframe");
  const driveGridBtn = document.getElementById("hw-drive-view-grid");
  const driveListBtn = document.getElementById("hw-drive-view-list");
  const driveReloadBtn = document.getElementById("hw-drive-reload");
  const logCountEl = document.getElementById("hw-local-log-count");
  const logTbodyEl = document.getElementById("hw-local-log-tbody");
  const exportCsvBtn = document.getElementById("hw-export-csv");
  const clearLogBtn = document.getElementById("hw-clear-log");

  // 進階端點綁定
  const gasInputEl = document.getElementById("hw-gas-url-input");
  const gasSaveBtn = document.getElementById("hw-gas-save");
  const gasClearBtn = document.getElementById("hw-gas-clear");
  const teacherMsgEl = document.getElementById("hw-teacher-msg");

  let camStream = null;
  let facingMode = "environment";
  let preparedFile = null; // { dataUrl, base64, mimeType, ext, sizeBytes, width, height }
  let currentEmbedMode = "grid";

  function switchHwTab(tabName) {
    const isBackend = tabName === "backend";
    if (tabUploadBtn) {
      tabUploadBtn.classList.toggle("is-active", !isBackend);
      tabUploadBtn.setAttribute("aria-selected", String(!isBackend));
    }
    if (tabBackendBtn) {
      tabBackendBtn.classList.toggle("is-active", isBackend);
      tabBackendBtn.setAttribute("aria-selected", String(isBackend));
    }
    if (paneUpload) paneUpload.hidden = isBackend;
    if (paneBackend) paneBackend.hidden = !isBackend;
    if (isBackend) {
      stopCamera();
      renderLocalSubmissions();
    }
  }

  if (tabUploadBtn) tabUploadBtn.addEventListener("click", () => switchHwTab("upload"));
  if (tabBackendBtn) tabBackendBtn.addEventListener("click", () => switchHwTab("backend"));

  document.querySelectorAll("[data-hw-open-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-hw-open-tab") || "upload";
      setTimeout(() => switchHwTab(targetTab), 20);
    });
  });

  function getActiveGasUrl() {
    const lsUrl = (() => {
      try {
        return (localStorage.getItem(LS_GAS_KEY) || "").trim();
      } catch {
        return "";
      }
    })();
    return lsUrl || (CFG.appsScriptUrl || "").trim();
  }

  function isValidGasUrl(u) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/i.test(u || "");
  }

  function checkUrlAutoBindGas() {
    try {
      const params = new URLSearchParams(window.location.search);
      const gasParam = (params.get("gas") || "").trim();
      if (isValidGasUrl(gasParam)) {
        localStorage.setItem(LS_GAS_KEY, gasParam);
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        if (teacherMsgEl) {
          teacherMsgEl.textContent = "✅ 已透過一鍵連結成功綁定 Google Apps Script 背景直寫端點！";
        }
      }
    } catch {
      /* ignore */
    }
  }

  function refreshEndpointBadges() {
    const url = getActiveGasUrl();
    const hasGas = isValidGasUrl(url);
    if (bannerBadgeEl) {
      bannerBadgeEl.textContent = hasGas
        ? "☁️ 已直連雲端後台：永貞閱讀網成果（Apps Script 全自動背景寫入）"
        : "☁️ 已直接架接雲端後台：永貞閱讀網成果（Google Drive 即時連線）";
    }
    if (modalEndpointBadge) {
      modalEndpointBadge.textContent = hasGas
        ? "狀態：✅ 已啟用背景自動直寫「永貞閱讀網成果」雲端資料夾"
        : "狀態：✅ 已直接架接「永貞閱讀網成果」雲端資料夾（自動命名＋直連開啟後台）";
    }
    if (gasInputEl && url) {
      gasInputEl.value = url;
    }
  }

  function getLocalSubmissions() {
    try {
      const raw = localStorage.getItem(LS_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function recordLocalSubmission(entry) {
    try {
      const list = getLocalSubmissions();
      list.unshift(entry);
      localStorage.setItem(LS_LOG_KEY, JSON.stringify(list.slice(0, 200)));
      renderLocalSubmissions();
    } catch {
      /* ignore */
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLocalSubmissions() {
    const list = getLocalSubmissions();
    if (logCountEl) {
      logCountEl.textContent = `（目前累積 ${list.length} 筆）`;
    }
    if (!logTbodyEl) return;
    if (!list.length) {
      logTbodyEl.innerHTML =
        '<tr><td colspan="7" style="text-align:center; color:#64748b;">尚無本機提交紀錄；學生於「📸 學生端」拍照提交後將自動記錄於此並同步傳送至雲端資料夾。</td></tr>';
      return;
    }
    logTbodyEl.innerHTML = list
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.time)}</td>
          <td>${escapeHtml(item.studentClass)}</td>
          <td>${escapeHtml(item.seatNo)}號</td>
          <td>${escapeHtml(item.studentName)}</td>
          <td>${escapeHtml(item.topic)}</td>
          <td><code>${escapeHtml(item.fileName)}</code></td>
          <td>${escapeHtml(item.mode)}</td>
        </tr>`
      )
      .join("");
  }

  function padSeat(v) {
    const clean = String(v || "").replace(/\D+/g, "");
    if (!clean) return "00";
    return clean.length === 1 ? `0${clean}` : clean.slice(0, 2);
  }

  function todayTag() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}${m}${day}`;
  }

  function formatNowTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function sanitizePart(s, fallback) {
    const out = String(s || "").replace(/[\\/:*?"<>|\s]+/g, "_").trim();
    return out || fallback;
  }

  function buildTargetFilename() {
    const ext = preparedFile ? preparedFile.ext : "jpg";
    const cls = sanitizePart(classEl.value, "班級");
    const seat = `${padSeat(seatEl.value)}號`;
    const nm = sanitizePart(nameEl.value, "姓名");
    const topic = sanitizePart(topicEl.value, "閱讀作業");
    return `${todayTag()}_${cls}_${seat}_${nm}_${topic}.${ext}`;
  }

  function updateFilenamePreview() {
    const fname = buildTargetFilename();
    if (fnPreviewEl) {
      fnPreviewEl.textContent = fname;
    }
    if (downloadBtn && preparedFile) {
      downloadBtn.download = fname;
    }
  }

  function setFeedback(kind, html) {
    if (!feedbackEl) return;
    feedbackEl.className = `hw-feedback-box is-visible is-${kind}`;
    feedbackEl.innerHTML = html;
  }

  function clearFeedback() {
    if (!feedbackEl) return;
    feedbackEl.className = "hw-feedback-box";
    feedbackEl.innerHTML = "";
  }

  function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach((t) => t.stop());
      camStream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.hidden = true;
    }
    if (flipCamBtn) flipCamBtn.hidden = true;
    if (snapBtn) snapBtn.hidden = true;
  }

  function setPlaceholder(text) {
    if (!placeholderEl) return;
    placeholderEl.innerHTML = text;
    placeholderEl.hidden = false;
  }

  function showPreviewImage(dataUrl, infoText) {
    stopCamera();
    if (placeholderEl) placeholderEl.hidden = true;
    if (previewImgEl) {
      previewImgEl.src = dataUrl;
      previewImgEl.hidden = false;
    }
    if (retakeBtn) retakeBtn.hidden = false;
    if (fileInfoEl) fileInfoEl.textContent = infoText;
    if (downloadBtn) {
      downloadBtn.href = dataUrl;
      downloadBtn.download = buildTargetFilename();
      downloadBtn.hidden = false;
    }
    updateFilenamePreview();
  }

  function showPdfPreview(dataUrl, origName, sizeBytes) {
    stopCamera();
    if (previewImgEl) previewImgEl.hidden = true;
    setPlaceholder(
      `📄 已選取 PDF 作業檔：<br><strong>${escapeHtml(origName)}</strong><br>（${(sizeBytes / 1024).toFixed(0)} KB）`
    );
    if (retakeBtn) retakeBtn.hidden = false;
    if (fileInfoEl) fileInfoEl.textContent = `PDF 文件就緒（${(sizeBytes / 1024).toFixed(0)} KB）`;
    if (downloadBtn) {
      downloadBtn.href = dataUrl;
      downloadBtn.download = buildTargetFilename();
      downloadBtn.hidden = false;
    }
    updateFilenamePreview();
  }

  function compressImageCanvas(sourceEl, origW, origH) {
    const MAX_SIDE = 1600;
    let w = origW;
    let h = origH;
    if (w > MAX_SIDE || h > MAX_SIDE) {
      if (w >= h) {
        h = Math.round((h * MAX_SIDE) / w);
        w = MAX_SIDE;
      } else {
        w = Math.round((w * MAX_SIDE) / h);
        h = MAX_SIDE;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(sourceEl, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    const base64 = dataUrl.split(",")[1];
    const approxBytes = Math.round((base64.length * 3) / 4);
    preparedFile = {
      dataUrl,
      base64,
      mimeType: "image/jpeg",
      ext: "jpg",
      sizeBytes: approxBytes,
      width: w,
      height: h
    };
    showPreviewImage(dataUrl, `已自動最佳化：${w} × ${h} px（約 ${(approxBytes / 1024).toFixed(0)} KB）`);
  }

  async function startCamera() {
    clearFeedback();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFeedback("warn", "目前瀏覽器不支援網頁即時鏡頭串流，請點選「從裝置拍照／選檔」呼叫系統相機或挑選作業照片。");
      return;
    }
    stopCamera();
    if (previewImgEl) previewImgEl.hidden = true;
    if (retakeBtn) retakeBtn.hidden = true;
    if (placeholderEl) placeholderEl.hidden = true;

    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false
      });
      videoEl.srcObject = camStream;
      videoEl.hidden = false;
      snapBtn.hidden = false;
      flipCamBtn.hidden = false;
      if (fileInfoEl) fileInfoEl.textContent = "鏡頭已開啟：請將學習單或作品完整置入框內，點擊「拍攝作業」。";
    } catch {
      setPlaceholder("無法取得相機權限或未偵測到鏡頭，請點下方「從裝置拍照／選檔」按鈕完成作業提交。");
      setFeedback("warn", "未取得即時相機權限；您仍可點擊「從裝置拍照／選檔」直接呼叫系統相機或上傳相簿照片與 PDF。");
    }
  }

  if (startCamBtn) startCamBtn.addEventListener("click", startCamera);

  if (flipCamBtn) {
    flipCamBtn.addEventListener("click", () => {
      facingMode = facingMode === "environment" ? "user" : "environment";
      startCamera();
    });
  }

  if (snapBtn) {
    snapBtn.addEventListener("click", () => {
      if (!videoEl || !videoEl.videoWidth) return;
      clearFeedback();
      compressImageCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight);
    });
  }

  if (retakeBtn) {
    retakeBtn.addEventListener("click", () => {
      preparedFile = null;
      if (downloadBtn) downloadBtn.hidden = true;
      if (fileInfoEl) fileInfoEl.textContent = "尚未選擇或拍攝作業影像。";
      startCamera();
    });
  }

  if (fileInputEl) {
    fileInputEl.addEventListener("change", () => {
      const f = fileInputEl.files && fileInputEl.files[0];
      if (!f) return;
      clearFeedback();
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        if (f.size > 10 * 1024 * 1024) {
          setFeedback("err", "PDF 檔案超過 10 MB 限制，請壓縮後再上傳或改以分頁拍照繳交。");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          preparedFile = {
            dataUrl,
            base64: dataUrl.split(",")[1],
            mimeType: "application/pdf",
            ext: "pdf",
            sizeBytes: f.size,
            width: 0,
            height: 0
          };
          showPdfPreview(dataUrl, f.name, f.size);
        };
        reader.readAsDataURL(f);
        return;
      }

      if (!f.type.startsWith("image/")) {
        setFeedback("err", "請選擇圖片檔（JPG／PNG／WEBP）或 PDF 文件。");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => compressImageCanvas(img, img.naturalWidth, img.naturalHeight);
        img.onerror = () => setFeedback("err", "無法讀取圖片檔案，請更換相片後重試。");
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(f);
    });
  }

  [classEl, seatEl, nameEl, topicEl].forEach((el) => {
    if (el) el.addEventListener("input", updateFilenamePreview);
    if (el) el.addEventListener("change", updateFilenamePreview);
  });

  function triggerAutoDownload(dataUrl, fileName) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function reloadEmbeddedDrive() {
    if (!driveIframe) return;
    const base =
      currentEmbedMode === "list"
        ? CFG.driveEmbedListUrl || `https://drive.google.com/embeddedfolderview?id=${CFG.driveFolderId}#list`
        : CFG.driveEmbedGridUrl || `https://drive.google.com/embeddedfolderview?id=${CFG.driveFolderId}#grid`;
    driveIframe.src = base;
  }

  if (driveGridBtn) {
    driveGridBtn.addEventListener("click", () => {
      currentEmbedMode = "grid";
      driveGridBtn.className = "btn btn-primary btn-sm";
      if (driveListBtn) driveListBtn.className = "btn btn-outline btn-sm";
      reloadEmbeddedDrive();
    });
  }

  if (driveListBtn) {
    driveListBtn.addEventListener("click", () => {
      currentEmbedMode = "list";
      driveListBtn.className = "btn btn-primary btn-sm";
      if (driveGridBtn) driveGridBtn.className = "btn btn-outline btn-sm";
      reloadEmbeddedDrive();
    });
  }

  if (driveReloadBtn) {
    driveReloadBtn.addEventListener("click", reloadEmbeddedDrive);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const list = getLocalSubmissions();
      const header = ["繳交時間", "班級", "座號", "學生姓名", "作業主題", "學生心得備註", "標準化檔名", "繳交模式"];
      const rows = list.map((r) => [
        r.time,
        r.studentClass,
        `${r.seatNo}號`,
        r.studentName,
        r.topic,
        r.note || "",
        r.fileName,
        r.mode
      ]);
      const csvContent =
        "\uFEFF" +
        [header, ...rows]
          .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
          .join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      triggerAutoDownload(url, `永貞國小閱讀作業收件名冊_${todayTag()}.csv`);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    });
  }

  if (clearLogBtn) {
    clearLogBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(LS_LOG_KEY);
      } catch {
        /* ignore */
      }
      renderLocalSubmissions();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFeedback();
      if (!preparedFile) {
        setFeedback("err", "請先「開啟即時相機拍攝」或「從裝置拍照／選檔」再提交作業。");
        return;
      }
      const gasUrl = getActiveGasUrl();
      const targetName = buildTargetFilename();
      const entryBase = {
        time: formatNowTime(),
        studentClass: classEl.value,
        seatNo: padSeat(seatEl.value),
        studentName: nameEl.value.trim(),
        topic: topicEl.value,
        note: noteEl ? noteEl.value.trim() : "",
        fileName: targetName
      };

      // 模式 A：若已設定 Apps Script 網頁應用程式端點，先嘗試背景靜默直寫
      if (isValidGasUrl(gasUrl)) {
        submitBtn.disabled = true;
        const origLabel = submitBtn.textContent;
        submitBtn.textContent = "☁️ 正在直接寫入「永貞閱讀網成果」雲端硬碟...";

        try {
          const resp = await fetch(gasUrl, {
            method: "POST",
            body: JSON.stringify({
              folderId: CFG.driveFolderId,
              fileName: targetName,
              mimeType: preparedFile.mimeType,
              base64Data: preparedFile.base64,
              studentClass: entryBase.studentClass,
              seatNo: entryBase.seatNo,
              studentName: entryBase.studentName,
              topic: entryBase.topic,
              note: entryBase.note
            })
          });
          const data = await resp.json();
          if (data && data.ok) {
            recordLocalSubmission({ ...entryBase, mode: "雲端背景自動直寫" });
            reloadEmbeddedDrive();
            setFeedback(
              "ok",
              `✅ 作業已成功自動上傳至 Google 雲端資料夾「<strong>${escapeHtml(data.folderName || CFG.driveFolderName)}</strong>」！<br>標準存檔名稱：<code>${escapeHtml(data.fileName || targetName)}</code>｜<button type="button" class="text-action-btn" id="hw-goto-backend-inline">點此切換至「📊 教師後台」即時檢視 &rarr;</button>`
            );
            const jumpBtn = document.getElementById("hw-goto-backend-inline");
            if (jumpBtn) jumpBtn.addEventListener("click", () => switchHwTab("backend"));
            preparedFile = null;
            fileInputEl.value = "";
            if (previewImgEl) previewImgEl.hidden = true;
            if (retakeBtn) retakeBtn.hidden = true;
            if (downloadBtn) downloadBtn.hidden = true;
            setPlaceholder("✅ 已順利送出至雲端後台！若需補交下一頁，請再按一次拍攝或選檔。");
            return;
          }
        } catch {
          // 若端點連線失敗則無縫降級為雲端資料夾直連模式
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = origLabel;
        }
      }

      // 模式 B（預設免設定直連模式）：自動產出標準命名作業檔、寫入後台收件紀錄並直接開啟 Google Drive「永貞閱讀網成果」資料夾
      triggerAutoDownload(preparedFile.dataUrl, targetName);
      recordLocalSubmission({ ...entryBase, mode: "標準命名＋雲端資料夾直連" });
      try {
        window.open(CFG.driveFolderUrl, "_blank", "noopener,noreferrer");
      } catch {
        /* ignore popup block */
      }

      setFeedback(
        "ok",
        `✅ 已自動產出標準命名作業檔 <code>${escapeHtml(targetName)}</code> 並同步開啟 Google Drive「<strong><a href="${CFG.driveFolderUrl}" target="_blank" rel="noopener noreferrer">永貞閱讀網成果 &#8599;</a></strong>」雲端後台！<br>👉 將剛下載的作業檔直接拖入開啟的雲端資料夾（手機點「<strong>＋新增 ➔ 檔案上傳</strong>」）即完成繳交，老師可立即於上方「<strong>📊 教師後台</strong>」分頁同步檢視與匯出收件名冊。`
      );
    });
  }

  // 進階端點綁定按鈕
  if (gasSaveBtn) {
    gasSaveBtn.addEventListener("click", () => {
      const val = (gasInputEl ? gasInputEl.value : "").trim();
      if (!isValidGasUrl(val)) {
        if (teacherMsgEl) teacherMsgEl.textContent = "請貼入完整的 https://script.google.com/macros/s/.../exec 網址。";
        return;
      }
      try {
        localStorage.setItem(LS_GAS_KEY, val);
      } catch {
        /* ignore */
      }
      refreshEndpointBadges();
      if (teacherMsgEl) {
        teacherMsgEl.textContent = "✅ 已啟用背景自動直寫端點！學生點擊上傳將直接背景寫入「永貞閱讀網成果」。";
      }
    });
  }

  if (gasClearBtn) {
    gasClearBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(LS_GAS_KEY);
      } catch {
        /* ignore */
      }
      if (gasInputEl) gasInputEl.value = CFG.appsScriptUrl || "";
      refreshEndpointBadges();
      if (teacherMsgEl) teacherMsgEl.textContent = "已回復為「標準命名下載＋直連開啟雲端資料夾」模式。";
    });
  }

  // 關閉視窗時強制釋放相機資源
  const obs = new MutationObserver(() => {
    if (modal.hidden) {
      stopCamera();
    }
  });
  obs.observe(modal, { attributes: true, attributeFilter: ["hidden"] });

  checkUrlAutoBindGas();
  refreshEndpointBadges();
  updateFilenamePreview();
  renderLocalSubmissions();
})();
