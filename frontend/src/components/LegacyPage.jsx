import useLegacyScripts from '../lib/useLegacyScripts';

/**
 * Renders a converted legacy page: identical original markup (via
 * dangerouslySetInnerHTML, so the visual result is pixel-for-pixel the
 * same as the old static HTML file) plus that page's original inline
 * <style> block, then boots the original page scripts unchanged.
 *
 * bodyHtml / pageStyleCss are imported with the Vite `?raw` suffix so they
 * are the exact original file contents.
 */
export default function LegacyPage({ bodyHtml, pageStyleCss, scripts, bodyClassName }) {
  useLegacyScripts(scripts, [bodyHtml]);

  return (
    <>
      {pageStyleCss && pageStyleCss.trim() && (
        <style dangerouslySetInnerHTML={{ __html: pageStyleCss }} />
      )}
      <div
        className={bodyClassName || undefined}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </>
  );
}
