import { useEffect } from 'react';

/**
 * Loads a list of legacy (vanilla JS) script files, in order, after the
 * component's JSX has mounted into the DOM - exactly like a classic
 * <script src="..."> at the bottom of <body> used to. This lets us reuse
 * the original page logic unchanged while the markup itself now lives in
 * React/JSX.
 *
 * IMPORTANT: each legacy page script declares its own top-level
 * `const token`, `const user`, `const $`, etc. Plain `<script src="...">`
 * tags run as classic scripts, whose top-level `const`/`let` bindings live
 * in the single global lexical scope of the page - and that binding is
 * NOT removed when the <script> element is removed from the DOM. So the
 * moment the user opened a second legacy page in the same session (client
 * -side route change, no full reload), its script tried to redeclare
 * `const token` (etc.) that a previous page's script had already declared,
 * threw `SyntaxError: Identifier 'token' has already been declared`, and
 * silently aborted before wiring anything up - which is what produced the
 * blank/white page after navigating around the app.
 *
 * Fix: fetch each script's source ourselves and run it wrapped in an IIFE
 * `(function(){ ... })()` instead of injecting a `<script src>` tag. That
 * gives each page's script its own function scope, so repeated
 * declarations of the same identifier across pages (or across re-mounts of
 * the same page) no longer collide, while still re-executing the script
 * fresh on every visit (unlike ES modules, which the browser would only
 * evaluate once per URL and then skip on subsequent visits).
 *
 * Scripts are removed again on unmount so navigating to another page
 * (client-side route change) doesn't leave old listeners/globals behind.
 */
const scriptTextCache = new Map();

async function fetchScriptText(src) {
  if (scriptTextCache.has(src)) return scriptTextCache.get(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  scriptTextCache.set(src, text);
  return text;
}

export default function useLegacyScripts(srcList, deps = []) {
  useEffect(() => {
    let cancelled = false;
    const tags = [];

    async function loadSequential() {
      for (const src of srcList) {
        if (cancelled) return;
        try {
          const code = await fetchScriptText(src);
          if (cancelled) return;
          const tag = document.createElement('script');
          // Wrapping in an IIFE isolates each script's top-level
          // const/let/var declarations to its own function scope instead
          // of leaking into the shared global scope.
          tag.textContent = `(function(){\n${code}\n})();\n//# sourceURL=${src}`;
          document.body.appendChild(tag);
          tags.push(tag);
        } catch (err) {
          console.warn('[IEMS] Failed to load legacy script:', src, err);
        }
      }
    }

    loadSequential();

    return () => {
      cancelled = true;
      tags.forEach((t) => t.remove());

      // Several legacy page scripts append their own <style> block to <head>
      // (the login page's !important colour overrides, the home page's card
      // styling, the post-login splash). React only owns the <style> rendered
      // inside LegacyPage, so those head-level sheets used to survive every
      // route change and stack on top of the next page — which is what made
      // colours from one screen show up on another. Anything tagged
      // data-iems-page-style belongs to the page that just unmounted.
      document
        .querySelectorAll('head style[data-iems-page-style]')
        .forEach((el) => el.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
