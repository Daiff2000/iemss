import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/admin-import.body.html?raw';
import pageStyleCss from '../legacy-page-styles/admin-import.styles.css?raw';

export default function AdminImport() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[ '/legacy/i18n.js', '/legacy/app-admin-import.js', '/legacy/app-shell.js']}
    />
  );
}
