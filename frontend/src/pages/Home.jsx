import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/home.body.html?raw';
import pageStyleCss from '../legacy-page-styles/home.styles.css?raw';

export default function Home() {
  return (
    <LegacyPage
      bodyHtml={bodyHtml}
      pageStyleCss={pageStyleCss}
      scripts={[
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        '/legacy/i18n.js',
        '/legacy/app-home.js',
        '/legacy/app-shell.js',
      ]}
    />
  );
}
