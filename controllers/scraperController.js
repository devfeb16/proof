import connectDB from '../lib/db';
import ScrapedData from '../models/ScrapedData';
import { jsonError, jsonSuccess } from '../lib/response';
import { scrapeWebsite, refineScrapedData } from '../utils/scraper';

const FULL_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin']);

function hasFullAccess(user) {
  return !!user && FULL_ACCESS_ROLES.has(user.role);
}

function ensureFullAccess(res, user) {
  if (!user) {
    jsonError(res, 401, 'Authentication required');
    return false;
  }
  if (!hasFullAccess(user)) {
    jsonError(res, 403, 'Insufficient role permissions');
    return false;
  }
  return true;
}

/**
 * Scrape a website
 */
export async function scrapeUrl(req, res, currentUser) {
  if (!ensureFullAccess(res, currentUser)) return;

  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return jsonError(res, 400, 'URL is required');
  }

  try {
    // Scrape the website
    const result = await scrapeWebsite(url.trim());

    if (!result.success) {
      return jsonError(res, 500, 'Failed to scrape website', result.error);
    }

    // Return the full scraped data (not saved yet)
    return jsonSuccess(res, 200, 'Website scraped successfully', {
      scrapedData: result.data,
    });
  } catch (err) {
    return jsonError(res, 500, 'Failed to scrape website', err.message);
  }
}

/**
 * Save refined scraped data to database
 */
export async function saveScrapedData(req, res, currentUser) {
  if (!ensureFullAccess(res, currentUser)) return;

  const { scrapedData } = req.body;

  if (!scrapedData || typeof scrapedData !== 'object') {
    return jsonError(res, 400, 'Scraped data is required');
  }

  try {
    await connectDB();

    // Refine the data to extract only major information
    const refinedData = refineScrapedData({ data: scrapedData });

    if (!refinedData) {
      return jsonError(res, 400, 'Invalid scraped data format');
    }

    // Add user who scraped it
    refinedData.scrapedBy = currentUser._id || currentUser.id;

    // Create the document
    const saved = await ScrapedData.create(refinedData);

    return jsonSuccess(res, 201, 'Scraped data saved successfully', {
      scrapedData: toScrapedDataResponse(saved),
    });
  } catch (err) {
    if (err.code === 11000) {
      return jsonError(res, 409, 'Scraped data for this URL already exists');
    }
    return jsonError(res, 500, 'Failed to save scraped data', err.message);
  }
}

/**
 * List all saved scraped data
 */
export async function listScrapedData(req, res, currentUser) {
  if (!ensureFullAccess(res, currentUser)) return;

  const { limit = '50', offset = '0', url } = req.query || {};
  const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
  const parsedOffset = parseInt(offset, 10) || 0;

  try {
    await connectDB();

    // Build query
    const query = {};
    if (url && typeof url === 'string' && url.trim()) {
      query.url = { $regex: url.trim(), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      ScrapedData.find(query)
        .populate('scrapedBy', 'name email')
        .sort({ scrapedAt: -1 })
        .skip(parsedOffset)
        .limit(parsedLimit),
      ScrapedData.countDocuments(query),
    ]);

    return jsonSuccess(res, 200, 'Ok', {
      items: items.map(toScrapedDataResponse),
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    return jsonError(res, 500, 'Failed to list scraped data', err.message);
  }
}

/**
 * Get a specific scraped data by ID
 */
export async function getScrapedDataById(req, res, currentUser, id) {
  if (!ensureFullAccess(res, currentUser)) return;

  if (!id || typeof id !== 'string' || !id.trim()) {
    return jsonError(res, 400, 'ID is required');
  }

  try {
    await connectDB();
    const scrapedData = await ScrapedData.findById(id.trim()).populate('scrapedBy', 'name email');

    if (!scrapedData) {
      return jsonError(res, 404, 'Scraped data not found');
    }

    return jsonSuccess(res, 200, 'Ok', {
      scrapedData: toScrapedDataResponse(scrapedData),
    });
  } catch (err) {
    return jsonError(res, 500, 'Failed to fetch scraped data', err.message);
  }
}

/**
 * Delete scraped data
 */
export async function deleteScrapedDataById(req, res, currentUser, id) {
  if (!ensureFullAccess(res, currentUser)) return;

  if (!id || typeof id !== 'string' || !id.trim()) {
    return jsonError(res, 400, 'ID is required');
  }

  try {
    await connectDB();
    const deleted = await ScrapedData.findByIdAndDelete(id.trim());

    if (!deleted) {
      return jsonError(res, 404, 'Scraped data not found');
    }

    return jsonSuccess(res, 200, 'Scraped data deleted successfully');
  } catch (err) {
    return jsonError(res, 500, 'Failed to delete scraped data', err.message);
  }
}

/**
 * Convert mongoose document to response format
 */
function toScrapedDataResponse(doc) {
  if (!doc) return null;
  const data = doc.toObject ? doc.toObject({ versionKey: false }) : doc;
  data.id = doc._id?.toString ? doc._id.toString() : doc._id;
  return data;
}

