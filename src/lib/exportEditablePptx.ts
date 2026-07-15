import { exportToPptx } from 'dom-to-pptx';

/** Local copies of Flowbite demo assets (S3 blocks CORS). */
const FLOWBITE_LOCAL_ASSETS: Record<string, string> = {
  'hero-pattern.svg': 'flowbite-patterns/hero-pattern.svg',
  'hero-pattern-dark.svg': 'flowbite-patterns/hero-pattern-dark.svg',
  'conference.jpg': 'flowbite-patterns/conference.jpg',
};

function toAbsoluteAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL || '/';
  return new URL(path.replace(/^\//, ''), window.location.origin + base).href;
}

function rewriteFlowbiteUrl(url: string): string | null {
  try {
    const file = decodeURIComponent(url).split('/').pop()?.split('?')[0];
    if (!file || !FLOWBITE_LOCAL_ASSETS[file]) return null;
    return toAbsoluteAssetUrl(FLOWBITE_LOCAL_ASSETS[file]);
  } catch {
    return null;
  }
}

function rewriteCssUrlValue(cssValue: string): string {
  return cssValue.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, rawUrl) => {
    const local = rewriteFlowbiteUrl(rawUrl.trim());
    return local ? `url(${quote}${local}${quote})` : match;
  });
}

async function preloadImage(url: string) {
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Remap CORS-blocked Flowbite S3 assets → same-origin copies so export embeds them.
 */
async function remapFlowbiteAssets(root: HTMLElement): Promise<Array<() => void>> {
  const restoreFns: Array<() => void> = [];
  const preload = new Set<string>();
  const flowbiteHost = /flowbite\.s3\.amazonaws\.com/i;

  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    const computedBg = getComputedStyle(el).backgroundImage;
    if (computedBg && computedBg !== 'none' && flowbiteHost.test(computedBg)) {
      const rewritten = rewriteCssUrlValue(computedBg);
      if (rewritten === computedBg) return;
      const prev = el.style.getPropertyValue('background-image');
      const prevPriority = el.style.getPropertyPriority('background-image');
      el.style.setProperty('background-image', rewritten, 'important');
      rewritten.replace(/url\((['"]?)([^'")]+)\1\)/g, (_, __, u) => {
        preload.add(u.trim());
        return '';
      });
      restoreFns.push(() => {
        if (prev) el.style.setProperty('background-image', prev, prevPriority);
        else el.style.removeProperty('background-image');
      });
    }
  });

  root.querySelectorAll('img').forEach((img) => {
    if (!flowbiteHost.test(img.src)) return;
    const local = rewriteFlowbiteUrl(img.src);
    if (!local) return;
    const prevSrc = img.src;
    img.src = local;
    preload.add(local);
    restoreFns.push(() => {
      img.src = prevSrc;
    });
  });

  await Promise.all([...preload].map(preloadImage));
  return restoreFns;
}

function clearEditingChrome(doc: Document) {
  doc.querySelectorAll('[contenteditable]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute('contenteditable');
    if (htmlEl.style.outline) htmlEl.style.outline = '';
  });
}

/**
 * Collect slide roots from preview iframes and export as editable PPTX
 * (native shapes / text — not a flattened screenshot).
 */
export async function exportIframeSlidesToEditablePptx(
  container: HTMLElement,
  fileName = 'MyProjectSlides.pptx'
) {
  const iframes = Array.from(container.querySelectorAll('iframe'));
  const slideRoots: HTMLElement[] = [];
  const restoreFns: Array<() => void> = [];

  for (const iframe of iframes) {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc?.body) continue;

    clearEditingChrome(doc);

    const root = (doc.querySelector('body > div') || doc.body) as HTMLElement;
    // Ensure design canvas size so scaling into 16:9 PPT is correct.
    const prevWidth = root.style.width;
    const prevHeight = root.style.height;
    const prevMinWidth = root.style.minWidth;
    const prevMinHeight = root.style.minHeight;
    root.style.width = '1280px';
    root.style.height = '720px';
    root.style.minWidth = '1280px';
    root.style.minHeight = '720px';
    restoreFns.push(() => {
      root.style.width = prevWidth;
      root.style.height = prevHeight;
      root.style.minWidth = prevMinWidth;
      root.style.minHeight = prevMinHeight;
    });

    restoreFns.push(...(await remapFlowbiteAssets(root)));
    slideRoots.push(root);
  }

  if (!slideRoots.length) {
    throw new Error('No slides found to export');
  }

  try {
    await exportToPptx(slideRoots, {
      fileName,
      width: 10,
      height: 5.625,
      // Avoid trying to fetch cross-origin font files during export.
      autoEmbedFonts: false,
      svgAsVector: true,
    });
  } finally {
    restoreFns.forEach((restore) => restore());
  }
}
