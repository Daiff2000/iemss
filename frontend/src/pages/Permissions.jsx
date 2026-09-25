import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/permissions.body.html?raw';
import pageStyleCss from '../legacy-page-styles/permissions.styles.css?raw';
export default function Permissions(){return <LegacyPage bodyHtml={bodyHtml} pageStyleCss={pageStyleCss} scripts={['/legacy/app-admin-permissions.js','/legacy/app-shell.js']}/>;}
