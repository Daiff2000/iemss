
/* Radical project-themed login visual */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .visual-side{background:linear-gradient(145deg,#031b36 0%,#075baa 44%,#00a3d9 100%)!important}
    .visual-side:after{content:"";position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 55% 45%,black,transparent 76%)}
    .visual-side .node.n1{width:190px;height:190px;top:8%;right:8%;border-radius:38px;transform:rotate(12deg)}
    .visual-side .node.n1:before{content:"✓";position:absolute;inset:24%;display:grid;place-items:center;border:2px solid rgba(255,255,255,.55);border-radius:50%;font-size:38px;color:#fff;font-weight:900;z-index:2}
    .visual-side .node.n2{width:118px;height:118px;top:34%;left:7%;border-radius:50%}
    .visual-side .node.n2:before{content:"↗";position:absolute;inset:22%;display:grid;place-items:center;border:2px solid rgba(255,255,255,.45);border-radius:50%;font-size:28px;color:#fff;font-weight:900;z-index:2}
    .visual-side .node.n3{width:220px;height:145px;bottom:8%;right:16%;border-radius:24px}
    .visual-side .node.n3:before{content:"ATTENDANCE";position:absolute;left:18px;right:18px;top:18px;padding:8px;border-bottom:1px solid rgba(255,255,255,.25);font-size:9px;letter-spacing:2px;color:#fff;z-index:2}
    .visual-side .node.n4{width:74px;height:74px;bottom:29%;left:24%;border-radius:50%}
    .glass{position:relative;z-index:3;background:rgba(255,255,255,.86)!important;box-shadow:0 26px 70px rgba(1,20,48,.25)!important;border-radius:22px!important;padding:30px!important}
    html[data-theme="dark"] .visual-side{background:linear-gradient(145deg,#020611,#062d58 48%,#075a73)!important}
    html[data-theme="dark"] .glass{background:rgba(14,20,30,.82)!important;box-shadow:0 26px 70px rgba(0,0,0,.4)!important}
    .brand-chip{border-radius:12px!important;background:rgba(255,255,255,.65)!important;padding:8px 12px!important}
  `;
  document.head.appendChild(style);
})();
const btn = document.getElementById('login-btn');
const errBox = document.getElementById('login-error');
const t = (key) => (window.IEMS_I18N ? window.IEMS_I18N.t(key) : key);

const loginBtnIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" aria-hidden="true"><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path></svg>';
const loginBtnSpinner = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';

function setLoginBtnState(loading) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `${loginBtnSpinner} <span>${t('login.submitting')}</span>`
    : `<span id="login-btn-label">${t('login.submit')}</span> ${loginBtnIcon}`;
}

async function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-pass').value;
  errBox.style.display = 'none';

  if (!id || !password) {
    errBox.textContent = t('login.errFields');
    errBox.style.display = 'block';
    return;
  }

  setLoginBtnState(true);

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {
      data = { error: raw || t('login.errFields') };
    }
    if (!res.ok) throw new Error(data.error || t('login.errFields'));

    sessionStorage.setItem('iems_token', data.token);
    sessionStorage.setItem('iems_user', JSON.stringify(data.user));
    sessionStorage.setItem('iems_show_welcome', '1'); // shown once, right after login, on the home page
    window.location.href = '/home.html';
  } catch (e) {
    errBox.textContent = e.message;
    errBox.style.display = 'block';
  } finally {
    setLoginBtnState(false);
  }
}

btn.addEventListener('click', doLogin);
document.getElementById('login-pass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

// if already logged in, skip straight to dashboard
if (sessionStorage.getItem('iems_token')) {
  window.location.href = '/home.html';
}

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const loginLogo = document.getElementById('login-logo');
const savedTheme = localStorage.getItem('iems-theme') || 'light';

function syncLoginTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (loginLogo) loginLogo.src = dark ? 'logo-dark.png' : 'logo.png';
  if (themeIcon) {
    themeIcon.innerHTML = dark
      ? '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2M12 19.5v2M4.58 4.58l1.42 1.42M18 18l1.42 1.42M2.5 12h2M19.5 12h2M4.58 19.42L6 18M18 6l1.42-1.42"/>'
      : '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/>';
  }
}

document.documentElement.setAttribute('data-theme', savedTheme);
syncLoginTheme();
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('iems-theme', next);
    syncLoginTheme();
  });
}

// Language toggle (AR/EN)
const langToggle = document.getElementById('lang-toggle');
if (langToggle && window.IEMS_I18N) {
  langToggle.addEventListener('click', () => {
    window.IEMS_I18N.toggle();
    setLoginBtnState(false);
  });
}

// Modern inline SVG eye icon — no external icon font dependency.
const passwordToggle = document.getElementById('password-toggle');
const passInput = document.getElementById('login-pass');
if (passwordToggle && passInput) {
  passwordToggle.addEventListener('click', () => {
    const hidden = passInput.type === 'password';
    passInput.type = hidden ? 'text' : 'password';
    passwordToggle.innerHTML = hidden
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path><path d="m2 2 20 20"></path></svg>';
    
    passwordToggle.setAttribute('aria-label', hidden ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  });
}
