/// <reference types="vite/client" />

// Типізовані змінні середовища Vite (префікс VITE_ потрапляє в бандл)
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
