/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Render.com API base URL — set in Cloudflare Pages env vars */
  readonly VITE_API_BASE_URL?: string;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
