import { noop } from 'lodash';
import { createGtag } from 'vue-gtag';
import type { App } from 'vue';
import { config } from '@/config';

// Usercentrics consent management integration
declare global {
  interface Window {
    UC_UI?: {
      isInitialized: () => boolean;
      showFirstLayer: () => void;
      showSecondLayer: () => void;
      getServicesBaseInfo: () => any[];
      acceptService: (serviceId: string) => void;
      denyService: (serviceId: string) => void;
    };
    UC_UI_SUPPRESSED?: boolean;
  }
}

function createFakeGtagInstance() {
  return {
    gtag: noop,
  };
}

function waitForUsercentrics(): Promise<boolean> {
  return new Promise((resolve) => {
    // If Usercentrics is not available, proceed without consent management
    if (!window.UC_UI) {
      resolve(true);
      return;
    }

    // Check if Usercentrics is already initialized
    if (window.UC_UI.isInitialized()) {
      resolve(true);
      return;
    }

    // Wait for Usercentrics to initialize (max 10 seconds)
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds with 100ms intervals
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.UC_UI?.isInitialized()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('Usercentrics CMP initialization timeout, proceeding without consent management');
        resolve(true);
      }
    }, 100);
  });
}

export const gtag = {
  install: async (app: App) => {
    if (config.gtag.isTrackerEnabled && config.gtag.measurementId) {
      try {
        // Wait for Usercentrics consent management to initialize
        await waitForUsercentrics();
        
        // Initialize vue-gtag with real configuration
        const gtagPlugin = createGtag({
          tagId: config.gtag.measurementId,
          config: {
            send_page_view: true,
            debug_mode: true, // Enable debug mode to see data in GA4 DebugView
            ...(config.gtag.trackLocalhost ? {} : {}),
          },
        });
        
        app.use(gtagPlugin);
        
        // Provide the real gtag function
        app.provide('gtag', { gtag: (window as any).gtag || noop });
      } catch (error) {
        console.error('Error initializing Google Analytics:', error);
        app.provide('gtag', createFakeGtagInstance());
      }
    } else {
      // Provide fake gtag function when disabled
      app.provide('gtag', createFakeGtagInstance());
    }
  },
};
