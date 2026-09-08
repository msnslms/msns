/* ==========================================================================
   1. TRANSLATION EXCLUSION LIST (Translate නොවිය යුතු Elements)
   ========================================================================== */
// මෙතනට Class (.className), ID (#idName) හෝ Tags (code, pre, h1, span) එකතු කරන්න
const doNotTranslateList = [

  /* ඔයාගේ තවත් Class, ID හෝ Tags මෙතන කමා (,) දාලා එකතු කරන්න:
     '.my-class',
     '#my-id',
     'button'
  */
];

/* ==========================================================================
   2. EXTERNAL CSS FILES LIST (Dark & White Themes සඳහා CSS Files)
   ========================================================================== */
// Dark Mode එකේදී Load විය යුතු CSS Files List එක
const darkCssFiles = [
  'setting-d.css',
  /* තව Dark CSS Files තියෙනවා නම් මෙතන කමා (,) දාලා එකතු කරන්න:
     'dark-header.css',
     'dark-sidebar.css'
  */
];

// White / Light Mode එකේදී Load විය යුතු CSS Files List එක
const whiteCssFiles = [
  'setting-w.css',
  /* තව White CSS Files තියෙනවා නම් මෙතන කමා (,) දාලා එකතු කරන්න:
     'white-header.css',
     'white-sidebar.css'
  */
];

/* ==========================================================================
   3. CUSTOM INLINE CSS RULES (JS එක ඇතුළෙන්ම අමතර CSS දාන්න ඕන නම්)
   ========================================================================== */
// Dark Mode එකේදී JS එකෙන් Inject වෙන්න ඕන අමතර CSS Rules
const darkCustomCssRules = [
  /* උදාහරණ: 'body { background-color: #0d0f12 !important; }', */
];

// White Mode එකේදී JS එකෙන් Inject වෙන්න ඕන අමතර CSS Rules
const whiteCustomCssRules = [
  /* උදාහරණ: 'body { background-color: #f8fafc !important; }', */
];

/* ==========================================================================
   4. DOM INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // Translate නොවිය යුතු Elements වලට 'notranslate' සහ 'translate=no' යෙදීම
  doNotTranslateList.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.add('notranslate');
        el.setAttribute('translate', 'no');
      });
    } catch (e) {
      console.error(`Invalid selector in doNotTranslateList: ${selector}`);
    }
  });

  // Saved Theme & Language Load කිරීම
  initTheme();
  initLanguage();
});

/* ==========================================================================
   5. CUSTOM DROPDOWN CONTROL (Open/Close & Outside Click)
   ========================================================================== */
function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  const isOpen = dropdown ? dropdown.classList.contains('open') : false;
  
  // සියලුම Dropdowns වැසීම
  document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
  
  if (!isOpen && dropdown) {
    dropdown.classList.add('open');
  }
}

// Dropdown එකෙන් පිටත ක්ලික් කල විට වැසීම
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-dropdown')) {
    document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
  }
});

/* ==========================================================================
   6. THEME SWITCHING (EXTERNAL CSS FILES + JS INLINE CSS + SYSTEM THEME)
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('msns_theme') || 'system';
  applyTheme(savedTheme);
}

function selectTheme(theme) {
  localStorage.setItem('msns_theme', theme);
  applyTheme(theme);
  const themeDropdown = document.getElementById('themeDropdown');
  if (themeDropdown) themeDropdown.classList.remove('open');
}

function applyTheme(theme) {
  const label = document.getElementById('selectedThemeText');
  let activeTheme = theme;

  // System OS Theme Check
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    activeTheme = prefersDark ? 'dark' : 'white';
    if (label) label.innerText = '💻 System Default';
  } else if (theme === 'dark') {
    if (label) label.innerText = '🌙 Dark Mode';
  } else if (theme === 'white') {
    if (label) label.innerText = '☀️ Light Mode (White)';
  }

  // 1. External CSS Files Switch කිරීම (තෝරාගත් තීම් එකේ CSS විතරක් පෙන්වා අනෙක්වා ඉවත් කරයි)
  applyThemeCssFiles(activeTheme);

  // 2. JS Custom CSS Rules Inject කිරීම (Array වල ඇති Custom CSS)
  injectCustomCssRules(activeTheme);
}

// External CSS Files Load/Unload කරන Function එක
function applyThemeCssFiles(activeTheme) {
  // පරණ dynamic theme CSS links සියල්ල DOM එකෙන් ඉවත් කිරීම
  document.querySelectorAll('link[data-dynamic-theme="true"]').forEach(el => el.remove());

  // තෝරාගත් Theme එකට අදාළ Files Array එක ලබාගැනීම
  const filesToLoad = activeTheme === 'white' ? whiteCssFiles : darkCssFiles;

  // අදාළ CSS Files පමණක් dynamic ලෙස Inject කිරීම
  filesToLoad.forEach(filePath => {
    if (filePath && filePath.trim() !== '') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.dynamicTheme = 'true';
      link.href = filePath;
      document.head.appendChild(link);
    }
  });
}

// Dynamic ලෙස Array ඇතුළේ ඇති Inline CSS Rules Head එකට Inject කිරීම
function injectCustomCssRules(activeTheme) {
  let styleTag = document.getElementById('js-dynamic-theme-styles');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'js-dynamic-theme-styles';
    document.head.appendChild(styleTag);
  }

  const rulesToApply = activeTheme === 'white' ? whiteCustomCssRules : darkCustomCssRules;
  styleTag.innerHTML = rulesToApply.join('\n');
}

// Mobile/Device OS Theme එක වෙනස් වන විට Auto Switch වීම
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  const savedTheme = localStorage.getItem('msns_theme') || 'system';
  if (savedTheme === 'system') {
    applyTheme('system');
  }
});

/* ==========================================================================
   7. LANGUAGE & GOOGLE TRANSLATE ENGINE (COOKIE + RETRY LOOP)
   ========================================================================== */
function initLanguage() {
  const savedLang = localStorage.getItem('msns_lang') || 'en';
  const savedLangName = localStorage.getItem('msns_lang_name') || 'English (Default)';
  
  const label = document.getElementById('selectedLangText');
  if (label) label.innerHTML = savedLangName;
  
  applyFontStyles(savedLang);
}

function selectLanguage(langCode, langName) {
  localStorage.setItem('msns_lang', langCode);
  localStorage.setItem('msns_lang_name', langName);
  
  const label = document.getElementById('selectedLangText');
  if (label) label.innerHTML = langName;
  
  const langDropdown = document.getElementById('langDropdown');
  if (langDropdown) langDropdown.classList.remove('open');

  // 1. Google Translate Cookie Set කිරීම
  setGoogleTranslateCookie(langCode);

  // 2. Google Translate Trigger කිරීම
  triggerGoogleTranslate(langCode);
  
  // 3. Font & Size Adjust කිරීම
  applyFontStyles(langCode);
}

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

function triggerGoogleTranslate(langCode) {
  let attempts = 0;
  const maxAttempts = 30; // තත්පර 3ක් දක්වා Check කරයි

  const interval = setInterval(() => {
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
      clearInterval(interval);
      
      if (langCode === 'en') {
        selectEl.value = '';
      } else {
        selectEl.value = langCode;
      }
      
      selectEl.dispatchEvent(new Event('change'));
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }
  }, 100);
}

// Google Translate CallBack Function
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    autoDisplay: false
  }, 'google_translate_element');

  // Page එක Load වෙද්දී Saved වී තිබූ Language එක Auto Trigger කිරීම
  const savedLang = localStorage.getItem('msns_lang');
  if (savedLang && savedLang !== 'en') {
    triggerGoogleTranslate(savedLang);
  }
}

/* ==========================================================================
   8. AUTO FONT & SCALING ADJUSTMENT
   ========================================================================== */
function applyFontStyles(langCode) {
  let styleTag = document.getElementById('custom-lang-fonts');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'custom-lang-fonts';
    document.head.appendChild(styleTag);
  }

  if (langCode === 'si') {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4 {
        font-family: 'Noto Sans Sinhala', 'Iskoola Pota', sans-serif !important;
      }
      p, li, span {
        font-size: 0.95em !important;
        line-height: 1.65 !important;
      }
    `;
  } else if (langCode === 'ta') {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4 {
        font-family: 'Noto Sans Tamil', sans-serif !important;
      }
      p, li, span {
        font-size: 0.94em !important;
        line-height: 1.6 !important;
      }
    `;
  } else {
    styleTag.innerHTML = `
      body, p, a, span, button, h1, h2, h3, h4 {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
      }
    `;
  }
}
// Google Translate CallBack Function
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    autoDisplay: false
  }, 'google_translate_element');

  // Google Top Bar එක බලෙන්ම Body එක පහළට තල්ලු කිරීම වැළැක්වීම
  setInterval(() => {
    if (document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }
  }, 200);

  // Page එක Load වෙද්දී Saved වී තිබූ Language එක Auto Trigger කිරීම
  const savedLang = localStorage.getItem('msns_lang');
  if (savedLang && savedLang !== 'en') {
    triggerGoogleTranslate(savedLang);
  }
}
