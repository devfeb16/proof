// Lightweight CORS middleware for Next.js API routes
// Returns true if the request has been handled (e.g., OPTIONS), otherwise false
export function applyCors(req, res, options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    allowCredentials = true,
  } = options;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
  res.setHeader('Access-Control-Max-Age', '86400');
  if (allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}


