/// <reference types="vite/client" />

declare module 'dom-to-pptx' {
  export function exportToPptx(
    target: HTMLElement | string | Array<HTMLElement | string>,
    options?: Record<string, unknown>
  ): Promise<void>;
}

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_FIREBASE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
