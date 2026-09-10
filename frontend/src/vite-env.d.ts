/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the Stacked backend. Defaults to "/api" (see vite.config.ts proxy). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
