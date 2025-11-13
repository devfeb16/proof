import dotenv from 'dotenv';

const DEFAULT_BASE_DOMAIN = 'app.loxo.co';

if (!process.env.LOXO_API_KEY || !process.env.LOXO_SLUG) {
  dotenv.config({ path: '.env.local' });
  dotenv.config();
}

function getLoxoConfig() {
  const apiKey =
    process.env.LOXO_API_KEY ||
    process.env.NEXT_PUBLIC_LOXO_API_KEY ||
    '';
  const slug =
    process.env.LOXO_SLUG ||
    process.env.NEXT_PUBLIC_LOXO_SLUG ||
    '';
  const domain =
    process.env.LOXO_DOMAIN ||
    process.env.NEXT_PUBLIC_LOXO_DOMAIN ||
    DEFAULT_BASE_DOMAIN;

  if (!apiKey) {
    throw new Error('Missing Loxo config: LOXO_API_KEY must be defined');
  }
  if (!slug) {
    throw new Error('Missing Loxo config: LOXO_SLUG must be defined');
  }

  return {
    apiKey,
    slug,
    domain,
  };
}

function buildUrl(path, params) {
  const { slug, domain } = getLoxoConfig();
  const baseURL = `https://${domain}/api/${slug}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, baseURL);

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.append(key, String(value));
    });
  }

  return url;
}

async function request(method, path, { params, data } = {}) {
  const { apiKey } = getLoxoConfig();
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await response.text();
  let json;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error(`Failed to parse Loxo response JSON for ${url.pathname}: ${err.message}`);
    }
  }

  if (!response.ok) {
    const message =
      (json && (json.message || json.error || json.detail)) ||
      `Loxo API request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json;
}

export const loxoClient = {
  get(path, options) {
    return request('GET', path, options);
  },
  post(path, options) {
    return request('POST', path, options);
  },
  put(path, options) {
    return request('PUT', path, options);
  },
  delete(path, options) {
    return request('DELETE', path, options);
  },
};

export default loxoClient;

