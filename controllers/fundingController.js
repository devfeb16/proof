import mongoose from 'mongoose';
import connectDB from '../lib/db';
import FundingOpportunity from '../models/FundingOpportunity';
import { jsonError, jsonSuccess } from '../lib/response';

function validateFundingPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid JSON body'] };
  }
  const { title, url, source, amountMin, amountMax, deadline } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('title is required');
  }
  if (amountMin != null && typeof amountMin !== 'number') {
    errors.push('amountMin must be a number');
  }
  if (amountMax != null && typeof amountMax !== 'number') {
    errors.push('amountMax must be a number');
  }
  if (amountMin != null && amountMax != null && amountMin > amountMax) {
    errors.push('amountMin cannot be greater than amountMax');
  }
  if (deadline != null && Number.isNaN(Date.parse(deadline))) {
    errors.push('deadline must be a valid date');
  }
  if (url != null && typeof url !== 'string') {
    errors.push('url must be a string');
  }
  if (source != null && typeof source !== 'string') {
    errors.push('source must be a string');
  }
  return { valid: errors.length === 0, errors };
}

export async function createFundingOpportunity(req, res, currentUser = null) {
  const { valid, errors } = validateFundingPayload(req.body);
  if (!valid) {
    return jsonError(res, 400, 'Validation error', errors);
  }
  try {
    await connectDB();
    const payload = { ...req.body };
    if (payload.deadline) {
      payload.deadline = new Date(payload.deadline);
    }
    if (currentUser && currentUser._id) {
      payload.createdBy = currentUser._id;
    }
    const created = await FundingOpportunity.create(payload);
    return jsonSuccess(res, 201, 'Funding opportunity created', { funding: created });
  } catch (err) {
    return jsonError(res, 500, 'Failed to create funding opportunity', err.message);
  }
}

export async function listFundingOpportunities(req, res) {
  try {
    await connectDB();
    const { limit, offset } = req.query || {};
    // Basic pagination support (optional for Week 1)
    const parsedLimit = Math.min(parseInt(limit || '50', 10), 200);
    const parsedOffset = parseInt(offset || '0', 10);
    const query = {};
    const [items, total] = await Promise.all([
      FundingOpportunity.find(query).sort({ createdAt: -1 }).skip(parsedOffset).limit(parsedLimit),
      FundingOpportunity.countDocuments(query),
    ]);
    return jsonSuccess(res, 200, 'Ok', {
      items,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    return jsonError(res, 500, 'Failed to list funding opportunities', err.message);
  }
}

export async function getFundingOpportunityById(req, res) {
  try {
    await connectDB();
    const { id } = req.query || {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return jsonError(res, 400, 'Validation error', ['id must be a valid ObjectId']);
    }
    const funding = await FundingOpportunity.findById(id);
    if (!funding) {
      return jsonError(res, 404, 'Funding opportunity not found');
    }
    return jsonSuccess(res, 200, 'Ok', { funding });
  } catch (err) {
    return jsonError(res, 500, 'Failed to fetch funding opportunity', err.message);
  }
}


