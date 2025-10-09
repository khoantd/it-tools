import { figue } from 'figue';

export const config = figue({
  app: {
    version: {
      doc: 'Application current version',
      format: 'string',
      default: '0.0.0',
      env: 'PACKAGE_VERSION',
    },
    lastCommitSha: {
      doc: 'Application last commit SHA version',
      format: 'string',
      default: '',
      env: 'VITE_VERCEL_GIT_COMMIT_SHA',
    },
    baseUrl: {
      doc: 'Application base url',
      format: 'string',
      default: '/',
      env: 'BASE_URL',
    },
    env: {
      doc: 'Application current env',
      format: 'enum',
      values: ['production', 'development', 'preview', 'test'],
      default: 'development',
      env: 'VITE_VERCEL_ENV',
    },
  },
  plausible: {
    isTrackerEnabled: {
      doc: 'Is the tracker enabled',
      format: 'boolean',
      default: false,
      env: 'VITE_TRACKER_ENABLED',
    },
    domain: {
      doc: 'Plausible current domain',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_DOMAIN',
    },
    apiHost: {
      doc: 'Plausible remote api host',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_API_HOST',
    },
    trackLocalhost: {
      doc: 'Enable or disable localhost tracking by plausible',
      format: 'boolean',
      default: false,
    },
  },
  gtag: {
    isTrackerEnabled: {
      doc: 'Is Google Analytics tracker enabled',
      format: 'boolean',
      default: false,
      env: 'VITE_GTAG_ENABLED',
    },
    measurementId: {
      doc: 'Google Analytics measurement ID',
      format: 'string',
      default: '',
      env: 'VITE_GTAG_MEASUREMENT_ID',
    },
    trackLocalhost: {
      doc: 'Enable or disable localhost tracking by Google Analytics',
      format: 'boolean',
      default: false,
    },
  },
  usercentrics: {
    isEnabled: {
      doc: 'Is Usercentrics CMP enabled',
      format: 'boolean',
      default: true,
      env: 'VITE_USERCENTRICS_ENABLED',
    },
    settingsId: {
      doc: 'Usercentrics settings ID',
      format: 'string',
      default: 'ed_jz6KAMS3U2X',
      env: 'VITE_USERCENTRICS_SETTINGS_ID',
    },
  },
  showBanner: {
    doc: 'Show the banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_BANNER',
  },
  showSponsorBanner: {
    doc: 'Show the sponsor banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_SPONSOR_BANNER',
  },
})
  .loadEnv({
    ...import.meta.env,
    // Because the string 'import.meta.env.PACKAGE_VERSION' is statically replaced during build time (see 'define' in vite.config.ts)
    PACKAGE_VERSION: import.meta.env.PACKAGE_VERSION,
  })
  .validate()
  .getConfig();
