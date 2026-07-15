import { useEffect, useRef, useState } from 'react';
import FloatingActionTool from './FloatingActionTool';
import { generateContentResilient } from './../../../config/FirebaseConfig';

/** Design canvas — scaled to fit the preview column while keeping 16:9. */
const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function serializeBody(doc: Document | null | undefined): string | null {
    const body = doc?.body;
    if (!body) return null;
    const attrs = body
        .getAttributeNames()
        .map((name) => {
            const value = body.getAttribute(name);
            return value != null ? ` ${name}="${value}"` : ` ${name}`;
        })
        .join('');
    return `<body${attrs}>${body.innerHTML}</body>`;
}

const HTML_DEFAULT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1.0">
  <title>Slide Preview</title>

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {colorCodes},
          backgroundImage: {
            gradient: 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)',
          },
        },
      },
    };
  </script>

  <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: ${SLIDE_WIDTH}px;
      height: ${SLIDE_HEIGHT}px;
      overflow: hidden;
      background: #111114;
    }
    body > .slide-container,
    body > div:first-of-type {
      width: ${SLIDE_WIDTH}px !important;
      height: ${SLIDE_HEIGHT}px !important;
      max-width: none !important;
      box-sizing: border-box;
      overflow: hidden;
    }
    img {
      max-width: 100%;
      height: auto;
      object-fit: cover;
    }
  </style>
</head>
{code}
<script>
  try { if (window.lucide) lucide.createIcons(); } catch (e) {}
</script>
</html>
`;

type props = {
    slide: { code: string };
    colors: any;
    index?: number;
    setUpdatedSlider: any;
};

function SliderFrame({ slide, colors, index = 0, setUpdatedSlider }: props) {
    const FINAL_CODE = HTML_DEFAULT
        .replace('{colorCodes}', JSON.stringify(colors ?? {}))
        .replace('{code}', slide?.code || '<body></body>');

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);
    const scaleRef = useRef(1);
    const selectedElRef = useRef<HTMLElement | null>(null);
    const isEmpty = !slide?.code?.trim();

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const updateScale = () => {
            const width = stage.clientWidth;
            if (width > 0) {
                const next = width / SLIDE_WIDTH;
                scaleRef.current = next;
                setScale(next);
            }
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(stage);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!iframeRef.current || isEmpty) return;
        let doc = iframeRef.current.contentDocument;
        if (!doc) return;

        // Skip rewrite when parent echo'd our own persist — keeps editing session alive.
        const alreadyInSync = serializeBody(doc) === slide?.code;
        if (!alreadyInSync) {
            doc.open();
            doc.write(FINAL_CODE);
            doc.close();
            doc = iframeRef.current.contentDocument;
            if (!doc) return;
            selectedElRef.current = null;
            setCardPosition(null);
        }

        let hoverEl: HTMLElement | null = null;
        let selectedEl: HTMLElement | null = selectedElRef.current;

        const persistSlide = () => {
            const code = serializeBody(iframeRef.current?.contentDocument);
            if (code) setUpdatedSlider(code);
        };

        const clearSelectionChrome = (el: HTMLElement | null) => {
            if (!el) return;
            el.style.outline = '';
            el.removeAttribute('contenteditable');
            el.removeEventListener('blur', handleBlur);
        };

        const handleBlur = () => {
            // Persist typed edits; do not clear selection (AI toolbar focus also blurs).
            persistSlide();
        };

        const handleMouseOver = (e: MouseEvent) => {
            if (selectedEl) return;
            const target = e.target as HTMLElement;
            if (hoverEl && hoverEl !== target) hoverEl.style.outline = '';
            hoverEl = target;
            hoverEl.style.outline = '2px dotted #3b82f6';
        };

        const handleMouseOut = () => {
            if (selectedEl) return;
            if (hoverEl) {
                hoverEl.style.outline = '';
                hoverEl = null;
            }
        };

        const handleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const iframe = iframeRef.current;
            if (!iframe) return;

            if (selectedEl && selectedEl !== target) {
                persistSlide();
                clearSelectionChrome(selectedEl);
            }

            selectedEl = target;
            selectedElRef.current = target;
            selectedEl.style.outline = '2px solid #3b82f6';
            selectedEl.setAttribute('contenteditable', 'true');
            selectedEl.addEventListener('blur', handleBlur);
            selectedEl.focus();

            const s = scaleRef.current;
            const iframeRect = iframe.getBoundingClientRect();
            setCardPosition({
                x: iframeRect.left + e.clientX * s,
                y: iframeRect.top + e.clientY * s,
            });
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedEl) {
                persistSlide();
                clearSelectionChrome(selectedEl);
                selectedEl = null;
                selectedElRef.current = null;
                setCardPosition(null);
            }
        };

        const attachListeners = () => {
            doc?.body?.addEventListener('mouseover', handleMouseOver);
            doc?.body?.addEventListener('mouseout', handleMouseOut);
            doc?.body?.addEventListener('click', handleClick);
            doc?.body?.addEventListener('keydown', handleKeyDown);
        };

        if (doc.readyState === 'complete' || doc.body) {
            attachListeners();
        } else {
            doc.addEventListener('DOMContentLoaded', attachListeners);
        }

        return () => {
            doc?.body?.removeEventListener('mouseover', handleMouseOver);
            doc?.body?.removeEventListener('mouseout', handleMouseOut);
            doc?.body?.removeEventListener('click', handleClick);
            doc?.body?.removeEventListener('keydown', handleKeyDown);
            if (selectedEl) selectedEl.removeEventListener('blur', handleBlur);
        };
    }, [slide?.code, isEmpty]);

    const handleAiSectionChange = async (userAiPrompt: string) => {
        const selectedEl = selectedElRef.current;
        const iframe = iframeRef.current;

        if (!selectedEl || !iframe) return;

        setLoading(true);
        const oldHTML = selectedEl.outerHTML;

        const prompt = `
  Regenerate or rewrite the following HTML code based on this user instruction.
  If user asked to change the image/regenerate the image then make sure to use
  ImageKit:
'https://ik.imagekit.io/ikmedia/ik-genimg-prompt-{imagePrompt}/{altImageName}.jpg'
Replace {imagePrompt} with relevant image prompt and altImageName with a random image name.
if user want to crop image, or remove background or scale image or optimze image then add image kit ai transformation 
by providing ?tr=fo-auto,<other transformation> etc.  
  "User Instruction is :${userAiPrompt}"
  HTML code:
  ${oldHTML}
  `;

        try {
            const result = await generateContentResilient(prompt);
            const newHTML = result.response
                .text()
                .replace(/```html/g, '')
                .replace(/```/g, '')
                .trim();

            const tempDiv = iframe.contentDocument?.createElement('div');
            if (tempDiv) {
                tempDiv.innerHTML = newHTML;
                const newNode = tempDiv.firstElementChild;

                if (newNode && selectedEl.parentNode) {
                    selectedEl.parentNode.replaceChild(newNode, selectedEl);
                    selectedElRef.current = newNode as HTMLElement;
                    const code = serializeBody(iframe.contentDocument);
                    if (code) setUpdatedSlider(code);
                }
            }
        } catch (err) {
            console.error('AI generation failed:', err);
            const message =
                err instanceof Error ? err.message : 'AI request failed';
            window.alert(
                /quota|429|Too Many Requests/i.test(message)
                    ? 'AI quota exceeded for the free tier. Please wait a minute and try again, or upgrade billing in Google AI Studio / Firebase.'
                    : `AI edit failed: ${message}`
            );
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="mb-8 w-full">
            <div className="mb-2 flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase">
                    Slide {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[11px] text-neutral-400">16:9</span>
            </div>

            <div
                ref={stageRef}
                className="relative w-full overflow-hidden rounded-xl bg-[#1a1a1f] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
                style={{ aspectRatio: '16 / 9' }}
            >
                {isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
                        <p className="text-sm text-neutral-500">Generating slide…</p>
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        title={`Slide ${index + 1}`}
                        className="pointer-events-auto absolute top-0 left-0 origin-top-left border-0 bg-white"
                        style={{
                            width: SLIDE_WIDTH,
                            height: SLIDE_HEIGHT,
                            transform: `scale(${scale})`,
                        }}
                        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                    />
                )}
            </div>

            {/* fixed positioning — must live outside overflow-hidden stage */}
            {cardPosition && <FloatingActionTool
                position={cardPosition}
                onClose={() => setCardPosition(null)}
                loading={loading}
                handleAiChange={(value: string) => handleAiSectionChange(value)} />}
        </div>
    );
}

export default SliderFrame;
