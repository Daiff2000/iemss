import { useEffect } from 'react';

/**
 * Loads a list of legacy (vanilla JS) script files, in order, after the
 * component's JSX has mounted into the DOM - exactly like a classic
 * <script src="..."> at the bottom of <body> used to. This lets us reuse
 * the original page logic unchanged while the markup itself now lives in
 * React/JSX.
 *
 * Scripts are removed again on unmount so navigating to another page
 * (client-side route change) doesn't leave old listeners/globals behind.
 */
export default function useLegacyScripts(srcList, deps = []) {
  useEffect(() => {
    let cancelled = false;
    const tags = [];

    async function loadSequential() {
      for (const src of srcList) {
        if (cancelled) return;
        await new Promise((resolve, reject) => {
          const tag = document.createElement('script');
          tag.src = src;
          tag.async = false;
          tag.onload = resolve;
          tag.onerror = () => { console.warn('[IEMS] Failed to load legacy script:', src); resolve(); };
          document.body.appendChild(tag);
          tags.push(tag);
        });
      }
    }

    loadSequential();

    return () => {
      cancelled = true;
      tags.forEach((t) => t.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
