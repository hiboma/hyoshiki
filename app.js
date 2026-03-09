// --- ハプティクス ---

const haptics = (() => {
  // iOS Safari: <input type="checkbox" switch> のハプティクスを利用する
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  let hapticEl = null;

  if (isIOS) {
    hapticEl = document.createElement("input");
    hapticEl.type = "checkbox";
    hapticEl.setAttribute("switch", "");
    hapticEl.style.cssText = "position:fixed;opacity:0;pointer-events:none;top:-100px";
    document.body.appendChild(hapticEl);
  }

  return {
    tap() {
      if (hapticEl) {
        hapticEl.click();
      } else if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
  };
})();

(async function () {
  const [signs, spriteMap] = await Promise.all([
    fetch("data/signs.json").then(r => r.json()),
    fetch("data/sprite-map.json").then(r => r.json()),
  ]);

  let currentIndex = 0;
  let filteredSigns = signs; // 現在表示中の標識リスト

  // 入り口ページ
  const landingPage = document.getElementById("landing-page");
  const startBtn = document.getElementById("start-btn");
  const parentBtn = document.getElementById("parent-btn");
  const parentOverlay = document.getElementById("parent-overlay");
  const parentCloseBtn = document.getElementById("parent-close-btn");

  startBtn.addEventListener("click", () => {
    haptics.tap();
    landingPage.classList.add("hidden");
    gridPage.classList.remove("hidden");
    buildGrid();
  });

  parentBtn.addEventListener("click", () => {
    parentOverlay.classList.remove("hidden");
  });

  parentCloseBtn.addEventListener("click", () => {
    parentOverlay.classList.add("hidden");
  });

  parentOverlay.addEventListener("click", (e) => {
    if (e.target === parentOverlay) {
      parentOverlay.classList.add("hidden");
    }
  });

  // ページ要素
  const gridPage = document.getElementById("grid-page");
  const cardPage = document.getElementById("card-page");
  const gridEl = document.getElementById("grid");
  const gridCategoryBtns = document.querySelectorAll("#grid-category-nav .category-btn");
  const cardCategoryLabel = document.getElementById("card-category-label");

  // カード要素
  const counterEl = document.getElementById("counter");
  const cardEl = document.getElementById("card");
  const imageEl = document.getElementById("sign-image");
  const nameBlockEl = document.getElementById("sign-name-block");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const backBtn = document.getElementById("back-btn");

  // 設定関連
  const settingsBtn = document.getElementById("settings-btn");
  const settingsOverlay = document.getElementById("settings-overlay");
  const settingsCloseBtn = document.getElementById("settings-close-btn");
  const voiceSelect = document.getElementById("voice-select");
  const rateRange = document.getElementById("rate-range");
  const pitchRange = document.getElementById("pitch-range");
  const testVoiceBtn = document.getElementById("test-voice-btn");

  // --- グリッドページ ---

  const spriteCols = spriteMap.columns;
  const spriteRows = spriteMap.rows;
  const spritePxW = spriteCols * spriteMap.cellWidth;
  const spritePxH = spriteRows * spriteMap.cellHeight;

  function applySpritePositions() {
    const imgs = gridEl.querySelectorAll(".grid-sign-img");
    if (imgs.length === 0) return;
    const itemW = imgs[0].offsetWidth;
    const itemH = imgs[0].offsetHeight;
    if (itemW === 0) return;
    const bgW = itemW * spriteCols;
    const bgH = itemH * spriteRows;
    imgs.forEach((img) => {
      const col = parseInt(img.dataset.col, 10);
      const row = parseInt(img.dataset.row, 10);
      img.style.backgroundSize = `${bgW}px ${bgH}px`;
      img.style.backgroundPosition = `${-col * itemW}px ${-row * itemH}px`;
    });
  }

  function buildGrid() {
    gridEl.innerHTML = "";
    filteredSigns.forEach((sign, i) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      const img = document.createElement("div");
      img.className = "grid-sign-img";
      img.setAttribute("role", "img");
      img.setAttribute("aria-label", sign.name);
      const pos = spriteMap.signs[sign.id];
      if (pos) {
        img.dataset.col = pos.col;
        img.dataset.row = pos.row;
      }
      item.appendChild(img);
      item.addEventListener("click", () => {
        haptics.tap();
        openCard(i);
      });
      gridEl.appendChild(item);
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(applySpritePositions);
    });
  }

  // --- カテゴリフィルタ ---

  function setCategory(category) {
    gridCategoryBtns.forEach(b => {
      b.classList.toggle("active", b.dataset.category === category);
    });

    if (category === "all") {
      filteredSigns = signs;
    } else {
      filteredSigns = signs.filter(s => s.category === category);
    }
  }

  gridCategoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      haptics.tap();
      setCategory(btn.dataset.category);
      buildGrid();
      gridEl.scrollTop = 0;
    });
  });

  function openCard(index) {
    currentIndex = index;
    render();
    gridPage.classList.add("hidden");
    cardPage.classList.remove("hidden");
  }

  function closeCard() {
    cardPage.classList.add("hidden");
    gridPage.classList.remove("hidden");
    buildGrid();
  }

  backBtn.addEventListener("click", closeCard);

  // --- 権利情報 ---

  const licenseLink = document.getElementById("license-link");
  const licenseOverlay = document.getElementById("license-overlay");
  const licenseCloseBtn = document.getElementById("license-close-btn");

  licenseLink.addEventListener("click", (e) => {
    e.preventDefault();
    licenseOverlay.classList.remove("hidden");
  });

  licenseCloseBtn.addEventListener("click", () => {
    licenseOverlay.classList.add("hidden");
  });

  licenseOverlay.addEventListener("click", (e) => {
    if (e.target === licenseOverlay) {
      licenseOverlay.classList.add("hidden");
    }
  });

  // --- 説明ボトムシート ---

  const descBtn = document.getElementById("desc-btn");
  const descOverlay = document.getElementById("desc-overlay");
  const descCloseBtn = document.getElementById("desc-close-btn");
  const descText = document.getElementById("desc-text");

  const descReplayBtn = document.getElementById("desc-replay-btn");

  function speakDescription() {
    const sign = filteredSigns[currentIndex];
    if (sign.description) {
      const text = sign.description + (sign.aux ? "。" + sign.aux : "");
      speak(text);
    }
  }

  function openDescription() {
    const sign = filteredSigns[currentIndex];
    if (!sign.description) return;
    descText.textContent = sign.description + (sign.aux ? "\n" + sign.aux : "");
    descOverlay.classList.remove("hidden");
    speakDescription();
  }

  function closeDescription() {
    speechSynthesis.cancel();
    descOverlay.classList.add("hidden");
  }

  descBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    haptics.tap();
    openDescription();
  });

  descReplayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    haptics.tap();
    speakDescription();
  });

  descCloseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDescription();
  });

  descOverlay.addEventListener("click", (e) => {
    if (e.target === descOverlay) {
      closeDescription();
    }
  });

  // --- 設定 ---

  const STORAGE_KEY = "kotsuh-settings";

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) { /* ignore */ }
    return { voiceName: "", rate: 0.9, pitch: 1.0 };
  }

  function saveSettings() {
    const settings = {
      voiceName: voiceSelect.value,
      rate: parseFloat(rateRange.value),
      pitch: parseFloat(pitchRange.value),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  let jaVoices = [];

  function populateVoices() {
    const all = speechSynthesis.getVoices();
    jaVoices = all.filter(v => v.lang.startsWith("ja"));

    voiceSelect.innerHTML = "";
    jaVoices.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = v.name;
      voiceSelect.appendChild(opt);
    });

    const settings = loadSettings();
    if (settings.voiceName && jaVoices.some(v => v.name === settings.voiceName)) {
      voiceSelect.value = settings.voiceName;
    }
    rateRange.value = settings.rate;
    pitchRange.value = settings.pitch;
  }

  speechSynthesis.addEventListener("voiceschanged", populateVoices);
  populateVoices();

  // --- 読み上げ ---

  function speak(text) {
    speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ja-JP";
    uttr.rate = parseFloat(rateRange.value);
    uttr.pitch = parseFloat(pitchRange.value);

    const selected = jaVoices.find(v => v.name === voiceSelect.value);
    if (selected) {
      uttr.voice = selected;
    }

    speechSynthesis.speak(uttr);
  }

  // --- 設定画面 ---

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsOverlay.classList.remove("hidden");
  });

  settingsCloseBtn.addEventListener("click", () => {
    saveSettings();
    settingsOverlay.classList.add("hidden");
  });

  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) {
      saveSettings();
      settingsOverlay.classList.add("hidden");
    }
  });

  testVoiceBtn.addEventListener("click", () => {
    const sign = filteredSigns[currentIndex];
    speak(sign.speech || sign.reading || sign.name);
  });

  voiceSelect.addEventListener("change", saveSettings);
  rateRange.addEventListener("input", saveSettings);
  pitchRange.addEventListener("input", saveSettings);

  // --- カード表示 ---

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildRubyHtml(name, reading) {
    if (!name.includes("・")) {
      return `<ruby>${escapeHtml(name)}<rp>(</rp><rt>${escapeHtml(reading)}</rt><rp>)</rp></ruby>`;
    }
    const nameParts = name.split("・");
    const readingParts = reading.split("・");
    return nameParts.map((part, i) => {
      const r = readingParts[i] || "";
      return `<ruby>${escapeHtml(part)}<rp>(</rp><rt>${escapeHtml(r)}</rt><rp>)</rp></ruby>`;
    }).join("<br>");
  }

  function render() {
    const sign = filteredSigns[currentIndex];
    imageEl.src = sign.image;
    imageEl.alt = sign.name;
    nameBlockEl.innerHTML = buildRubyHtml(sign.name, sign.reading || "");
    counterEl.textContent = `${currentIndex + 1} / ${filteredSigns.length}`;
    cardCategoryLabel.dataset.category = sign.category;
    cardCategoryLabel.innerHTML = `<span>${categoryRubyMap[sign.category] || escapeHtml(sign.category)}</span>`;
  }

  const categoryRubyMap = {
    "案内標識": "<ruby>案内標識<rp>(</rp><rt>あんないひょうしき</rt><rp>)</rp></ruby>",
    "警戒標識": "<ruby>警戒標識<rp>(</rp><rt>けいかいひょうしき</rt><rp>)</rp></ruby>",
    "規制標識": "<ruby>規制標識<rp>(</rp><rt>きせいひょうしき</rt><rp>)</rp></ruby>",
    "指示標識": "<ruby>指示標識<rp>(</rp><rt>しじひょうしき</rt><rp>)</rp></ruby>",
  };

  function navigate(direction) {
    closeDescription();
    const slideOut = direction === "next" ? "slide-left" : "slide-right";
    const enterFrom = direction === "next" ? "enter-left" : "enter-right";

    cardEl.classList.add(slideOut);

    setTimeout(() => {
      if (direction === "next") {
        currentIndex = (currentIndex + 1) % filteredSigns.length;
      } else {
        currentIndex = (currentIndex - 1 + filteredSigns.length) % filteredSigns.length;
      }
      render();

      cardEl.classList.remove(slideOut);
      cardEl.classList.add(enterFrom);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardEl.classList.remove(enterFrom);
        });
      });
    }, 250);
  }

  cardEl.addEventListener("click", () => {
    haptics.tap();
    cardEl.classList.remove("tap-pulse");
    void cardEl.offsetWidth; // reflow でアニメーションを再発動させる
    cardEl.classList.add("tap-pulse");
    const sign = filteredSigns[currentIndex];
    speak(sign.speech || sign.reading || sign.name);
  });

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    haptics.tap();
    navigate("prev");
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    haptics.tap();
    navigate("next");
  });

  // --- スワイプ ---

  let touchStartX = 0;
  let touchStartY = 0;

  document.getElementById("card-area").addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.getElementById("card-area").addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        navigate("next");
      } else {
        navigate("prev");
      }
    }
  }, { passive: true });

  // --- キーボード ---

  document.addEventListener("keydown", (e) => {
    if (!settingsOverlay.classList.contains("hidden")) return;
    if (!descOverlay.classList.contains("hidden")) {
      if (e.key === "Escape") closeDescription();
      return;
    }
    if (cardPage.classList.contains("hidden")) return;

    if (e.key === "ArrowRight") navigate("next");
    if (e.key === "ArrowLeft") navigate("prev");
    if (e.key === "Escape") closeCard();
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const sign = filteredSigns[currentIndex];
      speak(sign.speech || sign.reading || sign.name);
    }
  });
})();
