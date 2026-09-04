import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/admin-manual-entry.body.html?raw';
import pageStyleCss from '../legacy-page-styles/admin-manual-entry.styles.css?raw';

export default function AdminManualEntry() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[ '/legacy/i18n.js', '/legacy/app-admin-manual-entry.js', '/legacy/app-shell.js']}
    />
  );
}
