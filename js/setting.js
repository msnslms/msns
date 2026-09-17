/* ==========================================================================
   MSNS LANGUAGE SETTINGS — FLOATING LIQUID GLASS BUTTON (All-in-One JS)
   ========================================================================== */

/* 1. TRANSLATE නොවිය යුතු Elements */
const doNotTranslateList = [
  '.sidebar-title',
  '.header-title',
  '.dev-name',
  '.credit-text',
  '.al-text',
  'code',
  'pre',
  '#closeMenu',
  '#menuToggle',
  '#msnsLangFloat',
  '#msnsLangPopup',
  '.grid-container',
   '#backToTop'
];

/* 2. STYLES & FONTS INJECT කිරීම */
function injectLanguageStyles() {
  // Load Google Fonts dynamically for proper liquid glass styling
  if (!document.getElementById('msns-lang-fonts-link')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'msns-lang-fonts-link';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  if (document.getElementById('msns-lang-styles')) return;
  const style = document.createElement('style');
  style.id = 'msns-lang-styles';
  style.innerHTML = `
    /* --- Floating Button --- */
    .msns-lang-float {
      position: fixed;
      bottom: 40px; /* පොඩ්ඩක් උඩට ගත්තා (24px -> 40px) */
      left: 20px;
      z-index: 999998;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .msns-lang-btn {
      width: 60px; /* සාමාන්‍ය ප්‍රමාණයකට ලොකු කළා (54px -> 60px) */
      height: 60px; /* සාමාන්‍ය ප්‍රමාණයකට ලොකු කළා (54px -> 60px) */
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(22px) saturate(180%);
      -webkit-backdrop-filter: blur(22px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.95);
      box-shadow:
        0 8px 28px rgba(0, 0, 0, 0.14),
        0 2px 8px rgba(0, 0, 0, 0.08),
        inset 0 1px 1px rgba(255, 255, 255, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.3s ease,
                  background 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .msns-lang-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg,
        rgba(255,255,255,0.75) 0%,
        rgba(255,255,255,0.15) 50%,
        rgba(255,255,255,0) 100%);
      border-radius: 50%;
      pointer-events: none;
    }
    .msns-lang-btn svg {
      width: 28px; /* අයිකන් එකත් ටිකක් ලොකු කළා (26px -> 28px) */
      height: 28px;
      position: relative;
      z-index: 1;
    }
    .msns-lang-float:hover .msns-lang-btn {
      transform: scale(1.06) translateY(-2px);
      background: rgba(255, 255, 255, 0.95);
      box-shadow:
        0 14px 36px rgba(0, 0, 0, 0.18),
        0 4px 12px rgba(0, 0, 0, 0.1),
        inset 0 1px 2px rgba(255, 255, 255, 1);
    }
    .msns-lang-float:active .msns-lang-btn {
      transform: scale(0.96);
    }

    /* --- "Select Language" Hover Hint --- */
    .msns-lang-hint {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #111;
      white-space: nowrap;
      opacity: 0;
      transform: translateX(-8px);
      pointer-events: none;
      transition: all 0.25s ease;
    }
    .msns-lang-float:hover .msns-lang-hint {
      opacity: 1;
      transform: translateX(0);
    }

    /* --- Popup --- */
    .msns-lang-popup {
      position: fixed;
      bottom: 110px; /* Button එක උඩට ගිය නිසා Popup එකත් උඩට ගත්තා (90px -> 110px) */
      left: 20px;
      z-index: 999999;
      min-width: 210px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(26px) saturate(200%);
      -webkit-backdrop-filter: blur(26px) saturate(200%);
      border: 1px solid rgba(255, 255, 255, 0.98);
      border-radius: 18px;
      box-shadow:
        0 16px 44px rgba(0, 0, 0, 0.16),
        0 4px 14px rgba(0, 0, 0, 0.08),
        inset 0 1px 1px rgba(255, 255, 255, 1);
      opacity: 0;
      transform: translateY(12px) scale(0.94);
      transform-origin: bottom left;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .msns-lang-popup.show {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .msns-lang-popup-title {
      font-size: 10px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 12px 8px;
    }
    .msns-lang-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.18s ease;
      font-size: 14px;
      font-weight: 500;
      color: #111;
    }
    .msns-lang-item:hover {
      background: rgba(0, 0, 0, 0.055);
    }
    .msns-lang-item.active {
      background: rgba(0, 122, 255, 0.12);
      color: #007aff;
      font-weight: 700;
    }
    .msns-lang-item .flag {
      font-size: 17px;
      line-height: 1;
    }
    .msns-lang-item .check {
      margin-left: auto;
      color: #007aff;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .msns-lang-item.active .check { opacity: 1; }

    /* --- 📱 Mobile Responsive --- */
    @media (max-width: 640px) {
      .msns-lang-float { bottom: 30px; left: 12px; gap: 0; }
      .msns-lang-btn { width: 54px; height: 54px; }
      .msns-lang-btn svg { width: 24px; height: 24px; }
      .msns-lang-popup {
        bottom: 95px;
        left: 12px;
        min-width: 180px;
      }
      .msns-lang-hint { display: none; }
    }
    @media (max-width: 360px) {
      .msns-lang-btn { width: 50px; height: 50px; }
    }
  `;
  document.head.appendChild(style);
}

/* 3. UI INJECT කිරීම (Button + Popup) */
function injectLanguageUI() {
  if (document.getElementById('msnsLangFloat')) return;

  /* Button */
  const floatBtn = document.createElement('div');
  floatBtn.id = 'msnsLangFloat';
  floatBtn.className = 'msns-lang-float notranslate';
  floatBtn.setAttribute('translate', 'no');
  floatBtn.innerHTML = `
    <div class="msns-lang-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
                 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    </div>
    <div class="msns-lang-hint">Select Language</div>
  `;

  /* Popup */
  const popup = document.createElement('div');
  popup.id = 'msnsLangPopup';
  popup.className = 'msns-lang-popup notranslate';
  popup.setAttribute('translate', 'no');
  popup.innerHTML = `
    <div class="msns-lang-popup-title">Select Language</div>
    <div class="msns-lang-item" data-lang="si">
      <span class="flag">🇱🇰</span>
      <span>සිංහල</span>
      <svg class="check" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="3"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <div class="msns-lang-item" data-lang="ta">
      <span class="flag">🇱🇰</span>
      <span>தமிழ்</span>
      <svg class="check" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="3"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <div class="msns-lang-item" data-lang="en">
      <span class="flag">🇬🇧</span>
      <span>English</span>
      <svg class="check" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="3"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `;

  document.body.appendChild(floatBtn);
  document.body.appendChild(popup);

  /* Button Click → Popup Toggle */
  floatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('show');
  });

  /* Language Select */
  popup.querySelectorAll('.msns-lang-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = item.dataset.lang;
      const name = item.querySelector('span:not(.flag)').textContent.trim();
      selectLanguage(lang, name);
      popup.classList.remove('show');
    });
  });

  /* Outside Click → Close */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#msnsLangFloat') &&
        !e.target.closest('#msnsLangPopup')) {
      popup.classList.remove('show');
    }
  });

  /* Scroll කරාමත් Close */
  window.addEventListener('scroll', () => popup.classList.remove('show'), { passive: true });

  updateActiveLangItem();
}

/* 4. Active Item Mark කිරීම */
function updateActiveLangItem() {
  const savedLang = localStorage.getItem('msns_lang') || 'en';
  document.querySelectorAll('.msns-lang-item').forEach(item => {
    item.classList.toggle('active', item.dataset.lang === savedLang);
  });
}

/* 5. LANGUAGE තේරීම */
function selectLanguage(langCode, langName) {
  localStorage.setItem('msns_lang', langCode);
  localStorage.setItem('msns_lang_name', langName);
  updateActiveLangItem();

  setGoogleTranslateCookie(langCode);

  if (langCode === 'en') {
    window.location.reload();
    return;
  }

  triggerGoogleTranslate(langCode);
  applyFontStyles(langCode);
}

/* 6. Google Translate Cookie */
function setGoogleTranslateCookie(langCode) {
  const domain = window.location.hostname;
  if (langCode === 'en') {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
  } else {
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
  }
}

/* 7. Google Translate Trigger (Retry Loop) */
function triggerGoogleTranslate(langCode) {
  let attempts = 0;
  const maxAttempts = 40;
  const interval = setInterval(() => {
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
      clearInterval(interval);
      selectEl.value = langCode === 'en' ? '' : langCode;
      selectEl.dispatchEvent(new Event('change'));
    } else if (++attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 100);
}

/* 8. Google Translate Callback (Exposed Globally) */
window.googleTranslateElementInit = function() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    autoDisplay: false
  }, 'google_translate_element');

  setInterval(() => {
    if (document.body && document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }
  }, 200);

  const savedLang = localStorage.getItem('msns_lang');
  if (savedLang && savedLang !== 'en') {
    triggerGoogleTranslate(savedLang);
    applyFontStyles(savedLang);
  }
};

/* 9. Google Translate Script Dynamic Load */
function loadGoogleTranslateScript() {
  if (document.getElementById('google-translate-script')) return;

  if (!document.getElementById('google_translate_element')) {
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    el.style.display = 'none';
    document.body.appendChild(el);
  }

  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.type = 'text/javascript';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(script);
}

/* 10. Language එකට ගැලපෙන Fonts */
function applyFontStyles(langCode) {
  let styleTag = document.getElementById('custom-lang-fonts');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'custom-lang-fonts';
    document.head.appendChild(styleTag);
  }
  if (langCode === 'si') {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4, li {
        font-family: 'Noto Sans Sinhala', sans-serif !important;
      }
      p, li, span { font-size: 0.95em !important; line-height: 1.65 !important; }
    `;
  } else if (langCode === 'ta') {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4, li {
        font-family: 'Noto Sans Tamil', sans-serif !important;
      }
      p, li, span { font-size: 0.94em !important; line-height: 1.6 !important; }
    `;
  } else {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4, li {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
      }
    `;
  }
}

/* 11. SAFE INIT (DOM state එක පරික්ෂා කර ධාවනය කිරීම) */
function initMSNSLanguage() {
  doNotTranslateList.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('notranslate');
        el.setAttribute('translate', 'no');
      });
    } catch (e) {}
  });

  injectLanguageStyles();
  injectLanguageUI();
  loadGoogleTranslateScript();

  const savedLang = localStorage.getItem('msns_lang') || 'en';
  applyFontStyles(savedLang);
}

// HTML එක load වී අවසන් වුවත් නැතත් ස්වයංක්‍රීයව ක්‍රියාත්මක වේ
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initMSNSLanguage();
} else {
  document.addEventListener('DOMContentLoaded', initMSNSLanguage);
}

/* 12. BFCache Handler (Back Button එකෙන් එද්දි Translation එක තියාගැනීම) */
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    const savedLang = localStorage.getItem('msns_lang');
    if (savedLang && savedLang !== 'en') {
      triggerGoogleTranslate(savedLang);
      applyFontStyles(savedLang);
    }
  }
});
