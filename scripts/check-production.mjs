const DEFAULT_URL = 'https://vertere.musicatechlab.com/';
const CHECK_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const targetUrl = process.env.PRODUCTION_URL ?? DEFAULT_URL;
  console.log(`[healthcheck] target: ${targetUrl}`);

  let response;
  try {
    response = await fetchWithTimeout(targetUrl, CHECK_TIMEOUT_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch production URL: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Production URL returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const expectedMarkers = [
    'Vertere',
    '<div id="app"',
  ];

  for (const marker of expectedMarkers) {
    if (!html.includes(marker)) {
      throw new Error(`Response does not include expected marker: ${marker}`);
    }
  }

  console.log('[healthcheck] OK');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[healthcheck] FAILED: ${message}`);
  process.exitCode = 1;
});
