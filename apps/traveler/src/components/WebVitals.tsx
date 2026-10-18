'use client';

import { useEffect } from 'react';

type VitalMetric = {
  name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

// Web Vitals thresholds per https://web.dev/vitals/
function rate(name: VitalMetric['name'], value: number): VitalMetric['rating'] {
  const thresholds: Record<VitalMetric['name'], [number, number]> = {
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function report(metric: VitalMetric) {
  // Foundation: log locally. A future change can POST this to an analytics
  // endpoint (e.g. /api/metrics) once the backend collection pipeline exists.
  if (process.env.NODE_ENV === 'development') {
    console.info('[web-vitals]', metric.name, Math.round(metric.value * 100) / 100, metric.rating);
  }
}

/**
 * Observes Core Web Vitals (LCP, CLS, INP) plus FCP/TTFB via PerformanceObserver
 * and reports them. Renders nothing. Mounted once in the root layout.
 */
export function WebVitals() {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const observers: PerformanceObserver[] = [];
    let lcpValue = 0;
    let clsValue = 0;
    let inpValue = 0;

    try {
      // LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
        lcpValue = last.renderTime ?? last.loadTime ?? last.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);

      // FCP
      const fcpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            report({ name: 'FCP', value: entry.startTime, rating: rate('FCP', entry.startTime) });
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      observers.push(fcpObserver);

      // CLS (session-based accumulation)
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value ?? 0;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);

      // INP
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as Array<PerformanceEntry & { duration?: number; interactionId?: number }>) {
          const duration = entry.duration ?? 0;
          if (duration > inpValue) inpValue = duration;
        }
      });
      // @ts-expect-error event type may not exist in older lib.dom versions
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      observers.push(inpObserver);
    } catch {
      // One observer type unsupported; the rest still report
    }

    // TTFB from navigation timing
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      report({ name: 'TTFB', value: ttfb, rating: rate('TTFB', ttfb) });
    }

    // Report LCP/CLS/INP when the page is hidden (final values)
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      if (lcpValue > 0) report({ name: 'LCP', value: lcpValue, rating: rate('LCP', lcpValue) });
      if (clsValue > 0) report({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) });
      if (inpValue > 0) report({ name: 'INP', value: inpValue, rating: rate('INP', inpValue) });
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return null;
}
