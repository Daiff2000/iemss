import LegacyPage from '../components/LegacyPage';
import bodyHtml from '../legacy-html/themes.body.html?raw';
import pageStyleCss from '../legacy-page-styles/themes.styles.css?raw';
export default function Themes(){return <LegacyPage bodyHtml={bodyHtml} pageStyleCss={pageStyleCss} scripts={['/legacy/app-themes.js','/legacy/app-shell.js']}/>;}
