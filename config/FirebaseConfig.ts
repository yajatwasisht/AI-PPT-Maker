import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from "firebase/ai";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "ppt-maker-83bf1.firebaseapp.com",
  projectId: "ppt-maker-83bf1",
  storageBucket: "ppt-maker-83bf1.firebasestorage.app",
  messagingSenderId: "478465407118",
  appId: "1:478465407118:web:ed4593d0407a21ad1971df",
  measurementId: "G-LBPEG51WYM",
};

const app = initializeApp(firebaseConfig);

export const fireBaseDb = getFirestore(app);

// App Check is required for Firebase AI Logic.
// Local: set VITE_APPCHECK_DEBUG_TOKEN to a UUID registered in
// Firebase Console → App Check → your web app → Manage debug tokens.
// Production: set VITE_RECAPTCHA_SITE_KEY to a real reCAPTCHA v3 site key.
declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as
  | string
  | undefined;
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as
  | string
  | undefined;

if (import.meta.env.DEV && isLocalhost) {
  // Prefer a registered debug token. `true` generates a new UUID that
  // must be registered in the Firebase console before exchangeDebugToken works.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(
    // Placeholder is fine in debug mode; production needs a real site key.
    recaptchaSiteKey || "unused-in-local-debug-mode"
  ),
  isTokenAutoRefreshEnabled: true,
});

const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});

/** Preferred model, then quieter fallback when Flash is capacity/quota-limited. */
const MODEL_CANDIDATES = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
] as const;

export const GeminiAiModel = getGenerativeModel(ai, {
  model: MODEL_CANDIDATES[0],
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error);

const isTransientAiError = (error: unknown): boolean =>
  /high demand|try again later|429|500|503|resource.?exhausted|unavailable|overloaded|quota|too many requests/i.test(
    errorMessage(error)
  );

/** Daily/model quota hit — skip remaining retries on this model and try the next. */
const isModelQuotaError = (error: unknown): boolean =>
  /quota exceeded|free_tier|GenerateRequestsPerDayPerProjectPerModel|exceeded your current quota/i.test(
    errorMessage(error)
  );

/** Prefer server RetryInfo delay when present (e.g. "Please retry in 25.6s"). */
const getRetryDelayMs = (error: unknown, attempt: number): number => {
  const match = errorMessage(error).match(/retry in\s+([\d.]+)\s*s/i);
  if (match) {
    // Cap wait so UX stays responsive; still honors most of the suggested delay.
    return Math.min(Math.ceil(parseFloat(match[1]) * 1000), 30_000);
  }
  return 1000 * 2 ** attempt;
};

async function withModelFallback<T>(
  run: (model: ReturnType<typeof getGenerativeModel>) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (const modelName of MODEL_CANDIDATES) {
    const model = getGenerativeModel(ai, { model: modelName });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await run(model);
      } catch (error) {
        lastError = error;
        if (!isTransientAiError(error)) {
          throw error;
        }
        // Model-specific daily quota → jump to next candidate instead of waiting out retries.
        if (isModelQuotaError(error)) {
          console.warn(
            `[AI] Quota hit on ${modelName}, falling back to next model…`
          );
          break;
        }
        await sleep(getRetryDelayMs(error, attempt));
      }
    }
  }

  throw lastError;
}

/** generateContent with retries + model fallback for capacity/quota spikes. */
export const generateContentResilient = (prompt: string) =>
  withModelFallback((model) => model.generateContent(prompt));

/** Streaming variant used for long slide HTML generation. */
export const streamGenerateContentResilient = (prompt: string) =>
  withModelFallback((model) => model.generateContentStream(prompt));

export default app;
