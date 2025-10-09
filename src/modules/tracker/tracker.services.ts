import _ from 'lodash';
import type Plausible from 'plausible-tracker';
import { inject } from 'vue';

export { createTrackerService, useTracker };

function createTrackerService({ 
  plausible, 
  gtag 
}: { 
  plausible: ReturnType<typeof Plausible>
  gtag: { gtag: (...args: any[]) => void }
}) {
  return {
    trackEvent({ eventName }: { eventName: string }) {
      // Track with Plausible
      plausible.trackEvent(eventName);
      
      // Track with Google Analytics
      gtag.gtag('event', eventName, {
        event_category: 'engagement',
        event_label: eventName,
      });
    },
  };
}

function useTracker() {
  const plausible: ReturnType<typeof Plausible> | undefined = inject('plausible');
  const gtag: { gtag: (...args: any[]) => void } | undefined = inject('gtag');

  if (_.isNil(plausible)) {
    throw new TypeError('Plausible must be instantiated');
  }

  if (_.isNil(gtag)) {
    throw new TypeError('Gtag must be instantiated');
  }

  const tracker = createTrackerService({ plausible, gtag });

  return {
    tracker,
  };
}
