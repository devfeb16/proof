import axios from 'axios';

// Use require for cheerio in server-side Next.js code to avoid module resolution issues
const cheerio = require('cheerio');

/**
 * Normalizes a URL to ensure it has a protocol
 * Accepts domains, URLs with or without protocol, and various formats
 * @param {string} url - The URL or domain to normalize
 * @returns {string} - Normalized URL with protocol
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }

  let normalized = url.trim();

  // Remove any leading/trailing whitespace and slashes
  normalized = normalized.replace(/^\/+|\/+$/g, '');

  // If it already has http:// or https://, return as is
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  // If it starts with //, add https:
  if (/^\/\//.test(normalized)) {
    return `https:${normalized}`;
  }

  // If it looks like a domain (contains a dot and no spaces), add https://
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(normalized)) {
    return `https://${normalized}`;
  }

  // If it's a localhost or IP address, add http://
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(normalized)) {
    return `http://${normalized}`;
  }

  // Default: try with https://
  return `https://${normalized}`;
}

/**
 * Scrapes a website and extracts structured data
 * Optimized for multiple website scraping in the future
 * @param {string} url - The URL to scrape
 * @returns {Promise<Object>} - Structured scraped data
 */
export async function scrapeWebsite(url) {
  try {
    // Normalize URL
    let normalizedUrl;
    try {
      normalizedUrl = normalizeUrl(url);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    // Validate the normalized URL
    try {
      new URL(normalizedUrl);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
        data: null,
      };
    }

    // Validate cheerio is available
    if (!cheerio) {
      console.error('Cheerio is not available. Please ensure cheerio is installed: npm install cheerio');
      return {
        success: false,
        error: 'Scraping library is not available. Please ensure cheerio is installed.',
        data: null,
      };
    }

    if (typeof cheerio.load !== 'function') {
      console.error('Cheerio.load is not a function. Cheerio object:', cheerio);
      return {
        success: false,
        error: 'Scraping library error. Please contact support.',
        data: null,
      };
    }

    // Fetch the webpage with timeout and user agent
    const response = await axios.get(normalizedUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      responseType: 'text', // Ensure we get text/html response
    });

    // Validate response data
    if (!response || !response.data) {
      return {
        success: false,
        error: 'No data received from the website',
        data: null,
      };
    }

    // Ensure response.data is a string
    const htmlContent = typeof response.data === 'string' ? response.data : String(response.data);
    
    if (!htmlContent || htmlContent.trim().length === 0) {
      return {
        success: false,
        error: 'Empty response received from the website',
        data: null,
      };
    }

    // Load HTML into cheerio
    let $;
    try {
      $ = cheerio.load(htmlContent);
      if (!$) {
        throw new Error('Failed to load HTML into cheerio');
      }
    } catch (loadError) {
      console.error('Error loading HTML into cheerio:', loadError);
      return {
        success: false,
        error: `Failed to parse website HTML: ${loadError.message}`,
        data: null,
      };
    }

    // Extract domain information
    let domainInfo = {};
    try {
      const urlObj = new URL(normalizedUrl);
      domainInfo = {
        domain: urlObj.hostname,
        protocol: urlObj.protocol.replace(':', ''),
        path: urlObj.pathname,
        host: urlObj.host,
        origin: urlObj.origin,
      };
    } catch (e) {
      // Invalid URL, skip domain info
    }

    // Extract structured data with safe fallbacks
    const metadata = extractMetadata($) || {};
    const headings = extractHeadings($) || { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
    const links = extractLinks($, normalizedUrl) || [];
    const images = extractImages($, normalizedUrl) || [];
    const text = extractMainText($) || '';
    const structuredData = extractStructuredData($) || [];

    // Calculate statistics
    const stats = {
      totalHeadings: Object.values(headings).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
      totalLinks: links.length,
      totalImages: images.length,
      totalKeywords: extractKeywords($).length,
      textLength: text.length,
      hasTitle: !!extractTitle($),
      hasDescription: !!extractDescription($),
      hasKeywords: extractKeywords($).length > 0,
      hasOpenGraph: Object.keys(metadata).some(key => key.startsWith('og:')),
      hasTwitterCard: Object.keys(metadata).some(key => key.startsWith('twitter:')),
      hasStructuredData: structuredData.length > 0,
      hasCanonical: !!metadata.canonical,
      hasRobots: !!metadata.robots,
      hasLanguage: !!metadata.language,
      hasCharset: !!metadata.charset,
      hasViewport: !!metadata.viewport,
    };

    const scrapedData = {
      url: normalizedUrl,
      domainInfo,
      title: extractTitle($) || '',
      description: extractDescription($) || '',
      keywords: extractKeywords($) || [],
      headings,
      links,
      images,
      text,
      metadata,
      structuredData,
      stats,
      scrapedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: scrapedData,
    };
  } catch (error) {
    console.error('Scraping error:', error.message);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The website may be down or unreachable.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The website took too long to respond.';
    } else if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Domain not found. Please check the URL.';
    }
    
    return {
      success: false,
      error: errorMessage,
      data: null,
    };
  }
}

/**
 * Extract page title
 */
function extractTitle($) {
  return $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
}

/**
 * Extract meta description
 */
function extractDescription($) {
  return (
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''
  );
}

/**
 * Extract meta keywords
 */
function extractKeywords($) {
  const keywords = $('meta[name="keywords"]').attr('content') || '';
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Extract all headings (h1-h6)
 */
function extractHeadings($) {
  if (!$) return { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  
  const headings = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
  };

  try {
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      if (!element || !element.tagName) return;
      const tag = element.tagName.toLowerCase();
      if (!headings[tag]) return;
      const text = $(element).text().trim();
      if (text) {
        headings[tag].push(text);
      }
    });
  } catch (error) {
    console.warn('Error extracting headings:', error.message);
  }

  return headings;
}

/**
 * Extract all links with their text and href
 */
function extractLinks($, baseUrl) {
  if (!$ || !baseUrl) return [];
  
  const links = [];
  try {
    $('a[href]').each((_, element) => {
      if (!element) return;
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      if (href) {
        // Resolve relative URLs
        let absoluteUrl = href;
        try {
          absoluteUrl = new URL(href, baseUrl).href;
        } catch {
          // Invalid URL, skip
          return;
        }
        links.push({
          text: text || href,
          href: absoluteUrl,
        });
      }
    });
  } catch (error) {
    console.warn('Error extracting links:', error.message);
  }
  return links.slice(0, 100); // Limit to first 100 links
}

/**
 * Extract all images with their alt text and src
 */
function extractImages($, baseUrl) {
  if (!$ || !baseUrl) return [];
  
  const images = [];
  try {
    $('img[src]').each((_, element) => {
      if (!element) return;
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      if (src) {
        // Resolve relative URLs
        let absoluteUrl = src;
        try {
          absoluteUrl = new URL(src, baseUrl).href;
        } catch {
          // Invalid URL, skip
          return;
        }
        images.push({
          alt,
          src: absoluteUrl,
        });
      }
    });
  } catch (error) {
    console.warn('Error extracting images:', error.message);
  }
  return images.slice(0, 50); // Limit to first 50 images
}

/**
 * Extract main text content (removes script and style tags)
 */
function extractMainText($) {
  if (!$) return '';
  
  try {
    // Clone to avoid modifying original
    const $clone = $.root().clone();
    $clone.find('script, style, nav, footer, header, aside').remove();
    const text = $clone.text();
    // Clean up whitespace
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10000 characters
  } catch (error) {
    console.warn('Error extracting main text:', error.message);
    return '';
  }
}

/**
 * Extract additional metadata
 */
function extractMetadata($) {
  if (!$) return {};
  
  const metadata = {};

  try {
    // Language
    const lang = $('html').attr('lang') || $('html').attr('xml:lang') || '';
    if (lang) metadata.language = lang;

    // Charset
    const charset = $('meta[charset]').attr('charset') || 
                   $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^;]+)/)?.[1] || '';
    if (charset) metadata.charset = charset;

    // Viewport
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    if (viewport) metadata.viewport = viewport;

    // Canonical URL
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    if (canonical) metadata.canonical = canonical;

    // Robots
    const robots = $('meta[name="robots"]').attr('content') || '';
    if (robots) metadata.robots = robots;

    // Open Graph tags
    $('meta[property^="og:"]').each((_, element) => {
      if (!element) return;
      const property = $(element).attr('property');
      const content = $(element).attr('content');
      if (property && content) {
        metadata[property] = content;
      }
    });

    // Twitter Card tags
    $('meta[name^="twitter:"]').each((_, element) => {
      if (!element) return;
      const name = $(element).attr('name');
      const content = $(element).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Author
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      '';
    if (author) {
      metadata.author = author;
    }

    // Generator
    const generator = $('meta[name="generator"]').attr('content') || '';
    if (generator) metadata.generator = generator;

    // Theme Color
    const themeColor = $('meta[name="theme-color"]').attr('content') || '';
    if (themeColor) metadata.themeColor = themeColor;
  } catch (error) {
    console.warn('Error extracting metadata:', error.message);
  }

  return metadata;
}

/**
 * Extract structured data (JSON-LD, microdata)
 */
function extractStructuredData($) {
  if (!$) return [];
  
  const structuredData = [];

  try {
    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      if (!element) return;
      try {
        const jsonText = $(element).html();
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          structuredData.push(parsed);
        }
      } catch (error) {
        // Invalid JSON, skip
        console.warn('Failed to parse JSON-LD:', error.message);
      }
    });
  } catch (error) {
    console.warn('Error extracting structured data:', error.message);
  }

  return structuredData;
}

/**
 * Refine scraped data to extract only major/important information
 * This is what gets saved to the database
 */
export function refineScrapedData(scrapedData) {
  if (!scrapedData || !scrapedData.data) {
    return null;
  }

  const data = scrapedData.data;

  // Safely extract headings with null checks
  const headings = data.headings || {};
  const h1Array = Array.isArray(headings.h1) ? headings.h1 : [];
  const h2Array = Array.isArray(headings.h2) ? headings.h2 : [];

  // Safely extract links with null checks
  const links = Array.isArray(data.links) ? data.links : [];
  const importantLinks = links.slice(0, 20).map((link) => ({
    text: (link?.text || '').substring(0, 100), // Limit text length
    href: link?.href || '',
  }));

  // Safely extract images with null checks
  const images = Array.isArray(data.images) ? data.images : [];
  const mainImages = images.slice(0, 5).map((img) => ({
    alt: (img?.alt || '').substring(0, 200),
    src: img?.src || '',
  }));

  // Safely extract text with null checks
  const text = typeof data.text === 'string' ? data.text : '';
  const textPreview = text.substring(0, 2000); // First 2000 characters

  // Safely extract metadata with null checks
  const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const structuredData = Array.isArray(data.structuredData) ? data.structuredData : [];

  return {
    url: data.url || '',
    title: data.title || '',
    description: data.description || '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    mainHeadings: {
      h1: h1Array.slice(0, 5), // First 5 h1 tags
      h2: h2Array.slice(0, 10), // First 10 h2 tags
    },
    importantLinks,
    imageCount: images.length,
    mainImages,
    textPreview,
    metadata: {
      author: metadata.author || null,
      ogTitle: metadata['og:title'] || null,
      ogDescription: metadata['og:description'] || null,
      ogImage: metadata['og:image'] || null,
    },
    structuredDataCount: structuredData.length,
    scrapedAt: data.scrapedAt || new Date().toISOString(),
  };
}

