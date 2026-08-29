import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/admin-employees.body.html?raw';
import pageStyleCss from '../legacy-page-styles/admin-employees.styles.css?raw';

export default function AdminEmployees() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[ '/legacy/i18n.js', '/legacy/app-admin-employees.js', '/legacy/app-shell.js']}
    />
  );
}
