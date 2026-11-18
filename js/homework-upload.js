/* 永貞國小數位閱讀成果網 — 學生拍照與作業自動上傳模組 */
(() => {
  const CFG = window.YONGZHEN_UPLOAD_CONFIG || {
    driveFolderId: "1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak",
    driveFolderName: "永貞閱讀網成果",
    driveFolderUrl: "https://drive.google.com/drive/folders/1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak?usp=sharing",
    appsScriptUrl: ""
  };
  const LS_GAS_KEY = "yz_homework_gas_url_v1";

  const modal = document.getElementById("modal-homework");
  if (!modal) return;

  const form = document.getElementById("hw-upload-form");
  const classEl = document.getElementById("hw-class");
  const seatEl = document.getElementById("hw-seat");
  const nameEl = document.getElementById("hw-name");
  const topicEl = document.getElementById("hw-topic");
  const noteEl = document.getElementById("hw-note");
  const fnPreviewEl = document.getElementById("hw-filename-preview");

  const videoEl = document.getElementById("hw-video");
  const previewImgEl = document.getElementById("hw-preview-img");
  const placeholderEl = document.getElementById("hw-cam-placeholder");
  const startCamBtn = document.getElementById("hw-start-cam");
  const flipCamBtn = document.getElementById("hw-flip-cam");
  const snapBtn = document.getElementById("hw-snap-btn");
  const retakeBtn = document.getElementById("hw-retake-btn");
  const fileInputEl = document.getElementById("hw-file-input");
  const fileInfoEl = document.getElementById("hw-file-info");

  const submitBtn = document.getElementById("hw-submit-btn");
  const downloadBtn = document.getElementById("hw-download-btn");
  const feedbackEl = document.getElementById("hw-feedback");
  const bannerBadgeEl = document.getElementById("hw-banner-status");
  const modalEndpointBadge = document.getElementById("hw-endpoint-status");

  const gasInputEl = document.getElementById("hw-gas-url-input");
  const gasSaveBtn = document.getElementById("hw-gas-save");
  const gasClearBtn = document.getElementById("hw-gas-clear");
  const copyGsBtn = document.getElementById("hw-copy-gs");
  const teacherMsgEl = document.getElementById("hw-teacher-msg");

  let camStream = null;
  let facingMode = "environment";
  let preparedFile = null; // { base64, mimeType, ext, sizeBytes, width, height }

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

  function refreshEndpointBadges() {
    const url = getActiveGasUrl();
    const ok = isValidGasUrl(url);
    if (bannerBadgeEl) {
      bannerBadgeEl.textContent = ok
        ? "☁️ 已連線至教師自動收件雲端（永貞閱讀網成果）"
        : "📷 相機拍照＆作業轉檔待命（待教師綁定 Apps Script 收件網址）";
    }
    if (modalEndpointBadge) {
      modalEndpointBadge.textContent = ok
        ? "狀態：✅ 已連結 Google Apps Script 自動寫入端點"
        : "狀態：⚙️ 尚待教師貼入 Google Apps Script 部署網址（可先拍照下載存檔）";
    }
    if (gasInputEl && url) {
      gasInputEl.value = url;
    }
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
    setPlaceholder(`📄 已選取 PDF 作業檔：<br><strong>${origName.replace(/</g, "&lt;")}</strong><br>（${(sizeBytes / 1024).toFixed(0)} KB）`);
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
      setFeedback("warn", "目前瀏覽器環境不支援網頁即時鏡頭串流，請點選右側「從手機／電腦選取照片」直接呼叫系統相機拍照或挑選作業圖檔。");
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
    } catch (err) {
      setPlaceholder("無法取得相機權限或未偵測到鏡頭，請點下方「從裝置拍照／選檔」按鈕完成作業提交。");
      setFeedback("warn", "未取得即時相機權限；您仍可點擊「從裝置拍照／選檔」呼叫系統相機或上傳相簿照片與 PDF。");
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

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFeedback();
      if (!preparedFile) {
        setFeedback("err", "請先「開啟相機拍攝」或「從裝置選擇作業照片／PDF」再提交作業。");
        return;
      }
      const gasUrl = getActiveGasUrl();
      const targetName = buildTargetFilename();

      if (!isValidGasUrl(gasUrl)) {
        setFeedback(
          "warn",
          `已為您完成影像最佳化與標準命名（<code>${targetName}</code>）！<br>因本靜態網站尚未綁定教師的 <strong>Google Apps Script 自動寫入網址</strong>，請點擊「下載已命名作業圖檔」並由教師／本人上傳至 <a href="${CFG.driveFolderUrl}" target="_blank" rel="noopener noreferrer">永貞閱讀網成果雲端資料夾 &#8599;</a>，或請老師展開下方設定貼入 <code>.../exec</code> 部署網址。`
        );
        return;
      }

      submitBtn.disabled = true;
      const origLabel = submitBtn.textContent;
      submitBtn.textContent = "☁️ 正在上傳至 Google 雲端硬碟...";

      try {
        const resp = await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({
            folderId: CFG.driveFolderId,
            fileName: targetName,
            mimeType: preparedFile.mimeType,
            base64Data: preparedFile.base64,
            studentClass: classEl.value,
            seatNo: padSeat(seatEl.value),
            studentName: nameEl.value.trim(),
            topic: topicEl.value,
            note: noteEl ? noteEl.value.trim() : ""
          })
        });
        const data = await resp.json();
        if (data && data.ok) {
          setFeedback(
            "ok",
            `✅ 作業已成功自動上傳至 Google 雲端資料夾「<strong>${String(data.folderName || CFG.driveFolderName).replace(/</g, "&lt;")}</strong>」！<br>存檔名稱：<code>${String(data.fileName || targetName).replace(/</g, "&lt;")}</code>`
          );
          preparedFile = null;
          fileInputEl.value = "";
          if (previewImgEl) previewImgEl.hidden = true;
          if (retakeBtn) retakeBtn.hidden = true;
          if (downloadBtn) downloadBtn.hidden = true;
          setPlaceholder("✅ 已順利送出！若需補交下一頁，請再按一次拍攝或選檔。");
        } else {
          setFeedback("err", `上傳失敗：${String((data && data.error) || "雲端端點未回傳成功訊息")}`);
        }
      } catch (err) {
        setFeedback(
          "err",
          "連線雲端上傳端點時發生錯誤（請檢查網路狀態或教師 Apps Script 部署權限是否設為「任何人」）。您仍可先點擊「下載已命名作業圖檔」保留原件。"
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origLabel;
      }
    });
  }

  // 教師端 Apps Script 端點設定與程式碼複製工具
  if (gasSaveBtn) {
    gasSaveBtn.addEventListener("click", () => {
      const val = (gasInputEl ? gasInputEl.value : "").trim();
      if (!isValidGasUrl(val)) {
        if (teacherMsgEl) teacherMsgEl.textContent = "請貼入完整的 https://script.google.com/macros/s/.../exec 部署網址。";
        return;
      }
      try {
        localStorage.setItem(LS_GAS_KEY, val);
      } catch { /* ignore */ }
      refreshEndpointBadges();
      if (teacherMsgEl) {
        teacherMsgEl.textContent = "已暫存此裝置的自動上傳端點，立即即可點擊「確認上傳提交作業」實測！若要讓全校學生皆免設定直接上傳，請將此網址寫入 js/upload-config.js 並推送 GitHub。";
      }
    });
  }

  if (gasClearBtn) {
    gasClearBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(LS_GAS_KEY);
      } catch { /* ignore */ }
      if (gasInputEl) gasInputEl.value = CFG.appsScriptUrl || "";
      refreshEndpointBadges();
      if (teacherMsgEl) teacherMsgEl.textContent = "已清除本機暫存端點設定。";
    });
  }

  if (copyGsBtn) {
    copyGsBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("apps-script/HomeworkUpload.gs");
        const code = await res.text();
        await navigator.clipboard.writeText(code);
        if (teacherMsgEl) teacherMsgEl.textContent = "已複製完整 HomeworkUpload.gs（已帶入目標資料夾 ID: 1G7qZu9Jxu4uqRDB_ZFmkN7SDNwL8ebak），請貼入 script.google.com 新增部署！";
      } catch {
        if (teacherMsgEl) teacherMsgEl.textContent = "無法自動存取剪貼簿，請直接開啟專案內的 apps-script/HomeworkUpload.gs 複製。";
      }
    });
  }

  // 關閉視窗時強制釋放相機資源
  const obs = new MutationObserver(() => {
    if (modal.hidden) {
      stopCamera();
    }
  });
  obs.observe(modal, { attributes: true, attributeFilter: ["hidden"] });

  refreshEndpointBadges();
  updateFilenamePreview();
})();
