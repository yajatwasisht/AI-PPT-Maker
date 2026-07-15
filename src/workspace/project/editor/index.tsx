import { useEffect, useRef, useState } from 'react'
import OutlineSection from '../../../components/custom/OutlineSection'
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fireBaseDb, streamGenerateContentResilient } from '../../../../config/FirebaseConfig';
import type { Outline, Project } from '../outline';
import SliderFrame from '../../../components/custom/SliderFrame';
import { Button } from '../../../components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { exportIframeSlidesToEditablePptx } from '../../../lib/exportEditablePptx';


const SLIDER_PROMPT = `Generate HTML (TailwindCSS + Flowbite UI + Lucide Icons) 
code for a 16:9 ppt slider in Modern Dark style.
{DESIGN_STYLE}. No responsive design; use a fixed 16:9 layout for slides.
Use Flowbite component structure. Use different layouts depending on content and style.
Use TailwindCSS colors like primary, accent, gradients, background, etc., and include colors from {COLORS_CODE}.
MetaData for Slider: {METADATA}, Generate Image if needed using:
'https://ik.imagekit.io/ikmedia/ik-genimg-prompt-{imagePrompt}/{altImageName}.jpg'
Replace {imagePrompt} with relevant image prompt and altImageName with a random image name.
Return only the HTML for a single <body>...</body> slide. Do not wrap in markdown fences.
`;

const MAX_SLIDES_TO_GENERATE = 30;

type SlideItem = { code: string };

/** Pull title + short outline text from slide HTML for the left panel. */
function extractOutlineFromHtml(html: string): Pick<Outline, 'slidePoint' | 'outline'> {
    const wrapped = /<body[\s>]/i.test(html) ? html : `<body>${html}</body>`;
    const parsed = new DOMParser().parseFromString(wrapped, 'text/html');
    const title =
        parsed.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ||
        parsed.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() ||
        parsed.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() ||
        '';

    const bits = Array.from(parsed.querySelectorAll('p, li, h2, h3, h4'))
        .map((el) => el.textContent?.replace(/\s+/g, ' ').trim())
        .filter((text): text is string => Boolean(text) && text !== title);

    const unique = [...new Set(bits)];
    const outlineText = unique.slice(0, 4).join(' ').slice(0, 320);

    return {
        slidePoint: (title || unique[0] || 'Untitled slide').slice(0, 160),
        outline: outlineText || title || 'Updated slide content',
    };
}

function Editor() {
    const { projectId } = useParams();
    const [projectDetail, setProjectDetail] = useState<Project>();
    const [loading, setLoading] = useState(false);
    const [sliders, setSliders] = useState<SlideItem[]>([]);
    const [generating, setGenerating] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const generationStartedRef = useRef(false);
    const slidersRef = useRef<SlideItem[]>([]);
    const outlineRef = useRef<Outline[]>([]);
    const containerRef = useRef<HTMLDivElement|null>(null);
    const [downloadLoading, setDownloadLoading] = useState(false);

    useEffect(() => {
        slidersRef.current = sliders;
    }, [sliders]);

    useEffect(() => {
        outlineRef.current = projectDetail?.outline ?? [];
    }, [projectDetail?.outline]);

    useEffect(() => {
        if (projectId) getProjectDetail();
    }, [projectId]);

    const getProjectDetail = async () => {
        setLoading(true);
        const docRef = doc(fireBaseDb, 'projects', projectId ?? '');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.log('No such document!');
            setLoading(false);
            return;
        }
        const data = docSnap.data() as Project;
        console.log(data);
        setProjectDetail(data);
        const expectedCount = Math.min(
            data.outline?.length ?? 0,
            MAX_SLIDES_TO_GENERATE
        );
        if (data.slides?.length && data.slides.length >= expectedCount) {
            setSliders(data.slides);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!projectDetail?.outline?.length) return;
        const expectedCount = Math.min(
            projectDetail.outline.length,
            MAX_SLIDES_TO_GENERATE
        );
        if ((projectDetail.slides?.length ?? 0) >= expectedCount) return;
        if (generationStartedRef.current) return;

        generationStartedRef.current = true;
        GenerateSlides();
    }, [projectDetail]);

    // Regenerate slides cleared by outline edits (empty code slots).
    useEffect(() => {
        if (
            !projectDetail?.outline?.length ||
            generating ||
            regeneratingIndex !== null ||
            loading
        ) {
            return;
        }

        const expectedCount = Math.min(
            projectDetail.outline.length,
            MAX_SLIDES_TO_GENERATE
        );
        if (sliders.length < expectedCount) return;

        const staleIndex = sliders.findIndex(
            (slide, index) =>
                index < expectedCount && !slide?.code?.trim()
        );
        if (staleIndex < 0) return;

        void regenerateSlideAtIndex(
            staleIndex,
            projectDetail.outline[staleIndex]
        );
    }, [sliders, projectDetail, generating, regeneratingIndex, loading]);

    const SaveAllSlides = async (slidesToSave: SlideItem[]) => {
        if (!projectId) {
            throw new Error('Missing projectId; cannot save slides');
        }
        if (!slidesToSave.length) {
            throw new Error('No slides to save');
        }

        const savedAt = Date.now();
        await setDoc(
            doc(fireBaseDb, 'projects', projectId),
            {
                slides: slidesToSave,
                isSlidesGenerated: savedAt,
            },
            { merge: true }
        );
        setProjectDetail((prev) =>
            prev
                ? { ...prev, slides: slidesToSave, isSlidesGenerated: savedAt }
                : prev
        );
        console.log('Slides saved to Firestore:', slidesToSave.length);
    };

    const buildSlidePrompt = (metaData: Outline) =>
        SLIDER_PROMPT
            .replace('{DESIGN_STYLE}', projectDetail?.designStyle?.designGuide ?? '')
            .replace('{COLORS_CODE}', JSON.stringify(projectDetail?.designStyle?.colors))
            .replace('{METADATA}', JSON.stringify(metaData));

    const GenerateSlides = async () => {
        if (!projectDetail?.outline?.length) return;

        const outlineSlice = projectDetail.outline.slice(0, MAX_SLIDES_TO_GENERATE);
        setGenerating(true);

        const initialSlides: SlideItem[] = outlineSlice.map(() => ({ code: '' }));
        setSliders(initialSlides);
        slidersRef.current = initialSlides;

        const generated: SlideItem[] = [...initialSlides];

        try {
            for (let index = 0; index < outlineSlice.length; index++) {
                const metaData = outlineSlice[index];
                console.log('Generating slide', index + 1);
                const code = await GeminiSlideCall(buildSlidePrompt(metaData), index);
                generated[index] = { code };
                console.log('Finished slide', index + 1);
            }

            setSliders(generated);
            slidersRef.current = generated;
            await SaveAllSlides(generated);
            console.log('All slides generated!');
        } catch (err) {
            console.error('Slide generation failed', err);
            generationStartedRef.current = false;
        } finally {
            setGenerating(false);
        }
    };

    const regenerateSlideAtIndex = async (index: number, metaData: Outline) => {
        if (!projectDetail) return;

        setRegeneratingIndex(index);
        setSliders((prev) => {
            const updated = [...prev];
            while (updated.length <= index) updated.push({ code: '' });
            updated[index] = { code: '' };
            slidersRef.current = updated;
            return updated;
        });

        try {
            const code = await GeminiSlideCall(buildSlidePrompt(metaData), index);
            const updated = [...slidersRef.current];
            updated[index] = { code };
            slidersRef.current = updated;
            setSliders(updated);
            await SaveAllSlides(updated);
        } catch (err) {
            console.error(`Failed to regenerate slide ${index + 1}`, err);
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const GeminiSlideCall = async (prompt: string, index: number): Promise<string> => {
        const { stream } = await streamGenerateContentResilient(prompt);
        let text = '';

        for await (const chunk of stream) {
            text += chunk.text();

            const finalText = text
                .replace(/```html/g, '')
                .replace(/```/g, '')
                .trim();

            setSliders((prev) => {
                const updated = [...prev];
                while (updated.length <= index) {
                    updated.push({ code: '' });
                }
                updated[index] = { code: finalText };
                slidersRef.current = updated;
                return updated;
            });
        }

        return text
            .replace(/```html/g, '')
            .replace(/```/g, '')
            .trim();
    };

    const updateSliderCode = (updateSlideCode: string, index: number) => {
        const updated = [...slidersRef.current];
        updated[index] = { ...updated[index], code: updateSlideCode };
        slidersRef.current = updated;
        setSliders(updated);
        void SaveAllSlides(updated);
        // Keep left-panel outline in sync with slide edits (no slide regeneration).
        void syncOutlineFromSlide(index, updateSlideCode);
    };

    const syncOutlineFromSlide = async (index: number, slideHtml: string) => {
        if (!projectId) return;
        const currentOutline = outlineRef.current;
        if (!currentOutline[index]) return;

        const extracted = extractOutlineFromHtml(slideHtml);
        const prev = currentOutline[index];
        if (
            prev.slidePoint === extracted.slidePoint &&
            prev.outline === extracted.outline
        ) {
            return;
        }

        const updatedOutline = currentOutline.map((item, i) =>
            i === index
                ? {
                      ...item,
                      slidePoint: extracted.slidePoint,
                      outline: extracted.outline,
                  }
                : item
        );
        outlineRef.current = updatedOutline;

        setProjectDetail((prevProject) =>
            prevProject ? { ...prevProject, outline: updatedOutline } : prevProject
        );

        await setDoc(
            doc(fireBaseDb, 'projects', projectId),
            { outline: updatedOutline },
            { merge: true }
        );
    };

    const handleUpdateOutline = async (slideNo: string, value: Outline) => {
        if (!projectId || !projectDetail?.outline) return;

        const slideIndex = projectDetail.outline.findIndex(
            (item) => item.slideNo === slideNo
        );
        const updatedOutline = projectDetail.outline.map((item) =>
            item.slideNo === slideNo ? { ...item, ...value } : item
        );
        const updatedMeta =
            slideIndex >= 0 ? updatedOutline[slideIndex] : value;

        outlineRef.current = updatedOutline;
        setProjectDetail((prev) =>
            prev ? { ...prev, outline: updatedOutline } : prev
        );

        await setDoc(
            doc(fireBaseDb, 'projects', projectId),
            { outline: updatedOutline },
            { merge: true }
        );

        // Keep the matching slide in sync with the new outline.
        if (slideIndex >= 0 && slidersRef.current.length > slideIndex) {
            await regenerateSlideAtIndex(slideIndex, updatedMeta);
        }
    };


    const exportAllIframesToPPT = async () => {
        if (!containerRef.current) return;

        setDownloadLoading(true);
        try {
            await exportIframeSlidesToEditablePptx(
                containerRef.current,
                'MyProjectSlides.pptx'
            );
        } catch (err) {
            console.error('PPT export failed', err);
            window.alert(
                err instanceof Error
                    ? `Export failed: ${err.message}`
                    : 'Export failed. Please try again.'
            );
        } finally {
            setDownloadLoading(false);
        }
    };


    return (
        <div className="grid grid-cols-5 gap-4 p-10 h-[calc(100vh-4rem)]">
            <div className="col-span-2 h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <OutlineSection
                    outline={projectDetail?.outline ?? []}
                    handleUpdateOutline={handleUpdateOutline}
                    loading={loading}
                />
            </div>
            <div className="col-span-3 h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" ref={containerRef}>
                {generating && (
                    <p className="mb-3 text-sm text-muted-foreground">
                        Generating slides… ({sliders.filter((s) => s.code).length}/{sliders.length})
                    </p>
                )}
                {regeneratingIndex !== null && !generating && (
                    <p className="mb-3 text-sm text-muted-foreground">
                        Updating slide {regeneratingIndex + 1} from outline…
                    </p>
                )}
                {sliders.map((slide, index) => (
                    <SliderFrame
                        key={index}
                        index={index}
                        slide={slide}
                        colors={projectDetail?.designStyle?.colors}
                        setUpdatedSlider={(updateSlideCode: string) => updateSliderCode(updateSlideCode, index)}
                    />
                ))}
                <div>
                    <Button onClick={exportAllIframesToPPT} disabled={downloadLoading} size='lg' className='fixed bottom-6 transform left-1/2 -translate-x-1/2'>
                       <FileDown/> {downloadLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Export PPT'}
                    </Button>
                </div>
            </div>
        </div>
        
    );
}

export default Editor
