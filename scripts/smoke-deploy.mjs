const services = [
  { name: 'api', env: 'SMOKE_API_URL', path: '/api/v1/health', defaultUrl: 'http://localhost:3010' },
  { name: 'traveler', env: 'SMOKE_TRAVELER_URL', path: '/api/health', defaultUrl: 'http://localhost:3001' },
  { name: 'agency', env: 'SMOKE_AGENCY_URL', path: '/api/health', defaultUrl: 'http://localhost:3002' },
  { name: 'admin', env: 'SMOKE_ADMIN_URL', path: '/api/health', defaultUrl: 'http://localhost:3003' },
  { name: 'landing', env: 'SMOKE_LANDING_URL', path: '/api/health' },
];

const normalizeUrl = (baseUrl, path) => `${String(baseUrl).replace(/\/$/, '')}${path}`;

const parseJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const run = async () => {
  const configuredServices = services
    .map((service) => ({ ...service, baseUrl: process.env[service.env] || service.defaultUrl }))
    .filter((service) => service.baseUrl);

  if (configuredServices.length === 0) {
    console.error('No smoke URLs were configured. Set at least one of SMOKE_API_URL, SMOKE_TRAVELER_URL, SMOKE_AGENCY_URL, SMOKE_ADMIN_URL, or SMOKE_LANDING_URL.');
    process.exit(1);
  }

  let hasFailure = false;

  for (const service of configuredServices) {
    const url = normalizeUrl(service.baseUrl, service.path);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    }).catch((error) => ({ ok: false, status: 0, error }));

    if (!response || !('ok' in response) || !response.ok) {
      hasFailure = true;
      console.error(`[smoke] ${service.name} failed: ${url}`);
      if (response && 'status' in response) {
        console.error(`[smoke] status=${response.status}`);
      }
      if (response && 'error' in response) {
        console.error(`[smoke] error=${response.error}`);
      }
      continue;
    }

    const body = await parseJson(response);
    const status = typeof body === 'object' && body !== null ? body.status : undefined;
    if (status !== 'ok') {
      hasFailure = true;
      console.error(`[smoke] ${service.name} responded without ok status at ${url}`);
      console.error(body);
      continue;
    }

    console.log(`[smoke] ${service.name} ok -> ${url}`);
  }

  if (hasFailure) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[smoke] unhandled error', error);
  process.exit(1);
});
