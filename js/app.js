/* ==========================================================================
   永貞國小數位閱讀成果網｜蘆映書院 — 原生互動核心 (app.js)
   包含：L1 即時狀態與系統彈窗、L2 下拉與漢堡選單/全站檢索、
         L3 輪播與榮譽跑馬燈暫停控制、L4 分頁與八大典藏瀏覽器、
         L5 分齡分流任務面板、L6 手風琴頁尾與雙據點平面圖彈窗
   ========================================================================== */

(function () {
  "use strict";

  const ARCHIVE = window.YONGZHEN_ARCHIVE || { overview: {}, categories: [], books: [] };
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 共用工具與無障礙 Modal 管理器 ---------- */
  let activeModal = null;
  let lastTrigger = null;

  const backdrop = document.getElementById("modal-backdrop");
  const modals = document.querySelectorAll(".app-modal");

  function openModal(modalId, triggerEl) {
    const target = document.getElementById(modalId);
    if (!target) return;
    if (activeModal && activeModal !== target) {
      activeModal.hidden = true;
    }
    lastTrigger = triggerEl || document.activeElement;
    backdrop.hidden = false;
    target.hidden = false;
    activeModal = target;
    document.body.style.overflow = "hidden";

    const closeBtn = target.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeAllModals() {
    modals.forEach((m) => {
      m.hidden = true;
    });
    backdrop.hidden = true;
    document.body.style.overflow = "";
    activeModal = null;
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  backdrop.addEventListener("click", closeAllModals);
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (activeModal) {
        closeAllModals();
        return;
      }
      closeAllDropdowns();
      closeMobileDrawer();
    }
  });

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- 2. L1 頂部系統工具列：即時開館狀態與系統資料 ---------- */
  function updateLibraryStatus() {
    const pill = document.getElementById("library-status-pill");
    const label = document.getElementById("library-status-text");
    if (!pill || !label) return;

    const now = new Date();
    const day = now.getDay(); // 0=日, 6=六
    const mins = now.getHours() * 60 + now.getMinutes();
    const isWeekday = day >= 1 && day <= 5;
    const isOpenHours = mins >= 7 * 60 + 45 && mins <= 16 * 60;

    if (isWeekday && isOpenHours) {
      pill.classList.remove("is-closed");
      label.textContent = "今日開館中：07:45–16:00（永馨樓 1F・蘆映書院）";
    } else {
      pill.classList.add("is-closed");
      label.textContent = "休館時段（線上查詢全時開放）｜正常開館：週一至週五 07:45–16:00";
    }

    const borrowEl = document.getElementById("semester-borrow-count");
    if (borrowEl && ARCHIVE.overview.semesterAccumulatedBorrow) {
      borrowEl.textContent = Number(ARCHIVE.overview.semesterAccumulatedBorrow).toLocaleString("zh-TW");
    }
  }

  /* ---------- 3. L2 全域主導覽列、行動版漢堡選單與全站檢索 ---------- */
  const navItems = document.querySelectorAll(".nav-item.has-dropdown");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileDrawer = document.getElementById("mobile-drawer");
  const mobileAccordionHost = document.getElementById("mobile-nav-accordion");

  function closeAllDropdowns() {
    navItems.forEach((item) => {
      item.classList.remove("is-open");
      const btn = item.querySelector(".nav-link");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  navItems.forEach((item) => {
    const trigger = item.querySelector(".nav-link");
    if (!trigger) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !item.classList.contains("is-open");
      closeAllDropdowns();
      if (willOpen) {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    item.addEventListener("mouseenter", () => {
      if (window.innerWidth >= 1121) {
        closeAllDropdowns();
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    item.addEventListener("mouseleave", () => {
      if (window.innerWidth >= 1121) {
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item.has-dropdown")) {
      closeAllDropdowns();
    }
  });

  function buildMobileMenu() {
    if (!mobileAccordionHost) return;
    const html = Array.from(navItems)
      .map((item, idx) => {
        const title = item.querySelector(".nav-link").childNodes[0].textContent.trim();
        const links = Array.from(item.querySelectorAll(".dropdown-menu a")).map((a) => {
          const attrs = Array.from(a.attributes)
            .map((attr) => `${attr.name}="${escapeHtml(attr.value)}"`)
            .join(" ");
          return `<li><a ${attrs}>${escapeHtml(a.textContent)}</a></li>`;
        }).join("");
        const panelId = `m-acc-panel-${idx}`;
        return `
          <div class="mobile-acc-item">
            <button type="button" class="mobile-acc-btn" aria-expanded="false" aria-controls="${panelId}">
              <span>${escapeHtml(title)}</span>
              <span aria-hidden="true">+</span>
            </button>
            <ul id="${panelId}" class="mobile-acc-links" hidden>${links}</ul>
          </div>
        `;
      })
      .join("");
    mobileAccordionHost.innerHTML = html;

    mobileAccordionHost.querySelectorAll(".mobile-acc-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        const panel = document.getElementById(btn.getAttribute("aria-controls"));
        btn.setAttribute("aria-expanded", String(!expanded));
        btn.querySelector("span[aria-hidden]").textContent = expanded ? "+" : "−";
        panel.hidden = expanded;
      });
    });
  }

  function formatPhotoDisplayTitle(it, idx) {
    const raw = String((it && it.n) || "").replace(/\.[a-z0-9]+$/i, "").trim();
    const sub = String((it && it.s) || "學習情境").replace(/\(.*?\)|（.*?）/g, "").trim();
    if (!raw || /^(?:IMG|PXL|DSC|S_|LINE_ALBUM|[0-9_-]+$)/i.test(raw)) {
      const albumMatch = /^LINE_ALBUM_(.+?)_\d{6}_\d+$/i.exec(raw);
      if (albumMatch && albumMatch[1]) {
        return `${albumMatch[1].replace(/^\d{6,8}/, "").trim() || sub}（情境 ${idx + 1}）`;
      }
      return `${sub}・學習情境 #${idx + 1}`;
    }
    return raw;
  }

  function closeMobileDrawer() {
    if (!hamburgerBtn || !mobileDrawer) return;
    hamburgerBtn.setAttribute("aria-expanded", "false");
    mobileDrawer.hidden = true;
  }

  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener("click", () => {
      const expanded = hamburgerBtn.getAttribute("aria-expanded") === "true";
      hamburgerBtn.setAttribute("aria-expanded", String(!expanded));
      mobileDrawer.hidden = expanded;
    });
    mobileDrawer.addEventListener("click", (e) => {
      if (e.target.closest("a[href]")) {
        closeMobileDrawer();
      }
    });
  }

  /* ---------- 4. L3 視覺焦點輪播與榮譽跑馬燈（含暫停/播放切換） ---------- */
  const slides = Array.from(document.querySelectorAll(".hero-slide"));
  const heroDots = Array.from(document.querySelectorAll(".hero-dot"));
  const heroCounter = document.getElementById("hero-counter");
  const heroPrevBtn = document.getElementById("hero-prev");
  const heroNextBtn = document.getElementById("hero-next");
  const heroToggleBtn = document.getElementById("hero-toggle");
  const heroToggleText = document.getElementById("hero-toggle-text");

  let currentSlide = 0;
  let heroPaused = prefersReducedMotion;
  let heroTimer = null;

  function renderSlide(idx) {
    currentSlide = (idx + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const active = i === currentSlide;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", String(!active));
    });
    heroDots.forEach((d, i) => {
      const active = i === currentSlide;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", String(active));
    });
    if (heroCounter) {
      heroCounter.textContent = `0${currentSlide + 1} / 0${slides.length}`;
    }
  }

  function syncHeroToggleUI() {
    if (!heroToggleBtn || !heroToggleText) return;
    const iconPause = heroToggleBtn.querySelector(".icon-pause");
    const iconPlay = heroToggleBtn.querySelector(".icon-play");
    heroToggleBtn.setAttribute("aria-pressed", String(heroPaused));
    heroToggleBtn.setAttribute("aria-label", heroPaused ? "恢復主視覺自動輪播" : "暫停主視覺自動輪播");
    heroToggleText.textContent = heroPaused ? "播放輪播" : "暫停輪播";
    if (iconPause) iconPause.hidden = heroPaused;
    if (iconPlay) iconPlay.hidden = !heroPaused;
  }

  function startHeroAuto() {
    clearInterval(heroTimer);
    if (!heroPaused) {
      heroTimer = setInterval(() => renderSlide(currentSlide + 1), 6500);
    }
  }

  if (slides.length) {
    renderSlide(0);
    syncHeroToggleUI();
    startHeroAuto();

    heroPrevBtn.addEventListener("click", () => {
      renderSlide(currentSlide - 1);
      startHeroAuto();
    });
    heroNextBtn.addEventListener("click", () => {
      renderSlide(currentSlide + 1);
      startHeroAuto();
    });
    heroDots.forEach((dot) => {
      dot.addEventListener("click", () => {
        renderSlide(Number(dot.dataset.slideTarget));
        startHeroAuto();
      });
    });
    heroToggleBtn.addEventListener("click", () => {
      heroPaused = !heroPaused;
      syncHeroToggleUI();
      startHeroAuto();
    });
  }

  /* 榮譽典範與捐資芳名錄跑馬燈 */
  const TICKER_ITEMS = [
    { tag: "年度典範", text: "狂賀！永貞國小通過「明日閱讀典範學校第二級」並榮獲「2025 明日閱讀年度推薦學校」獎狀，10+ 位教師榮獲 MSSR 典範教師！", img: "assets/images/mssr-award.jpg" },
    { tag: "全國佳作", text: "賀！2025 明日說書人全國博覽會國小高年級組佳作：永貞國小 王湘婷、蔡妤瑄（指導教師團隊暨全國推薦榜單）。", img: "assets/images/storyteller-winners.jpg" },
    { tag: "寫作桂冠", text: "狂賀！114 年苗栗縣「翰墨鳴華・文狀元」競賽：永貞國小 江沂潔（狀元）、饒恩慈（五年級秀才）登台受獎！", img: "assets/images/writing-award.jpg" },
    { tag: "識字英雄", text: "賀！114-2 學習島嶼「識字英雄榜全國前 20 名」：本校 林○語（第 7 名）、鍾○冠（第 8 名）、陳○彤（第 15 名）榮耀上榜！", img: "assets/images/literacy-hero.jpg" },
    { tag: "企業捐資", text: "誠摯感謝「財團法人陳沼濤文教基金會」惠贈《三腳貓偵探團》《烏龍小學的唐詩遊樂園》等優質兒童讀物，嘉惠全校 17 班師生！", img: "assets/images/book-donation.jpg" },
    { tag: "數位捐贈", text: "感謝「7-ELEVEN 把愛找回來 × e 啟讀出未來」苗栗縣專案捐贈電子書閱讀器，拓展永貞數位雙語共讀新視野！" },
    { tag: "公益行動", text: "感謝「誠品文化藝術基金會」二度捐贈優質二手好書暨派遣「誠品行動書車」進駐校園操場，舉辦全校選書共讀盛會！", img: "assets/images/hero-bookmobile.jpg" },
    { tag: "學術發表", text: "徐秉鴻教師發表「識字金銀島對國小五年級適性學習成效研究」獲 2025 自主學習節證明，並承辦/參與 2026 第十六屆閱讀教學研討會！", img: "assets/images/hero-sharing.jpg" }
  ];

  const tickerTextEl = document.getElementById("ticker-active-text");
  const tickerToggleBtn = document.getElementById("ticker-toggle");
  const tickerToggleText = document.getElementById("ticker-toggle-text");
  const tickerNextBtn = document.getElementById("ticker-next-btn");
  let tickerIdx = 0;
  let tickerPaused = prefersReducedMotion;
  let tickerTimer = null;

  function renderTicker(idx) {
    tickerIdx = (idx + TICKER_ITEMS.length) % TICKER_ITEMS.length;
    const item = TICKER_ITEMS[tickerIdx];
    if (!tickerTextEl) return;
    tickerTextEl.classList.remove("is-active");
    void tickerTextEl.offsetWidth; // trigger gentle reflow animation
    tickerTextEl.innerHTML = `<span class="ticker-tag">${escapeHtml(item.tag)}</span><span>${escapeHtml(item.text)}</span>`;
    tickerTextEl.classList.add("is-active");
  }

  function syncTickerToggleUI() {
    if (!tickerToggleBtn || !tickerToggleText) return;
    tickerToggleBtn.setAttribute("aria-pressed", String(tickerPaused));
    tickerToggleBtn.setAttribute("aria-label", tickerPaused ? "恢復榮譽跑馬燈輪播" : "暫停榮譽跑馬燈輪播");
    tickerToggleText.textContent = tickerPaused ? "播放" : "暫停";
  }

  function startTickerAuto() {
    clearInterval(tickerTimer);
    if (!tickerPaused) {
      tickerTimer = setInterval(() => renderTicker(tickerIdx + 1), 4500);
    }
  }

  if (tickerTextEl) {
    renderTicker(0);
    syncTickerToggleUI();
    startTickerAuto();
    tickerNextBtn.addEventListener("click", () => {
      renderTicker(tickerIdx + 1);
      startTickerAuto();
    });
    tickerToggleBtn.addEventListener("click", () => {
      tickerPaused = !tickerPaused;
      syncTickerToggleUI();
      startTickerAuto();
    });
  }

  /* ---------- 5. L4 動態內容中樞與八大典藏資料庫 ---------- */
  const l4Tabs = document.querySelectorAll(".hub-main-card .hub-tab");
  const l4Panels = document.querySelectorAll(".hub-main-card .tab-panel");

  function switchL4Tab(targetKey) {
    l4Tabs.forEach((btn) => {
      const match = btn.dataset.l4Target === targetKey;
      btn.classList.toggle("is-active", match);
      btn.setAttribute("aria-selected", String(match));
    });
    l4Panels.forEach((panel) => {
      const match = panel.id === `panel-${targetKey}`;
      panel.classList.toggle("is-active", match);
      panel.hidden = !match;
    });
  }

  l4Tabs.forEach((btn) => {
    btn.addEventListener("click", () => switchL4Tab(btn.dataset.l4Target));
  });

  // L4 閱讀活動篩選標籤
  const actFilterBtns = document.querySelectorAll(".pill-filter");
  const actCards = document.querySelectorAll(".activity-card");
  actFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.actFilter;
      actFilterBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      actCards.forEach((card) => {
        const show = f === "all" || card.dataset.actType === f;
        card.hidden = !show;
      });
    });
  });

  // L4 右側榮譽榜分頁
  const miniHonorTabs = document.querySelectorAll(".mini-tab[data-honor-tab]");
  miniHonorTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.honorTab;
      miniHonorTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      document.getElementById("honor-panel-literacy").hidden = key !== "literacy";
      document.getElementById("honor-panel-story").hidden = key !== "story";
    });
  });

  // L4 新書通報列表（取自真實陳沼濤贈書與館藏清單）
  function renderNewBooksSpotlight() {
    const host = document.getElementById("newbooks-list");
    if (!host || !ARCHIVE.books) return;
    const picks = ARCHIVE.books.filter((b) => b.theme === "陳沼濤基金會贈書").slice(0, 6);
    host.innerHTML = picks
      .map(
        (b) => `
      <article class="newbook-row">
        <div class="newbook-row-top">
          <span>${escapeHtml(b.callNo)}</span>
          <span>${escapeHtml(b.status)}</span>
        </div>
        <h4>《${escapeHtml(b.title)}》</h4>
        <p>${escapeHtml(b.author)}</p>
      </article>
    `
      )
      .join("");
  }

  // L4 八大分類典藏總覽卡渲染
  function renderArchiveGrid(highlightCatId = "") {
    const grid = document.getElementById("archive-grid");
    if (!grid || !ARCHIVE.categories) return;
    grid.innerHTML = ARCHIVE.categories
      .map((cat) => {
        const isHi = highlightCatId === cat.id;
        return `
        <article class="archive-cat-card" id="cat-card-${escapeHtml(cat.code)}" style="${isHi ? "border-color:#D97706; box-shadow:0 0 0 3px rgba(217,119,6,0.2);" : ""}">
          <img src="${escapeHtml(cat.thumb)}" alt="${escapeHtml(cat.title)} 館藏專區封面實照" loading="lazy">
          <div class="archive-cat-body">
            <div class="archive-cat-code-row">
              <span class="archive-code">館藏分類 ${escapeHtml(cat.code)}</span>
              <span class="archive-count">${cat.totalFiles.toLocaleString("zh-TW")} 檔・${cat.mb} MB</span>
            </div>
            <h4>${escapeHtml(cat.title)}</h4>
            <p>${escapeHtml(cat.summary)}</p>
            <button type="button" class="btn btn-outline btn-sm" data-open-modal="modal-archive" data-archive-cat="${escapeHtml(cat.id)}">
              瀏覽 ${cat.subfolders.length} 項子目錄內容
            </button>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function populateArchiveModal(catId) {
    const body = document.getElementById("archive-modal-body");
    const titleEl = document.getElementById("archive-modal-title");
    if (!body || !ARCHIVE.categories.length) return;

    const cat = ARCHIVE.categories.find((c) => c.id === catId) || ARCHIVE.categories[0];
    if (titleEl) {
      titleEl.textContent = `[館藏 ${cat.code}] ${cat.title}（共 ${cat.totalFiles.toLocaleString("zh-TW")} 檔）`;
    }

    const tabsHtml = ARCHIVE.categories
      .map(
        (c) => `
      <button type="button" class="pill-filter ${c.id === cat.id ? "is-active" : ""}" data-switch-archive-cat="${escapeHtml(c.id)}">
        ${escapeHtml(c.code)} ${escapeHtml(c.title.slice(0, 6))}… (${c.totalFiles})
      </button>
    `
      )
      .join("");

    const fundedList = (ARCHIVE.fundedPlans || []).filter(
      (p) => cat.code === "01" || p.catId === cat.id
    );
    const fundedSectionHtml = fundedList.length
      ? `
        <div style="margin-bottom:16px; background:#EFF6FF; border:1px solid #DBEAFE; border-left:4px solid #1E3A8A; border-radius:10px; padding:14px;">
          <strong style="color:#1E3A8A; display:block; margin-bottom:8px;">
            補助計畫一覽（僅列計畫名稱與核定額度，不公開計畫書本文與支用明細）
          </strong>
          <div class="vol-schedule-wrap" style="margin:0;">
            <table class="vol-table">
              <thead>
                <tr><th>執行年度</th><th>補助計畫名稱</th><th>核定／執行額度</th></tr>
              </thead>
              <tbody>
                ${fundedList
                  .map(
                    (p) =>
                      `<tr><td>${escapeHtml(p.year)}</td><td><strong>${escapeHtml(p.name)}</strong></td><td><span class="chip chip-gold">${escapeHtml(p.quota)}</span></td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
      : "";

    const CATALOG = window.YONGZHEN_CATALOG || { stats: {}, items: [] };
    const catCatalogItems = CATALOG.items.filter((it) => it.c === cat.code);
    const catDocs = catCatalogItems.filter((it) => it.k === "d");
    const catImgs = catCatalogItems.filter((it) => it.k === "g");
    const catArch = catCatalogItems.filter((it) => it.k === "v" || it.k === "D" || it.k === "G");
    const uid = `cb-${cat.code}-${Date.now().toString(36)}`;

    const getExtBadgeHtml = (fn, kind) => {
      if (kind === "v") return '<span class="ext-badge is-vid">影音 MP4</span>';
      if (kind === "D" || kind === "G") return '<span class="ext-badge is-arch">校內原檔</span>';
      const m = /\.([a-z0-9]+)$/i.exec(fn || "");
      const ext = m ? m[1].toUpperCase() : "FILE";
      const cls =
        ext === "XLSX" || ext === "CSV"
          ? "is-xlsx"
          : ext === "DOCX" || ext === "ODT"
          ? "is-docx"
          : ext === "PPTX"
          ? "is-pptx"
          : "";
      return `<span class="ext-badge ${cls}">${escapeHtml(ext)}</span>`;
    };

    const subsCardsHtml = cat.subfolders
      .map((s) => {
        const subKey = s.catalogSub || s.name;
        const sItems = catCatalogItems.filter((it) => it.s === subKey);
        const sDocs = sItems.filter((it) => it.k === "d");
        const sImgs = sItems.filter((it) => it.k === "g");
        const sVids = sItems.filter((it) => it.k === "v");
        const sArchOthers = sItems.filter((it) => it.k === "D" || it.k === "G");

        if (s.planQuota && sItems.length === 0) {
          return `
        <div class="subfolder-card">
          <h4>📁 ${escapeHtml(s.name)}</h4>
          <div class="chip-row">
            <span class="chip chip-navy">典藏紀錄 ${s.files} 檔</span>
            <span class="chip chip-gold">${escapeHtml(s.planQuota.quota)}</span>
          </div>
          <p style="margin:8px 0 4px; font-size:0.84rem; color:#1E3A8A; font-weight:700;">
            計畫名稱：${escapeHtml(s.planQuota.name)}
          </p>
          <p style="margin:0; font-size:0.78rem; color:#475569;">
            依規範僅公開「計畫名稱＋額度」，不對外揭露計畫書本文、申請表與核銷明細檔案。
          </p>
        </div>
      `;
        }

        const quotaNotice = s.planQuota
          ? `<div style="margin:6px 0 8px; padding:6px 10px; border-radius:6px; background:#fffbeb; border:1px solid #fde68a; font-size:0.78rem; color:#92400e;">
              <strong>計畫名稱＋額度：</strong>${escapeHtml(s.planQuota.name)}（${escapeHtml(s.planQuota.quota)}）<br>
              <span>僅公開去敏後之書單／活動紀錄影像，經費申請與核銷文件依法不予公開。</span>
            </div>`
          : "";

        const docsLi = sDocs
          .slice(0, 3)
          .map(
            (d) =>
              `<li>📄 <a class="doc-quick-link" href="${escapeHtml(d.u)}" target="_blank" rel="noopener" download="${escapeHtml(d.n)}">${escapeHtml(d.n)}</a> <small>(${escapeHtml(d.d || "")}・${d.m} MB)</small></li>`
          )
          .join("");

        const thumbsHtml = sImgs.length
          ? `<div class="sub-thumb-strip" data-sub-key="${escapeHtml(subKey)}">
              ${sImgs
                .slice(0, 4)
                .map(
                  (m, idx) =>
                    `<button type="button" class="sub-thumb-btn" data-lb-sub="${escapeHtml(subKey)}" data-lb-idx="${idx}" title="${escapeHtml(m.n)}">
                      <img src="${escapeHtml(m.u)}" alt="${escapeHtml(m.n)}" loading="lazy">
                    </button>`
                )
                .join("")}
            </div>`
          : "";

        const jumpBtns = [
          sDocs.length
            ? `<button type="button" class="sub-jump-btn" data-jump-tab="docs" data-jump-sub="${escapeHtml(subKey)}">📄 全部可開檔案 (${sDocs.length})</button>`
            : "",
          sImgs.length
            ? `<button type="button" class="sub-jump-btn is-gold" data-jump-tab="imgs" data-jump-sub="${escapeHtml(subKey)}">🖼️ 精選學習情境圖 (${sImgs.length})</button>`
            : "",
          sVids.length || sArchOthers.length
            ? `<button type="button" class="sub-jump-btn" data-jump-tab="arch" data-jump-sub="${escapeHtml(subKey)}">🎬 影音／原檔索引 (${sVids.length + sArchOthers.length})</button>`
            : "",
        ]
          .filter(Boolean)
          .join("");

        return `
        <div class="subfolder-card">
          <h4>📁 ${escapeHtml(s.name)}</h4>
          <div class="chip-row">
            ${sDocs.length ? `<span class="chip chip-navy">線上可開檔 ${sDocs.length} 份</span>` : ""}
            ${sImgs.length ? `<span class="chip chip-gold">精選情境圖 ${sImgs.length} 張</span>` : ""}
            ${sVids.length ? `<span class="chip chip-soft">影音 ${sVids.length} 支</span>` : ""}
            <span class="chip chip-soft">全校盤點 ${s.files} 檔</span>
          </div>
          ${quotaNotice}
          ${docsLi ? `<ul class="sample-file-list">${docsLi}</ul>` : ""}
          ${thumbsHtml}
          ${jumpBtns ? `<div class="sub-action-row">${jumpBtns}</div>` : ""}
        </div>
      `;
      })
      .join("");

    const subSelectOpts = [
      '<option value="">全部子資料夾（全類別）</option>',
      ...Array.from(new Set(catCatalogItems.map((it) => it.s))).map(
        (sn) => `<option value="${escapeHtml(sn)}">${escapeHtml(sn)}</option>`
      ),
    ].join("");

    const subsHtml = `
      <div class="cat-browser-wrap" id="${uid}">
        <div class="cat-stats-banner">
          <div class="cat-stats-pills">
            <span class="cat-stat-pill">📄 線上可開啟／下載 <strong>${catDocs.length}</strong> 份</span>
            <span class="cat-stat-pill">🖼️ 精選學生學習情境圖 <strong>${catImgs.length}</strong> 張（每區最多 10 張）</span>
            <span class="cat-stat-pill">🎬 影音暨大型原檔索引 <strong>${catArch.length}</strong> 筆</span>
          </div>
          <p class="cat-privacy-note">每個區塊僅呈現最多 10 張精選學生學習最佳意象情境示意圖以節省雲端空間；已嚴格排除經費申請、核銷憑證、簽到名冊與師生個資。</p>
        </div>
        <div class="cat-toolbar">
          <div class="cat-view-tabs" role="tablist">
            <button type="button" class="cat-view-tab is-active" data-cview="subs">📁 子資料夾分類導覽</button>
            <button type="button" class="cat-view-tab" data-cview="docs">📄 公開教學檔案 (${catDocs.length})</button>
            <button type="button" class="cat-view-tab" data-cview="imgs">🖼️ 精選學習情境圖 (${catImgs.length})</button>
            <button type="button" class="cat-view-tab" data-cview="arch">🎬 影音暨原檔索引 (${catArch.length})</button>
          </div>
          <div class="cat-controls-right" data-filter-bar hidden>
            <select class="cat-sub-select" aria-label="篩選子資料夾">${subSelectOpts}</select>
            <input type="search" class="cat-filter-input" placeholder="篩選本類別檔名或日期..." aria-label="篩選本類別檔名或日期">
          </div>
        </div>
        <div data-panel="subs">
          <div class="subfolders-grid">${subsCardsHtml}</div>
        </div>
        <div data-panel="list" hidden></div>
      </div>
    `;

    // Interactive wiring runs immediately after modal DOM updates
    setTimeout(() => {
      const root = document.getElementById(uid);
      if (!root) return;

      const openGalleryLightbox = (list, startIdx) => {
        if (window.__yzOpenGalleryLightbox) {
          window.__yzOpenGalleryLightbox(list, startIdx);
        }
      };

      const tabs = root.querySelectorAll(".cat-view-tab");
      const filterBar = root.querySelector("[data-filter-bar]");
      const subSel = root.querySelector(".cat-sub-select");
      const kwInput = root.querySelector(".cat-filter-input");
      const subsPanel = root.querySelector('[data-panel="subs"]');
      const listPanel = root.querySelector('[data-panel="list"]');

      let activeTab = "subs";
      let pageSize = 24;

      const renderListPanel = () => {
        if (activeTab === "subs") {
          subsPanel.hidden = false;
          listPanel.hidden = true;
          filterBar.hidden = true;
          return;
        }
        subsPanel.hidden = true;
        listPanel.hidden = false;
        filterBar.hidden = false;

        const subFilter = subSel.value;
        const kw = kwInput.value.trim().toLowerCase();
        const pool = activeTab === "docs" ? catDocs : activeTab === "imgs" ? catImgs : catArch;
        const filtered = pool.filter((it) => {
          if (subFilter && it.s !== subFilter) return false;
          if (kw && !`${it.n} ${it.s} ${it.d}`.toLowerCase().includes(kw)) return false;
          return true;
        });

        if (!filtered.length) {
          listPanel.innerHTML = `<p class="cat-privacy-note" style="padding:18px; background:#f8fafc; border-radius:10px; text-align:center;">此篩選條件下尚無符合的項目，請切換「全部子資料夾」或清除關鍵字。</p>`;
          return;
        }

        const shown = activeTab === "imgs" ? filtered.slice(0, 10) : filtered.slice(0, pageSize);
        if (activeTab === "imgs") {
          listPanel.innerHTML = `
            <p class="cat-privacy-note" style="margin-bottom:10px;">✨ 本區塊僅呈現最多 10 張精選之「學生學習最佳意象情境示意圖」（目前顯示 ${shown.length} 張），以大幅節省雲端空間；完整活動相片皆典藏於校內備份硬碟。</p>
            <div class="cat-gallery-grid">
              ${shown
                .map(
                  (it, i) => `
                <button type="button" class="cat-photo-card" data-gidx="${i}" title="點擊放大：${escapeHtml(it.n)}">
                  <img src="${escapeHtml(it.u)}" alt="${escapeHtml(formatPhotoDisplayTitle(it, i))}" loading="lazy">
                  <div class="cat-photo-cap">
                    <strong>${escapeHtml(formatPhotoDisplayTitle(it, i))}</strong>
                    <span>${escapeHtml(it.d || "活動紀錄")} ・ ${escapeHtml(it.s)}</span>
                  </div>
                </button>`
                )
                .join("")}
            </div>
          `;
          listPanel.querySelectorAll("[data-gidx]").forEach((btn) => {
            btn.addEventListener("click", () => openGalleryLightbox(shown, Number(btn.dataset.gidx)));
          });
        } else if (activeTab === "docs") {
          listPanel.innerHTML = `
            <div class="cat-doc-list">
              ${shown
                .map(
                  (it) => `
                <div class="cat-doc-row">
                  <div class="cat-doc-main">
                    <div class="cat-doc-title-line">
                      ${getExtBadgeHtml(it.n, it.k)}
                      <span class="cat-doc-name">${escapeHtml(it.n)}</span>
                    </div>
                    <div class="cat-doc-meta">📁 ${escapeHtml(it.s)} ・ 建檔／修改：${escapeHtml(it.d || "—")} ・ 容量：${it.m} MB</div>
                  </div>
                  <div class="cat-doc-actions">
                    <a class="doc-act-btn" href="${escapeHtml(it.u)}" target="_blank" rel="noopener">線上開啟</a>
                    <a class="doc-act-btn primary" href="${escapeHtml(it.u)}" download="${escapeHtml(it.n)}">下載檔案</a>
                  </div>
                </div>`
                )
                .join("")}
            </div>
            ${
              filtered.length > pageSize
                ? `<div class="cat-load-more-wrap"><button type="button" class="cat-load-more-btn" data-more>載入更多檔案（目前 ${shown.length} / ${filtered.length} 份）</button></div>`
                : ""
            }
          `;
        } else {
          listPanel.innerHTML = `
            <p class="cat-privacy-note" style="margin-bottom:10px;">此分頁索引未直接上傳至 GitHub Pages 之大型影音檔（合計 145 支影片）與超過單檔限制之高畫質原檔／未選入縮圖，皆完整備份於校內 <code>E:\\2024-2026閱讀教學\\${escapeHtml(cat.id)}\\</code>。</p>
            <div class="cat-doc-list">
              ${shown
                .map(
                  (it) => `
                <div class="cat-doc-row">
                  <div class="cat-doc-main">
                    <div class="cat-doc-title-line">
                      ${getExtBadgeHtml(it.n, it.k)}
                      <span class="cat-doc-name">${escapeHtml(it.n)}</span>
                    </div>
                    <div class="cat-doc-meta">📁 ${escapeHtml(it.s)} ・ 拍攝／建檔：${escapeHtml(it.d || "—")} ・ 原檔大小：${it.m} MB（收錄於校內完整典藏硬碟）</div>
                  </div>
                </div>`
                )
                .join("")}
            </div>
            ${
              filtered.length > pageSize
                ? `<div class="cat-load-more-wrap"><button type="button" class="cat-load-more-btn" data-more>載入更多索引（目前 ${shown.length} / ${filtered.length} 筆）</button></div>`
                : ""
            }
          `;
        }

        const moreBtn = listPanel.querySelector("[data-more]");
        if (moreBtn) {
          moreBtn.addEventListener("click", () => {
            pageSize += 24;
            renderListPanel();
          });
        }
      };

      const switchTab = (nextTab, preSub) => {
        activeTab = nextTab;
        pageSize = 24;
        if (typeof preSub === "string") subSel.value = preSub;
        tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.cview === activeTab));
        renderListPanel();
      };

      tabs.forEach((t) => {
        t.addEventListener("click", () => switchTab(t.dataset.cview));
      });
      subSel.addEventListener("change", () => {
        pageSize = 24;
        renderListPanel();
      });
      kwInput.addEventListener("input", () => {
        pageSize = 24;
        renderListPanel();
      });

      root.querySelectorAll("[data-jump-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.jumpTab, btn.dataset.jumpSub || ""));
      });

      root.querySelectorAll("[data-lb-sub]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sk = btn.dataset.lbSub;
          const idx = Number(btn.dataset.lbIdx || 0);
          const list = catImgs.filter((it) => it.s === sk);
          openGalleryLightbox(list, idx);
        });
      });
    }, 0);

    body.innerHTML = `
      <div class="activity-filter-bar" role="tablist" aria-label="切換圖書館典藏專區">${tabsHtml}</div>
      <div class="newbooks-banner">
        <img src="${escapeHtml(cat.thumb)}" alt="${escapeHtml(cat.title)}">
        <div>
          <span class="chip chip-gold">典藏專區 ${escapeHtml(cat.code)} ‧ 共 ${cat.totalFiles.toLocaleString("zh-TW")} 筆資料</span>
          <h3>${escapeHtml(cat.title)}（影像 ${cat.mediaCount.toLocaleString("zh-TW")} 筆・檔案 ${cat.docCount.toLocaleString("zh-TW")} 份・${cat.mb} MB）</h3>
          <p>${escapeHtml(cat.summary)}</p>
        </div>
      </div>
      ${fundedSectionHtml}
      <div class="subfolders-grid" style="display:block;">${subsHtml}</div>
    `;

    body.querySelectorAll("[data-switch-archive-cat]").forEach((btn) => {
      btn.addEventListener("click", () => populateArchiveModal(btn.dataset.switchArchiveCat));
    });
  }

  /* ---------- 6. L5 受眾任務分流中心：低／中／高年段任務面板 ---------- */
  const STAGE_CONFIG = {
    low: {
      title: "低年級繪本區｜閱讀起步走與秘密基地啟蒙",
      subtitle: "一年級・二年級課程目標與策展任務",
      image: "assets/images/hero-mssr.jpg",
      imageAlt: "永貞國小低年級學生進行晨讀 MSSR 與繪本共讀現場",
      goals: [
        "認識永馨樓 1F「蘆映書院」六大分區配置，養成靜音進館、使用代書卡與準時歸還的圖書禮儀。",
        "透過繪本《圖書館獅子》《沒有名字的貓》理解故事起承轉合與因果關係。",
        "搭配《圖書王國的彩色門牌》十大分類圖卡遊戲，完成 40 周年校慶「小雞過生日」「爺爺一定有辦法」延伸學習單。"
      ]
    },
    mid: {
      title: "中年級橋梁書｜讀報小偵探與小組思辨討論",
      subtitle: "三年級・四年級課程目標與策展任務",
      image: "assets/images/library-visit.jpg",
      imageAlt: "永貞國小中年級學生參訪公共圖書館並依十大分類探索書海",
      goals: [
        "應用國語日報《新聞小偵探》讀報策略，以「六何法（5W1H）」與關鍵字提取分析文章觀點。",
        "在小組討論中練習對文章提出質疑或共鳴，搭配《魔法十年屋》《花婆婆》展開時間膠囊寫作。",
        "結合公共圖書館校外參訪與陳沼濤基金會捐贈橋樑套書，穩定從繪本過渡至長篇閱讀。"
      ]
    },
    high: {
      title: "高年級跨域探究｜識字適性、媒體識讀與經典美感實作",
      subtitle: "五年級・六年級課程目標與策展任務",
      image: "assets/images/hero-sharing.jpg",
      imageAlt: "永貞國小團隊於桃竹苗成果分享會發表跨域經典閱讀與美感課程",
      goals: [
        "進行資料辨識訓練，精準區分「客觀事實」與「主觀觀點」，學習判別假訊息或過時資訊。",
        "體驗校本跨域課程《子竹嚐肉（知足常樂）》多肉微觀探究與《紅磚牆外的世界窗》蘆竹湳窗花雙語數位故事。",
        "結合「識字金銀島」適性色點分層與 AI 科普繪本簡報影音創作，站上自主學習節與研討會發表舞台。"
      ]
    }
  };

  function renderStageDetail(stageKey) {
    const cfg = STAGE_CONFIG[stageKey] || STAGE_CONFIG.low;
    const host = document.getElementById("stage-detail-panel");
    if (!host) return;

    document.querySelectorAll(".audience-card.is-stage").forEach((card) => {
      const active = card.dataset.stage === stageKey;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
    });

    const stageBooks = ARCHIVE.books.filter((b) => b.stage === stageKey).slice(0, 6);
    const booksHtml = stageBooks
      .map(
        (b, i) => `
      <article class="stage-book-item">
        <div class="archive-cat-code-row">
          <span class="chip chip-navy">${escapeHtml(b.grade)}・${escapeHtml(b.callNo)}</span>
          <span class="chip chip-soft">${escapeHtml(b.theme)}</span>
        </div>
        <h4>《${escapeHtml(b.title)}》</h4>
        <div class="stage-book-meta">${escapeHtml(b.author)}｜${escapeHtml(b.location)}</div>
        <button type="button" class="text-action-btn" data-toggle-prompt="sp-${stageKey}-${i}" aria-expanded="false">
          展開策展引導提問 &darr;
        </button>
        <p id="sp-${stageKey}-${i}" class="stage-book-prompt" hidden>${escapeHtml(b.prompt)}</p>
      </article>
    `
      )
      .join("");

    host.innerHTML = `
      <div class="stage-detail-layout">
        <div class="stage-visual">
          <img src="${escapeHtml(cfg.image)}" alt="${escapeHtml(cfg.imageAlt)}">
          <span class="chip chip-gold">${escapeHtml(cfg.subtitle)}</span>
          <h3 style="margin:8px 0 4px; color:var(--brand-navy);">${escapeHtml(cfg.title)}</h3>
          <ul class="stage-goal-list">
            ${cfg.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}
          </ul>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <strong style="color:var(--brand-navy);">圖書館適齡策展書單與共讀思考提問</strong>
            <button type="button" class="btn btn-outline btn-sm" data-open-modal="modal-opac" data-opac-stage="${escapeHtml(stageKey)}">查詢本適讀年段館藏</button>
          </div>
          <div class="stage-books-grid">${booksHtml}</div>
        </div>
      </div>
    `;

    host.querySelectorAll("[data-toggle-prompt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.togglePrompt);
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
        btn.textContent = isOpen ? "展開策展引導提問 ↓" : "收合引導提問 ↑";
        target.hidden = isOpen;
      });
    });
  }

  document.querySelectorAll(".audience-card.is-stage").forEach((btn) => {
    btn.addEventListener("click", () => renderStageDetail(btn.dataset.stage));
  });

  /* ---------- 7. L6 頁尾四欄手風琴收合（手機版點擊展開） ---------- */
  const footerTriggers = document.querySelectorAll(".footer-acc-trigger");

  function syncFooterAccordionMode() {
    const isMobile = window.innerWidth <= 767;
    footerTriggers.forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      if (isMobile) {
        if (!btn.dataset.userToggled) {
          btn.setAttribute("aria-expanded", "false");
          panel.hidden = true;
        }
      } else {
        btn.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        delete btn.dataset.userToggled;
      }
    });
  }

  footerTriggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.dataset.userToggled = "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });
  });

  window.addEventListener("resize", syncFooterAccordionMode);

  /* ---------- 8. 互動彈窗邏輯：OPAC / 聊書投稿 / 志工排班 / 平面配置圖 / 榮譽典範 / 全站搜尋 ---------- */
  function renderOpacResults() {
    const q = (document.getElementById("opac-query")?.value || "").trim().toLowerCase();
    const st = document.getElementById("opac-stage-filter")?.value || "all";
    const th = document.getElementById("opac-theme-filter")?.value || "all";
    const host = document.getElementById("opac-results");
    const summary = document.getElementById("opac-summary");
    if (!host || !summary) return;

    const filtered = ARCHIVE.books.filter((b) => {
      const matchStage = st === "all" || b.stage === st;
      const matchTheme = th === "all" || b.theme === th;
      const hay = `${b.title} ${b.author} ${b.callNo} ${b.grade} ${b.theme} ${b.prompt}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      return matchStage && matchTheme && matchQ;
    });

    summary.textContent = `符合條件共 ${filtered.length} 筆精選書目（全校實體館藏達 13,310 冊＋班級書庫 2,400 冊）`;
    host.innerHTML = filtered.length
      ? filtered
          .map(
            (b) => `
        <article class="opac-item">
          <div class="chip-row">
            <span class="chip chip-navy">${escapeHtml(b.grade)}・索書號 ${escapeHtml(b.callNo)}</span>
            <span class="chip chip-gold">${escapeHtml(b.status)}</span>
          </div>
          <h4>《${escapeHtml(b.title)}》</h4>
          <p><strong>著者／出版：</strong>${escapeHtml(b.author)}</p>
          <p><strong>館藏位置：</strong>${escapeHtml(b.location)}（${escapeHtml(b.theme)}）</p>
          <p><strong>共讀導讀提問：</strong>${escapeHtml(b.prompt)}</p>
        </article>
      `
          )
          .join("")
      : `<p style="grid-column:1/-1; color:var(--ink-muted);">查無相符館藏書目，建議嘗試「獅子」、「十年屋」、「874.5」或點擊全縣圖書目錄系統。</p>`;
  }

  ["opac-query", "opac-stage-filter", "opac-theme-filter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", renderOpacResults);
    if (el) el.addEventListener("change", renderOpacResults);
  });

  // 聊書投稿（localStorage 持久化 + 預設實例）
  const TALKBOOK_KEY = "yz_talkbook_entries_v1";
  const DEFAULT_TALKBOOKS = [
    { cls: "六甲", name: "陳同學", book: "《記憶傳承人》", quote: "讀完才知道保存校園和家鄉記憶的重要，希望我們第 40 屆畢業前能一起留下最棒的時光膠囊！", date: "2026-11-12" },
    { cls: "五乙", name: "林同學", book: "《圖書館獅子》", quote: "雖然獅子很大隻，但只要願意遵守規定並幫忙大家，也能成為蘆映書院最溫暖的守護者。", date: "2026-11-10" },
    { cls: "閱讀團隊", name: "徐秉鴻老師", book: "《紅磚牆外的世界窗》", quote: "邀請孩子從蘆竹湳紅磚窗花出發，用英語與幾何眼睛重新讀懂家鄉文化！", date: "2026-11-05" }
  ];

  function loadTalkBooks() {
    try {
      const saved = JSON.parse(localStorage.getItem(TALKBOOK_KEY) || "null");
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_TALKBOOKS;
    } catch {
      return DEFAULT_TALKBOOKS;
    }
  }

  function renderTalkBooks() {
    const listEl = document.getElementById("talkbook-list");
    if (!listEl) return;
    const rows = loadTalkBooks();
    listEl.innerHTML = rows
      .map(
        (r) => `
      <div class="talkbook-entry">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong style="color:var(--brand-navy);">${escapeHtml(r.cls)} ‧ ${escapeHtml(r.name)}</strong>
          <small style="color:var(--ink-muted);">${escapeHtml(r.date)}</small>
        </div>
        <div style="font-weight:700; color:var(--brand-gold-deep); margin-bottom:3px;">推薦：${escapeHtml(r.book)}</div>
        <div>${escapeHtml(r.quote)}</div>
      </div>
    `
      )
      .join("");
  }

  const tbForm = document.getElementById("talkbook-form");
  if (tbForm) {
    tbForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const cls = document.getElementById("tb-class").value.trim();
      const name = document.getElementById("tb-name").value.trim();
      const book = document.getElementById("tb-book").value.trim();
      const quote = document.getElementById("tb-quote").value.trim();
      if (!cls || !name || !book || !quote) return;

      const list = loadTalkBooks();
      const today = new Date().toISOString().slice(0, 10);
      list.unshift({ cls, name, book, quote, date: today });
      try {
        localStorage.setItem(TALKBOOK_KEY, JSON.stringify(list.slice(0, 20)));
      } catch { /* ignore storage quota */ }
      renderTalkBooks();
      tbForm.reset();
      document.getElementById("tb-feedback").textContent = "已成功送出聊書推薦！您的心得已即時張貼至右側親師生聊書牆。";
    });
  }

  // 志工招募與服務時段資訊（不公開志工個人名單）
  let activeVolRole = "parent";

  function renderVolunteerSchedule(role) {
    activeVolRole = role;
    const host = document.getElementById("vol-schedule-wrap");
    if (!host) return;
    document.querySelectorAll("[data-vol-role]").forEach((b) => {
      const active = b.dataset.volRole === role;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });

    if (role === "parent") {
      host.innerHTML = `
        <table class="vol-table">
          <thead>
            <tr><th>招募值勤時段</th><th>服務組別與需求人數</th><th>館務支援項目</th><th>招募狀態</th></tr>
          </thead>
          <tbody>
            <tr><td>週一至週五 09:00–11:30</td><td>上午故事暨流通組（每時段 1–2 名）</td><td>低年級晨間進班說故事、櫃台借還暨新書整架</td><td>開放報名</td></tr>
            <tr><td>週三上午 09:00–11:30</td><td>週三聽故事專場組（每場 2 名）</td><td>週三繪本導讀、大螢幕說書活動現場協同</td><td>歡迎加入</td></tr>
            <tr><td>週一至週五 13:00–15:00</td><td>下午策展暨整理組（每時段 1–2 名）</td><td>主題書展闖關引導、還書上架與空間維護</td><td>開放報名</td></tr>
          </tbody>
        </table>
      `;
    } else {
      host.innerHTML = `
        <table class="vol-table">
          <thead>
            <tr><th>值勤組別</th><th>值勤時間</th><th>值勤日誌規範</th><th>館務職責</th></tr>
          </thead>
          <tbody>
            <tr><td>中年級圖書館小大使</td><td>下課・午休 12:35–13:00</td><td>圖書館小大使值勤日誌－中年級</td><td>繪本區與橋梁書整架、維持入館輕聲禮儀、協助使用代書卡</td></tr>
            <tr><td>高年級圖書館小大使</td><td>下課・午休 12:35–13:00</td><td>圖書館小大使值勤日誌－高年級</td><td>中圖法 800 類上架稽核、條碼借還刷讀協助、書展闖關蓋章</td></tr>
            <tr><td>小大使服務獎勵</td><td>每學期值勤滿 12 次</td><td>圖書館服務敘獎辦法</td><td>期末頒發服務獎狀、享有新上架精選圖書優先預約權</td></tr>
          </tbody>
        </table>
      `;
    }
  }

  document.querySelectorAll("[data-vol-role]").forEach((btn) => {
    btn.addEventListener("click", () => renderVolunteerSchedule(btn.dataset.volRole));
  });

  const volForm = document.getElementById("vol-signup-form");
  if (volForm) {
    volForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const slot = document.getElementById("vol-slot").value;
      const name = document.getElementById("vol-name").value.trim();
      const task = document.getElementById("vol-task").value;
      if (!name) return;
      renderVolunteerSchedule("parent");
      volForm.reset();
      document.getElementById("vol-feedback").textContent = `已登記您的服務意願（${slot}／${task}）！為保護個人隱私，本系統不公開張貼志工名單，請來電 037-623290 分機 740（閱讀策展窗口）／ 741（圖推教師團隊）完成最終確認。`;
    });
  }

  // 永馨樓 1F「蘆映書院」平面圖與 3D 空間示意
  const FP_GALLERY_SLIDES = [
    { u: "assets/images/blueprint-plan.jpg", n: "圖號 05/32｜永馨樓 1F 蘆映書院平面配置圖", s: "永馨樓 1F 蘆映書院平面圖", d: "115年度圖書館空間改善工程" },
    { u: "assets/images/blueprint-plan2.jpg", n: "圖號 09/32｜平面配置圖(二) 家具與設備詳圖", s: "永馨樓 1F 蘆映書院平面圖", d: "115年度圖書館空間改善工程" },
    { u: "assets/images/blueprint-lighting.jpg", n: "圖號 08/32｜新設燈具配置暨照度分析圖（696 Lux）", s: "永馨樓 1F 蘆映書院照度設計", d: "115年度圖書館空間改善工程" },
    { u: "assets/images/blueprint-3d.jpg", n: "圖號 31/32｜入口意象(一)(二) ＆ 造型窩居意象(一)(二)", s: "永馨樓 1F 蘆映書院 3D 示意", d: "115年度圖書館空間改善工程" },
    { u: "assets/images/blueprint-3d-full.jpg", n: "圖號 32/32｜室內 3D 全景示意圖(一)～(四)", s: "永馨樓 1F 蘆映書院 3D 示意", d: "115年度圖書館空間改善工程" }
  ];

  function renderFloorplan(campusKey) {
    const body = document.getElementById("fp-content");
    if (!body) return;
    const mode = campusKey === "3d" ? "3d" : "luying";
    document.querySelectorAll("[data-fp-campus]").forEach((b) => {
      const active = b.dataset.fpCampus === mode;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });

    if (mode === "luying") {
      body.innerHTML = `
        <p style="margin-top:0;"><strong>永馨樓 1F「蘆映書院」｜平面配置與照度設計（約 50 坪｜17,437 × 8,289 mm）</strong>｜規劃舞台區（架高地板＋造型白板推拉門 2 樘）、共學討論區（移動式造型桌 24 張＋討論椅 32 張）、理書區、圖書區（高櫃 11 座＋矮櫃 31 座＋大／小窩居）、窗邊閱讀吧檯與檢索服務櫃台。</p>
        <div class="fp-images-grid">
          <figure class="fp-figure">
            <img src="assets/images/blueprint-plan.jpg" alt="115年度永貞國小圖書館空間改善工程圖號 05/32 平面配置圖" data-fp-zoom="0" style="cursor:zoom-in;">
            <figcaption><strong>圖號 05/32｜平面配置圖（點擊放大）：</strong>完整標示 17,437 × 8,289 mm 全室尺度、舞台區、討論區、理書區、服務櫃台、檢索區、雜誌書報架、圖書區與窗邊閱讀區動線。</figcaption>
          </figure>
          <figure class="fp-figure">
            <img src="assets/images/blueprint-plan2.jpg" alt="115年度永貞國小圖書館空間改善工程圖號 09/32 平面配置圖(二)" data-fp-zoom="1" style="cursor:zoom-in;">
            <figcaption><strong>圖號 09/32｜平面配置圖(二) 設備配置（點擊放大）：</strong>標註 50 坪 PVC 地磚、24 張造型桌／32 張討論椅、系統高低書櫃（42 座以上）、大／小窩居、防焰捲簾 18 組與監視／電信設備櫃。</figcaption>
          </figure>
          <figure class="fp-figure" style="grid-column: 1 / -1;">
            <img src="assets/images/blueprint-lighting.jpg" alt="115年度永貞國小圖書館空間改善工程圖號 08/32 新設燈具配置與照度分析圖" data-fp-zoom="2" style="cursor:zoom-in;">
            <figcaption><strong>圖號 08/32｜照明燈具暨照度分析圖（平均照度 696 Lux ‧ 點擊放大）：</strong>整合藤編造型吊燈（5 盞）、吸頂式筒燈（35 盞）、聚光軌道燈（6 盞）、LED 崁燈（9 盞）與 7 組吊扇，確保學童舒適護眼閱覽亮度。</figcaption>
          </figure>
        </div>
      `;
    } else {
      body.innerHTML = `
        <p style="margin-top:0;"><strong>永馨樓 1F「蘆映書院」｜入口意象、造型窩居與全域 3D 空間示意（圖號 31/32 ＆ 32/32）</strong>｜融合頭份紅磚文化牆面、山屋窗景主題書櫃、內崁還書箱與溫暖木質窩居（註：工程初期草圖看板曾暫標「蘆竹」，經師生命名投票正式定名為「蘆映書院」）。</p>
        <div class="fp-images-grid">
          <figure class="fp-figure">
            <img src="assets/images/blueprint-3d.jpg" alt="圖號 31/32 入口意象與大小窩居 3D 示意圖" data-fp-zoom="3" style="cursor:zoom-in;">
            <figcaption><strong>圖號 31/32｜入口意象(一)(二)＆窩居意象(一)(二)（點擊放大）：</strong>展現門口木作主題書窗與獨立還書箱設計、以及內部圓弧黃框大／小窩居閱讀角落與螺旋造型矮凳。</figcaption>
          </figure>
          <figure class="fp-figure">
            <img src="assets/images/blueprint-3d-full.jpg" alt="圖號 32/32 永馨樓 1F 蘆映書院室內 3D 全景示意圖(一)至(四)" data-fp-zoom="4" style="cursor:zoom-in;">
            <figcaption><strong>圖號 32/32｜室內 3D 全景示意圖(一)～(四)（點擊放大）：</strong>呈現 L 型服務櫃台（含 LED 線型燈條）、六組靈活拼合討論桌群、藤編吊燈與環繞式高／矮系統開放書架空間視角。</figcaption>
          </figure>
        </div>
      `;
    }
    body.querySelectorAll("[data-fp-zoom]").forEach((imgEl) => {
      imgEl.addEventListener("click", () => {
        if (window.__yzOpenGalleryLightbox) {
          window.__yzOpenGalleryLightbox(FP_GALLERY_SLIDES, Number(imgEl.dataset.fpZoom || 0));
        }
      });
    });
  }

  document.querySelectorAll("[data-fp-campus]").forEach((btn) => {
    btn.addEventListener("click", () => renderFloorplan(btn.dataset.fpCampus));
  });

  // 榮譽典範與捐資芳名錄 Modal
  function renderHonorsModal() {
    const body = document.getElementById("honors-modal-body");
    if (!body) return;
    body.innerHTML = `
      <div class="fp-images-grid" style="margin-bottom:18px;">
        <figure class="fp-figure">
          <img src="assets/images/mssr-award.jpg" alt="2025 明日閱讀年度推薦學校獎狀">
          <figcaption><strong>2025 明日閱讀年度推薦學校獎狀：</strong>中央大學蕭述三校長、中華明日閱讀協會陳德懷理事長共同頒授（中華民國 114 年 12 月 12 日）。</figcaption>
        </figure>
        <figure class="fp-figure">
          <img src="assets/images/writing-award.jpg" alt="114 苗栗縣文狀元頒獎典禮實照">
          <figcaption><strong>114 翰墨鳴華・苗栗縣文狀元頒獎典禮：</strong>永貞國小江沂潔同學榮獲狀元、饒恩慈同學榮獲五年級秀才，寫作力獲全縣肯定。</figcaption>
        </figure>
      </div>
      <div class="subfolders-grid">
        <div class="subfolder-card">
          <h4>🏫 教師與學校認證里程碑</h4>
          <ul class="sample-file-list">
            <li>通過「明日閱讀典範學校第二級」認證（MSSR 邁入第 10 年）</li>
            <li>彭仁星主任榮獲「明日閱讀聊書典範教師」，全校 10+ 位教師通過 MSSR 典範教師認證</li>
            <li>徐秉鴻教師發表論文於《2025 自主學習節》暨參與《2026 第十六屆閱讀評量與教學研討會》與《2026 夢 N 台中場》實踐家發表</li>
          </ul>
        </div>
        <div class="subfolder-card">
          <h4>🤝 公益捐資贈書與補助計畫（僅列名稱與額度）</h4>
          <ul class="sample-file-list">
            <li><strong>財團法人陳沼濤文教基金會：</strong>捐贈小兵文化系列等優質兒童閱讀書籍，充實全校 17 班共讀</li>
            <li><strong>7-ELEVEN 把愛找回來 × e 啟讀出未來：</strong>114 學年捐贈電子書閱讀器進駐永貞推動數位永續共讀</li>
            <li><strong>誠品文化藝術基金會：</strong>二度捐贈二手優質書籍並派遣「誠品行動書車」蒞校巡迴共讀</li>
            <li><strong>學校圖書館空間環境改善計畫：</strong>核定額度新台幣 300 萬元（含標竿參訪計畫 7 萬元）</li>
            <li><strong>圖書採購充實館藏暨增置圖推教師計畫：</strong>採購額度 23 萬元／圖推教師 16.4 萬元／年（推動計畫 2 萬元／年）</li>
          </ul>
        </div>
      </div>
    `;
  }

  // 全站關鍵字搜尋
  function runGlobalSearch(rawQ) {
    const q = (rawQ || "").trim();
    const qLower = q.toLowerCase();
    const titleEl = document.getElementById("search-modal-title");
    const body = document.getElementById("search-modal-body");
    if (!body) return;

    if (titleEl) {
      titleEl.textContent = q ? `館藏暨閱讀成果搜尋：「${q}」` : "全館關鍵字快速索引";
    }

    if (!q) {
      body.innerHTML = `<p>請輸入關鍵字（例如：<code>蘆映書院</code>、<code>明日閱讀</code>、<code>識字金銀島</code>、<code>子竹嚐肉</code>、<code>圖書館獅子</code>、<code>陳沼濤</code>），即可同步檢索書目、榮譽典範與圖書館八大典藏專區。</p>`;
      openModal("modal-search");
      return;
    }

    const matchedBooks = ARCHIVE.books.filter((b) =>
      `${b.title} ${b.author} ${b.callNo} ${b.grade} ${b.theme} ${b.prompt}`.toLowerCase().includes(qLower)
    );

    const CATALOG = window.YONGZHEN_CATALOG || { stats: {}, items: [] };
    const catNameMap = Object.fromEntries(ARCHIVE.categories.map((c) => [c.code, c.title]));
    const matchedCatItems = CATALOG.items.filter((it) =>
      `${it.n} ${it.s} ${it.d} ${catNameMap[it.c] || ""}`.toLowerCase().includes(qLower)
    );
    const matchedCatDocs = matchedCatItems.filter((it) => it.k === "d");
    const matchedCatImgs = matchedCatItems.filter((it) => it.k === "g");
    const matchedCatArch = matchedCatItems.filter((it) => it.k === "v" || it.k === "D" || it.k === "G");

    const matchedArchives = [];
    ARCHIVE.categories.forEach((c) => {
      const catHit = `${c.title} ${c.summary} ${c.highlights.join(" ")}`.toLowerCase().includes(qLower);
      const hitSubs = c.subfolders.filter((s) => {
        const filesStr = [...s.sampleDocs, ...s.sampleImgs].map((f) => f.name).join(" ");
        return `${s.name} ${filesStr}`.toLowerCase().includes(qLower);
      });
      if (catHit || hitSubs.length) {
        matchedArchives.push({ cat: c, subs: hitSubs });
      }
    });

    const matchedHonors = TICKER_ITEMS.filter((t) => `${t.tag} ${t.text}`.toLowerCase().includes(qLower));

    body.innerHTML = `
      <div class="chip-row" style="margin-bottom:14px;">
        <span class="chip chip-navy">館藏書單符合 ${matchedBooks.length} 筆</span>
        <span class="chip chip-gold">典藏專區符合 ${matchedArchives.length} 大類</span>
        <span class="chip chip-soft">榮譽／贈書符合 ${matchedHonors.length} 則</span>
      </div>
      ${matchedArchives.length ? `<h3 style="color:var(--brand-navy);">一、圖書館閱讀典藏專區相符項目</h3><div class="subfolders-grid" style="margin-bottom:18px;">` + matchedArchives.map((m) => `
        <div class="subfolder-card">
          <h4>[館藏 ${escapeHtml(m.cat.code)}] ${escapeHtml(m.cat.title)}</h4>
          <p style="font-size:0.82rem;">${escapeHtml(m.cat.summary)}</p>
          ${m.subs.length ? `<ul class="sample-file-list">${m.subs.map((s) => `<li>📁 ${escapeHtml(s.name)}（${s.files} 檔）</li>`).join("")}</ul>` : ""}
          <button type="button" class="btn btn-primary btn-sm" style="margin-top:8px;" data-open-modal="modal-archive" data-archive-cat="${escapeHtml(m.cat.id)}">瀏覽專區與計畫額度</button>
        </div>
      `).join("") + `</div>` : ""}
      ${matchedBooks.length ? `<h3 style="color:var(--brand-navy);">二、館藏暨書展推薦書目</h3><div class="opac-results" style="margin-bottom:18px;">` + matchedBooks.slice(0, 8).map((b) => `
        <article class="opac-item">
          <span class="chip chip-navy">${escapeHtml(b.grade)}・${escapeHtml(b.callNo)}</span>
          <h4>《${escapeHtml(b.title)}》</h4>
          <p>${escapeHtml(b.author)}｜${escapeHtml(b.location)}</p>
        </article>
      `).join("") + `</div>` : ""}
      ${matchedHonors.length ? `<h3 style="color:var(--brand-navy);">三、榮譽典範與捐資紀錄</h3><ul class="sample-file-list">${matchedHonors.map((h) => `<li><strong>[${escapeHtml(h.tag)}]</strong> ${escapeHtml(h.text)}</li>`).join("")}</ul>` : ""}
      ${
        matchedCatDocs.length
          ? `<div class="search-cat-group">
              <h3 style="color:var(--brand-navy);">四、公開教學檔案可直接開啟／下載（共 ${matchedCatDocs.length} 份，顯示前 20 筆）</h3>
              <div class="cat-doc-list">
                ${matchedCatDocs
                  .slice(0, 20)
                  .map(
                    (it) => `
                  <div class="cat-doc-row">
                    <div class="cat-doc-main">
                      <div class="cat-doc-title-line">
                        <span class="ext-badge">檔案</span>
                        <span class="cat-doc-name">${escapeHtml(it.n)}</span>
                      </div>
                      <div class="cat-doc-meta">分類 ${escapeHtml(it.c)}・${escapeHtml(it.s)}（${escapeHtml(it.d || "—")}・${it.m} MB）</div>
                    </div>
                    <div class="cat-doc-actions">
                      <a class="doc-act-btn" href="${escapeHtml(it.u)}" target="_blank" rel="noopener">線上開啟</a>
                      <a class="doc-act-btn primary" href="${escapeHtml(it.u)}" download="${escapeHtml(it.n)}">下載</a>
                    </div>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      ${
        matchedCatImgs.length
          ? `<div class="search-cat-group">
              <h3 style="color:var(--brand-navy);">五、相符學生學習精選情境示意圖（共 ${matchedCatImgs.length} 張，最多顯示 10 張點擊放大）</h3>
              <div class="cat-gallery-grid" id="yz-search-photo-grid">
                ${matchedCatImgs
                  .slice(0, 10)
                  .map(
                    (it, idx) => `
                  <button type="button" class="cat-photo-card" data-sgidx="${idx}" title="點擊放大：${escapeHtml(it.n)}">
                    <img src="${escapeHtml(it.u)}" alt="${escapeHtml(formatPhotoDisplayTitle(it, idx))}" loading="lazy">
                    <div class="cat-photo-cap"><strong>${escapeHtml(formatPhotoDisplayTitle(it, idx))}</strong><span>${escapeHtml(it.s)}</span></div>
                  </button>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      ${
        matchedCatArch.length
          ? `<div class="search-cat-group">
              <h3 style="color:var(--brand-navy);">六、影音與校內大檔完整清冊索引（共 ${matchedCatArch.length} 筆，顯示前 12 筆）</h3>
              <div class="cat-doc-list">
                ${matchedCatArch
                  .slice(0, 12)
                  .map(
                    (it) => `
                  <div class="cat-doc-row">
                    <div class="cat-doc-main">
                      <div class="cat-doc-title-line">
                        <span class="ext-badge ${it.k === "v" ? "is-vid" : "is-arch"}">${it.k === "v" ? "影音 MP4" : "校內原檔"}</span>
                        <span class="cat-doc-name">${escapeHtml(it.n)}</span>
                      </div>
                      <div class="cat-doc-meta">分類 ${escapeHtml(it.c)}・${escapeHtml(it.s)}（${escapeHtml(it.d || "—")}・${it.m} MB・備份於校內 E:\\2024-2026閱讀教學）</div>
                    </div>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      ${!matchedBooks.length && !matchedArchives.length && !matchedHonors.length && !matchedCatItems.length ? `<p>未找到完全相符項目，請嘗試較短關鍵字（如 <code>閱讀</code>、<code>書展</code>、<code>MSSR</code>、<code>圖書</code>、<code>夢N</code>、<code>字</code>）。</p>` : ""}
    `;
    openModal("modal-search");
    const spGrid = body.querySelector("#yz-search-photo-grid");
    if (spGrid && window.__yzOpenGalleryLightbox) {
      spGrid.querySelectorAll("[data-sgidx]").forEach((btn) => {
        btn.addEventListener("click", () => {
          window.__yzOpenGalleryLightbox(matchedCatImgs.slice(0, 10), Number(btn.dataset.sgidx || 0));
        });
      });
    }
  }

  ["global-search-form", "mobile-search-form"].forEach((fid) => {
    const f = document.getElementById(fid);
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = f.querySelector("input");
      closeMobileDrawer();
      runGlobalSearch(inp ? inp.value : "");
    });
  });

  /* ---------- 9. 全域事件代理（統一處理動態產生的按鈕與選單導覽） ---------- */
  document.addEventListener("click", (e) => {
    const lightboxBtn = e.target.closest("[data-lightbox-src]");
    if (lightboxBtn) {
      const img = document.getElementById("lightbox-img");
      const cap = document.getElementById("lightbox-caption");
      img.src = lightboxBtn.dataset.lightboxSrc;
      img.alt = lightboxBtn.dataset.lightboxTitle || "永貞閱讀實景影像";
      cap.textContent = lightboxBtn.dataset.lightboxTitle || "實照原件檢視";
      openModal("modal-lightbox", lightboxBtn);
      return;
    }

    const fpBtn = e.target.closest("[data-open-floorplan]");
    if (fpBtn) {
      e.preventDefault();
      closeAllDropdowns();
      closeMobileDrawer();
      renderFloorplan(fpBtn.dataset.openFloorplan);
      openModal("modal-floorplan", fpBtn);
      return;
    }

    const modalTrigger = e.target.closest("[data-open-modal]");
    if (modalTrigger) {
      e.preventDefault();
      closeAllDropdowns();
      closeMobileDrawer();
      const mid = modalTrigger.dataset.openModal;
      if (mid === "modal-opac") {
        if (modalTrigger.dataset.opacFilter) {
          document.getElementById("opac-theme-filter").value = modalTrigger.dataset.opacFilter;
        }
        if (modalTrigger.dataset.opacStage) {
          document.getElementById("opac-stage-filter").value = modalTrigger.dataset.opacStage;
        }
        renderOpacResults();
      } else if (mid === "modal-talkbook") {
        renderTalkBooks();
      } else if (mid === "modal-volunteer") {
        renderVolunteerSchedule(activeVolRole);
      } else if (mid === "modal-honors") {
        renderHonorsModal();
      } else if (mid === "modal-archive") {
        populateArchiveModal(modalTrigger.dataset.archiveCat);
      }
      openModal(mid, modalTrigger);
      return;
    }

    const filterCatLink = e.target.closest("[data-filter-cat]");
    if (filterCatLink) {
      closeAllDropdowns();
      closeMobileDrawer();
      const catId = filterCatLink.dataset.filterCat;
      renderArchiveGrid(catId);
      setTimeout(() => {
        populateArchiveModal(catId);
        openModal("modal-archive", filterCatLink);
      }, 180);
      return;
    }

    const l4Link = e.target.closest("[data-l4-tab]");
    if (l4Link) {
      closeAllDropdowns();
      closeMobileDrawer();
      switchL4Tab(l4Link.dataset.l4Tab);
      return;
    }

    const stageLink = e.target.closest("[data-select-stage]");
    if (stageLink) {
      closeAllDropdowns();
      closeMobileDrawer();
      renderStageDetail(stageLink.dataset.selectStage);
    }
  });

  /* ---------- 10. 回到頂端按鈕與初始掛載執行 ---------- */
  const backToTopBtn = document.getElementById("back-to-top");
  const footerTopBtns = document.querySelectorAll(".footer-top-btn");
  const siteFooterEl = document.getElementById("site-footer");

  function scrollPageTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  footerTopBtns.forEach((btn) => btn.addEventListener("click", scrollPageTop));

  if (backToTopBtn) {
    let footerInView = false;
    const syncTopBtn = () => {
      backToTopBtn.hidden = window.scrollY < 420 || footerInView;
    };
    if ("IntersectionObserver" in window && siteFooterEl) {
      const obs = new IntersectionObserver(
        (entries) => {
          footerInView = entries[0].isIntersecting;
          syncTopBtn();
        },
        { threshold: 0.05 }
      );
      obs.observe(siteFooterEl);
    }
    window.addEventListener("scroll", syncTopBtn, { passive: true });
    backToTopBtn.addEventListener("click", scrollPageTop);
    syncTopBtn();
  }

  /* ---------- 10B. 全站公開典藏藝廊與共用燈箱掛載 ---------- */
  function initCatalogLightboxAndSummary() {
    window.__yzOpenGalleryLightbox = (list, startIdx) => {
      if (!list || !list.length) return;
      let lb = document.getElementById("yz-gallery-lightbox");
      if (!lb) {
        lb = document.createElement("div");
        lb.id = "yz-gallery-lightbox";
        lb.className = "yz-gallery-modal";
        lb.setAttribute("role", "dialog");
        lb.setAttribute("aria-modal", "true");
        lb.setAttribute("aria-label", "活動相片放大檢視");
        lb.hidden = true;
        lb.innerHTML = `
          <div class="yz-gallery-dialog">
            <div class="yz-gallery-top">
              <span class="yz-gallery-counter" id="yz-lb-counter"></span>
              <button type="button" class="yz-gallery-close" id="yz-lb-close">關閉 (ESC)</button>
            </div>
            <div class="yz-gallery-stage">
              <button type="button" class="yz-gallery-nav prev" id="yz-lb-prev" aria-label="上一張相片">‹</button>
              <img id="yz-lb-img" src="" alt="">
              <button type="button" class="yz-gallery-nav next" id="yz-lb-next" aria-label="下一張相片">›</button>
            </div>
            <div class="yz-gallery-foot">
              <span id="yz-lb-caption"></span>
              <a id="yz-lb-dl" class="doc-act-btn primary" href="#" download>下載相片</a>
            </div>
          </div>
        `;
        document.body.appendChild(lb);
      }

      let idx = Math.max(0, Math.min(startIdx || 0, list.length - 1));
      const imgEl = lb.querySelector("#yz-lb-img");
      const capEl = lb.querySelector("#yz-lb-caption");
      const cntEl = lb.querySelector("#yz-lb-counter");
      const dlEl = lb.querySelector("#yz-lb-dl");
      const prevBtn = lb.querySelector("#yz-lb-prev");
      const nextBtn = lb.querySelector("#yz-lb-next");
      const closeBtn = lb.querySelector("#yz-lb-close");

      const renderSlide = () => {
        const item = list[idx];
        imgEl.src = item.u;
        imgEl.alt = item.n;
        cntEl.textContent = `${idx + 1} / ${list.length} ・ ${item.s}`;
        capEl.textContent = `${item.n}（拍攝／建檔：${item.d || "—"}）`;
        dlEl.href = item.u;
        dlEl.download = item.n;
        prevBtn.style.visibility = list.length > 1 ? "visible" : "hidden";
        nextBtn.style.visibility = list.length > 1 ? "visible" : "hidden";
      };
      const closeLb = () => {
        lb.hidden = true;
        document.removeEventListener("keydown", onKey);
      };
      const onKey = (ev) => {
        if (lb.hidden) return;
        if (ev.key === "Escape") closeLb();
        else if (ev.key === "ArrowLeft" && list.length > 1) {
          idx = (idx - 1 + list.length) % list.length;
          renderSlide();
        } else if (ev.key === "ArrowRight" && list.length > 1) {
          idx = (idx + 1) % list.length;
          renderSlide();
        }
      };

      prevBtn.onclick = () => {
        idx = (idx - 1 + list.length) % list.length;
        renderSlide();
      };
      nextBtn.onclick = () => {
        idx = (idx + 1) % list.length;
        renderSlide();
      };
      closeBtn.onclick = closeLb;
      lb.onclick = (ev) => {
        if (ev.target === lb) closeLb();
      };
      document.addEventListener("keydown", onKey);
      renderSlide();
      lb.hidden = false;
    };

    const archExplorer = document.getElementById("archive-explorer");
    const catStats = (window.YONGZHEN_CATALOG && window.YONGZHEN_CATALOG.stats) || null;
    if (archExplorer && catStats && !archExplorer.querySelector(".cat-stats-banner")) {
      const banner = document.createElement("div");
      banner.className = "cat-stats-banner";
      banner.innerHTML = `
        <div class="cat-stats-pills">
          <span class="cat-stat-pill">📄 已上線公開教學檔案 <strong>${catStats.deployedDocs}</strong> 份（${catStats.deployedDocsMB} MB）</span>
          <span class="cat-stat-pill">🖼️ 各區塊精選學生學習情境圖 <strong>${catStats.deployedPhotos.toLocaleString()}</strong> 張（每區塊最多 10 張・僅 ${catStats.deployedPhotosMB} MB）</span>
          <span class="cat-stat-pill">🎬 影音暨校內大檔索引 <strong>${catStats.archivedVideos + catStats.archivedDocsLarge + catStats.archivedPhotosMore}</strong> 筆（全庫 ${catStats.totalPublicIndexed.toLocaleString()} 筆公開檢索）</span>
        </div>
        <p class="cat-privacy-note">點選下方任一分類卡片即可瀏覽與下載公開 PDF／書單／教案，每區塊最多呈現 10 張精選學生學習最佳意象情境示意圖以節省雲端空間；經費計畫依規範僅揭露名稱與額度。</p>
      `;
      const grid = archExplorer.querySelector(".archive-grid");
      if (grid) {
        archExplorer.insertBefore(banner, grid);
      } else {
        archExplorer.prepend(banner);
      }
    }
  }

  updateLibraryStatus();
  buildMobileMenu();
  renderNewBooksSpotlight();
  renderArchiveGrid();
  initCatalogLightboxAndSummary();
  renderStageDetail("low");
  syncFooterAccordionMode();
})();
