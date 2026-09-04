import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/reports.body.html?raw';
import pageStyleCss from '../legacy-page-styles/reports.styles.css?raw';

export default function Reports() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        '/legacy/i18n.js',
        '/legacy/app-admin-reports.js',
        '/legacy/app-reports-top5.js',
        '/legacy/app-shell.js',
      ]}
    />
  );
}
