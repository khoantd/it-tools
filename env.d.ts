/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

interface ImportMetaEnv {
  VITE_PLAUSIBLE_API_HOST: string;
  VITE_PLAUSIBLE_DOMAIN: string;
  VITE_GTAG_ENABLED: string;
  VITE_GTAG_MEASUREMENT_ID: string;
  VITE_USERCENTRICS_ENABLED: string;
  VITE_USERCENTRICS_SETTINGS_ID: string;
  PACKAGE_VERSION: string;
  GIT_SHORT_SHA: string;
  PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
