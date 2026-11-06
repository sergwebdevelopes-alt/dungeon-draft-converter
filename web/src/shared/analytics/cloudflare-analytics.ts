const BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

interface AnalyticsConfig {
  cloudflareToken: string;
  hostname: string;
}

function isTracked(
  config: AnalyticsConfig | undefined,
  hostname: string,
): config is AnalyticsConfig {
  return config !== undefined && hostname === config.hostname;
}

function startAnalytics(
  config: AnalyticsConfig | undefined,
  hostname: string = window.location.hostname,
  page: Document = document,
): void {
  if (!isTracked(config, hostname)) {
    return;
  }

  const beacon = page.createElement('script');
  beacon.defer = true;
  beacon.src = BEACON_URL;
  beacon.dataset.cfBeacon = JSON.stringify({ token: config.cloudflareToken });
  page.head.append(beacon);
}

export { startAnalytics };
export type { AnalyticsConfig };
