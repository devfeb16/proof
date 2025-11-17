import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scrapes a website and extracts structured data
 * Optimized for multiple website scraping in the future
 * @param {string} url - The URL to scrape
 * @returns {Promise<Object>} - Structured scraped data
 */
export async function scrapeWebsite(url) {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
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
    });

    // Load HTML into cheerio
    const $ = cheerio.load(response.data);

    // Extract structured data
    const scrapedData = {
      url: normalizedUrl,
      title: extractTitle($),
      description: extractDescription($),
      keywords: extractKeywords($),
      headings: extractHeadings($),
      links: extractLinks($, normalizedUrl),
      images: extractImages($, normalizedUrl),
      text: extractMainText($),
      metadata: extractMetadata($),
      structuredData: extractStructuredData($),
      scrapedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: scrapedData,
    };
  } catch (error) {
    console.error('Scraping error:', error.message);
    return {
      success: false,
      error: error.message,
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
  const headings = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
  };

  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const tag = element.tagName.toLowerCase();
    const text = $(element).text().trim();
    if (text) {
      headings[tag].push(text);
    }
  });

  return headings;
}

/**
 * Extract all links with their text and href
 */
function extractLinks($, baseUrl) {
  const links = [];
  $('a[href]').each((_, element) => {
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
  return links.slice(0, 100); // Limit to first 100 links
}

/**
 * Extract all images with their alt text and src
 */
function extractImages($, baseUrl) {
  const images = [];
  $('img[src]').each((_, element) => {
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
  return images.slice(0, 50); // Limit to first 50 images
}

/**
 * Extract main text content (removes script and style tags)
 */
function extractMainText($) {
  // Clone to avoid modifying original
  const $clone = $.root().clone();
  $clone.find('script, style, nav, footer, header, aside').remove();
  const text = $clone.text();
  // Clean up whitespace
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000); // Limit to 10000 characters
}

/**
 * Extract additional metadata
 */
function extractMetadata($) {
  const metadata = {};

  // Open Graph tags
  $('meta[property^="og:"]').each((_, element) => {
    const property = $(element).attr('property');
    const content = $(element).attr('content');
    if (property && content) {
      metadata[property] = content;
    }
  });

  // Twitter Card tags
  $('meta[name^="twitter:"]').each((_, element) => {
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

  return metadata;
}

/**
 * Extract structured data (JSON-LD, microdata)
 */
function extractStructuredData($) {
  const structuredData = [];

  // Extract JSON-LD
  $('script[type="application/ld+json"]').each((_, element) => {
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

  return {
    url: data.url,
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    mainHeadings: {
      h1: data.headings.h1.slice(0, 5), // First 5 h1 tags
      h2: data.headings.h2.slice(0, 10), // First 10 h2 tags
    },
    importantLinks: data.links.slice(0, 20).map((link) => ({
      text: link.text.substring(0, 100), // Limit text length
      href: link.href,
    })),
    imageCount: data.images.length,
    mainImages: data.images.slice(0, 5).map((img) => ({
      alt: img.alt.substring(0, 200),
      src: img.src,
    })),
    textPreview: data.text.substring(0, 2000), // First 2000 characters
    metadata: {
      author: data.metadata.author || null,
      ogTitle: data.metadata['og:title'] || null,
      ogDescription: data.metadata['og:description'] || null,
      ogImage: data.metadata['og:image'] || null,
    },
    structuredDataCount: data.structuredData.length,
    scrapedAt: data.scrapedAt,
  };
}

