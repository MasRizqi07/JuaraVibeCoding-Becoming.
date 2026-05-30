import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useBecomingStore } from '../../store/useBecomingStore';

export function OnboardingTour() {
  const { activeView } = useBecomingStore();

  useEffect(() => {
    // Only show tour on the results page overview tab, once per user
    if (activeView !== 'overview') return;
    
    const hasSeenTour = localStorage.getItem('becoming_has_seen_tour');
    if (hasSeenTour) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      steps: [
        {
          element: '#overview-radar',
          popover: {
            title: 'Your Identity Map',
            description: 'This radar chart visualizes the core dimensions of your potential based on your deepest reflections.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tab-split',
          popover: {
            title: 'The Future Split',
            description: 'A sobering contrast between two projected futures: what happens if you stagnate vs. if you fulfill your potential.',
            side: 'bottom'
          }
        },
        {
          element: '#tab-plan',
          popover: {
            title: 'Execution Plan',
            description: 'Concrete, actionable habits and roadmaps specifically tailored to your psychological archetype.',
            side: 'bottom'
          }
        },
        {
          element: '#tab-share',
          popover: {
            title: 'Your Share Card',
            description: 'Generate a stunning Identity Card with an AI-crafted tagline to share with others.',
            side: 'bottom'
          }
        },
        {
          element: '#feedback-btn',
          popover: {
            title: 'Send Feedback',
            description: 'Found a bug or have a suggestion? Let us know here.',
            side: 'bottom'
          }
        }
      ],
      onDestroyed: () => {
        localStorage.setItem('becoming_has_seen_tour', 'true');
      }
    });

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeView]);

  return null;
}
