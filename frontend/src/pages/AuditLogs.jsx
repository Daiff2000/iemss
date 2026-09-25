import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/audit-logs.body.html?raw';
import pageStyleCss from '../legacy-page-styles/audit-logs.styles.css?raw';
export default function AuditLogs(){return <LegacyPage bodyHtml={bodyHtml} pageStyleCss={pageStyleCss} scripts={['/legacy/app-audit-logs.js','/legacy/app-shell.js']}/>;}
