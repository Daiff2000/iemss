/* ==========================================================
   IEMS shared i18n (Arabic / English)
   - Persists choice in localStorage under 'iems-lang'
   - Applies to any element with data-i18n="key" (textContent),
     data-i18n-placeholder="key" (placeholder), or
     data-i18n-aria="key" (aria-label / title)
   - Also flips <html lang> / dir for the two supported languages
   ========================================================== */
window.IEMS_I18N = (() => {
  const DICT = {
    // Shared topbar / nav (present on every inner page)
    'nav.dashboard':      { ar: 'الرئيسية',            en: 'Home' },
    'nav.employees':      { ar: 'الموظفون',           en: 'Employees' },
    'nav.import':         { ar: 'تحديث البيانات',      en: 'Update Data' },
    'nav.manualEntry':    { ar: 'الإدخال اليدوي',      en: 'Manual Entry' },
    'nav.reports':        { ar: 'التقارير',            en: 'Reports' },
    'topbar.notifications':{ ar: 'الإشعارات',          en: 'Notifications' },
    'topbar.theme':       { ar: 'تبديل المظهر',        en: 'Toggle theme' },
    'topbar.lang':        { ar: 'English',            en: 'العربية' },
    'topbar.logout':      { ar: 'تسجيل الخروج',        en: 'Log out' },

    // Login page
    'login.welcomeBack':  { ar: 'أهلاً بعودتك',         en: 'Welcome back' },
    'login.title':        { ar: 'تسجيل الدخول إلى نظام Intercom IEMS', en: 'Sign in to Intercom IEMS' },
    'login.subtitle':     { ar: 'يرجى إدخال بيانات الدخول الخاصة بك للوصول إلى حسابك.', en: 'Please enter your credentials to access your account.' },
    'login.idLabel':      { ar: 'معرّف المستخدم',       en: 'User ID' },
    'login.idPlaceholder':{ ar: 'أدخل معرّف المستخدم',  en: 'Enter your user ID' },
    'login.passLabel':    { ar: 'كلمة المرور',          en: 'Password' },
    'login.passPlaceholder':{ ar: 'أدخل كلمة المرور',   en: 'Enter your password' },
    'login.forgot':       { ar: 'نسيت كلمة المرور؟',    en: 'Forgot your password?' },
    'login.submit':       { ar: 'تسجيل الدخول',         en: 'Log In' },
    'login.submitting':   { ar: 'جارٍ تسجيل الدخول...', en: 'Logging in...' },
    'login.terms':        { ar: 'بتسجيل الدخول فإنك توافق على', en: 'By logging in, you agree to our' },
    'login.termsLink':    { ar: 'شروط الخدمة',          en: 'Terms of Service' },
    'login.and':          { ar: 'و',                    en: 'and' },
    'login.privacyLink':  { ar: 'سياسة الخصوصية',       en: 'Privacy Policy' },
    'login.brandChip':    { ar: 'منصة الموظفين',      en: 'EMPLOYEE PLATFORM' },
    'login.eyebrow':      { ar: 'منصة الموظفين', en: 'EMPLOYEE PLATFORM' },
    'login.visualTitle':  { ar: 'كل بياناتك في مكان واحد', en: 'Everything You Need in One Place' },
    'login.visualBody':   { ar: 'تابع حضورك وانصرافك، راجع أداءك وأهدافك، واطّلع على بياناتك وتقاريرك بسهولة من خلال لوحة واحدة.', en: 'Track attendance, review performance and targets, and access your data and reports from one simple dashboard.' },
    'login.errFields':    { ar: 'يرجى إدخال معرّف المستخدم وكلمة المرور.', en: 'Please enter your user ID and password.' },
    'login.stat1Value':   { ar: 'بيانات الموظفين',       en: 'Employee Records' },
    'login.stat1Label':   { ar: 'تحديث لحظي',           en: 'Real-time updates' },
    'login.stat2Value':   { ar: 'الأداء والأهداف',       en: 'Performance & Targets' },
    'login.stat2Label':   { ar: 'تتبّع دقيق',            en: 'Accurate tracking' },
    'login.stat3Value':   { ar: 'تقارير جاهزة',          en: 'Ready-made Reports' },
    'login.stat3Label':   { ar: 'PDF و Excel',           en: 'PDF & Excel' },

    // Dashboard
    'dash.eyebrow':       { ar: 'إدارة الموارد البشرية',        en: 'EMPLOYEE MANAGEMENT' },
    'dash.title':         { ar: 'الرئيسية',  en: 'Home' },
    'dash.subtitle':      { ar: 'متابعة الحضور والأداء وأفضل الموظفين حسب المرحلة والفترة المحددة.', en: 'Track attendance, performance, and top performers by stage and selected period.' },
    'filters.title':      { ar: 'معايير التصفية',              en: 'Filters' },
    'filters.reset':      { ar: 'إعادة ضبط',            en: 'Reset' },
    'filters.from':       { ar: 'من تاريخ',             en: 'From date' },
    'filters.to':         { ar: 'إلى تاريخ',             en: 'To date' },
    'filters.stage':      { ar: 'المرحلة',               en: 'Stage' },
    'filters.shift':      { ar: 'الشيفت',               en: 'Shift' },
    'filters.allShifts':  { ar: 'جميع الشيفتات',         en: 'All shifts' },
    'filters.apply':      { ar: 'عرض النتائج',           en: 'Show results' },
    'absence.eyebrow':    { ar: 'تنبيه الحضور',          en: 'ATTENDANCE ALERT' },
    'absence.title':      { ar: 'الموظفون الغائبون بدون إذن', en: 'Employees Absent Without Leave' },
    'absence.col.employee':{ ar: 'الموظف',               en: 'Employee' },
    'absence.col.company': { ar: 'الشركة',               en: 'Company' },
    'absence.col.shift':   { ar: 'الشيفت',              en: 'Shift' },
    'absence.col.days':    { ar: 'عدد الأيام',            en: 'Days' },
    'perf.eyebrow':       { ar: 'ترتيب الأداء',           en: 'PERFORMANCE RANKING' },
    'perf.title':         { ar: 'أفضل 5 موظفين لكل مرحلة', en: 'Top 5 per Stage' },
    'perf.subtitle':      { ar: 'أعلى خمسة موظفين في كل مرحلة خلال الفترة المختارة.', en: 'Top five employees in each stage for the selected period.' },
    'emp.eyebrow':        { ar: 'الموظف',                en: 'EMPLOYEE' },
    'emp.title':          { ar: 'بيانات الموظف',         en: 'Employee Data' },
    'perfDetail.eyebrow':  { ar: 'الأداء',               en: 'PERFORMANCE' },
    'perfDetail.title':    { ar: 'تفاصيل الأهداف والأداء', en: 'Target & Performance Details' },
    'sup.eyebrow':         { ar: 'الإشراف',              en: 'SUPERVISION' },
    'sup.title':           { ar: 'تفاصيل أهداف الإشراف',  en: 'Supervision Target Details' },
    'detail.eyebrow':      { ar: 'التفاصيل اليومية',      en: 'DAILY DETAIL' },
    'detail.title':        { ar: 'التفاصيل اليومية',      en: 'Daily Detail' },
    'footer.legal':        { ar: 'Intercom IEMS · لوحة داخلية', en: 'Intercom IEMS · Internal Dashboard' },
  };

  function currentLang() { return localStorage.getItem('iems-lang') || 'ar'; }

  function t(key) {
    const lang = currentLang();
    return (DICT[key] && DICT[key][lang]) || (DICT[key] && DICT[key].ar) || key;
  }
  function apply(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const val = t(el.getAttribute('data-i18n-aria'));
      el.setAttribute('aria-label', val);
      el.setAttribute('title', val);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }
  function init() {
    apply(currentLang());
  }

  function toggle() {
    const next = currentLang() === 'ar' ? 'en' : 'ar';
    localStorage.setItem('iems-lang', next);
    apply(next);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { t, apply, toggle, currentLang };
})();
