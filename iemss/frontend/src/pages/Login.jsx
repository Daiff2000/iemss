import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/index.body.html?raw';
import pageStyleCss from '../legacy-page-styles/index.styles.css?raw';

// IMPORTANT: this page's markup/CSS/behavior is intentionally left 100%
// unchanged (same idea requested: "متجيش ناحيه اللوجن متغيرش شكلها").
// We only wrap the original login page in a React route.
export default function Login() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[ '/legacy/i18n.js', '/legacy/app-login.js']}
    />
  );
}
