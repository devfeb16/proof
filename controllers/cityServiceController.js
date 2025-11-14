/**
 * City + Service Routing Controller
 * Handles dynamic city and service URL routing logic
 * Week 1 Task: Dynamic endpoint creation for location-based routing
 */

/**
 * Parse and validate city + service route parameters
 * @param {Object} params - Route parameters from Next.js
 * @returns {Object} Parsed and validated route data
 */
export function parseCityServiceRoute(params) {
  const { province, city, service, subservice } = params;

  // Normalize inputs
  const normalizedProvince = province ? String(province).toLowerCase().trim() : null;
  const normalizedCity = city ? String(city).toLowerCase().trim() : null;
  const normalizedService = service ? String(service).toLowerCase().trim() : null;
  // Handle subservice - can be array (from catch-all route) or string/null
  let normalizedSubservice = null;
  if (subservice) {
    if (Array.isArray(subservice)) {
      // Filter out empty strings and join
      const filtered = subservice.filter(s => s && s.trim());
      normalizedSubservice = filtered.length > 0 
        ? filtered.join('/').toLowerCase().trim()
        : null;
    } else {
      normalizedSubservice = String(subservice).toLowerCase().trim() || null;
    }
  }

  // Validate required fields
  const errors = [];
  if (!normalizedProvince) errors.push('Province is required');
  if (!normalizedCity) errors.push('City is required');
  if (!normalizedService) errors.push('Service is required');

  return {
    province: normalizedProvince,
    city: normalizedCity,
    service: normalizedService,
    subservice: normalizedSubservice,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Build SEO-friendly metadata for city + service pages
 * @param {Object} routeData - Parsed route data
 * @returns {Object} SEO metadata
 */
export function buildCityServiceMetadata(routeData) {
  const { province, city, service, subservice } = routeData;

  // Format display names (capitalize first letter of each word)
  const formatDisplayName = (str) => {
    if (!str) return '';
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const cityDisplay = formatDisplayName(city);
  const serviceDisplay = formatDisplayName(service);
  const subserviceDisplay = subservice ? formatDisplayName(subservice) : '';
  const provinceDisplay = formatDisplayName(province);

  // Build title
  let title = `${serviceDisplay}`;
  if (subserviceDisplay) {
    title = `${subserviceDisplay} Services`;
  } else {
    title = `${serviceDisplay} Services`;
  }
  title += ` in ${cityDisplay}, ${provinceDisplay.toUpperCase()}`;

  // Build description
  let description = `Find professional ${serviceDisplay.toLowerCase()} services`;
  if (subserviceDisplay) {
    description = `Find professional ${subserviceDisplay.toLowerCase()} services`;
  }
  description += ` in ${cityDisplay}, ${provinceDisplay.toUpperCase()}. Get quotes, compare providers, and connect with trusted local professionals.`;

  return {
    title,
    description,
    city: cityDisplay,
    service: serviceDisplay,
    subservice: subserviceDisplay,
    province: provinceDisplay.toUpperCase(),
  };
}

/**
 * Get route data for rendering
 * @param {Object} routeData - Parsed route data
 * @returns {Object} Complete route data with metadata
 */
export function getCityServiceRouteData(routeData) {
  if (!routeData.isValid) {
    return {
      isValid: false,
      errors: routeData.errors,
      metadata: null,
    };
  }

  const metadata = buildCityServiceMetadata(routeData);

  return {
    isValid: true,
    province: routeData.province,
    city: routeData.city,
    service: routeData.service,
    subservice: routeData.subservice,
    metadata,
    // Build canonical URL
    canonicalUrl: buildCanonicalUrl(routeData),
  };
}

/**
 * Build canonical URL from route data
 * @param {Object} routeData - Parsed route data
 * @returns {string} Canonical URL
 */
function buildCanonicalUrl(routeData) {
  const { province, city, service, subservice } = routeData;
  let url = `/${province}/${city}/${service}`;
  if (subservice) {
    url += `/${subservice}`;
  }
  return url + '/';
}

