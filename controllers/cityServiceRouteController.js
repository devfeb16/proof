import CityServiceRoute from '../models/CityServiceRoute';
import { parseCityServiceRoute, getCityServiceRouteData } from './cityServiceController';
import { jsonSuccess, jsonError } from '../lib/response';
import connectDB from '../lib/db';

/**
 * City Service Route CRUD Controller
 * Week 1 Task: Dynamic endpoint creation management
 */

/**
 * List all city service routes
 */
export async function listRoutes(req, res) {
  try {
    await connectDB();

    const { limit = 100, offset = 0, province, city, service, isActive } = req.query;

    const filter = {};
    if (province) filter.province = String(province).toLowerCase().trim();
    if (city) filter.city = String(city).toLowerCase().trim();
    if (service) filter.service = String(service).toLowerCase().trim();
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const routes = await CityServiceRoute.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('createdBy', 'email name')
      .lean();

    const total = await CityServiceRoute.countDocuments(filter);

    return jsonSuccess(res, 200, 'Ok', {
      items: routes,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error listing city service routes:', error);
    return jsonError(res, 500, 'Failed to list city service routes');
  }
}

/**
 * Get a single route by ID
 */
export async function getRoute(req, res) {
  try {
    await connectDB();

    const { id } = req.query;
    if (!id) {
      return jsonError(res, 400, 'Route ID is required');
    }

    const route = await CityServiceRoute.findById(id)
      .populate('createdBy', 'email name')
      .lean();

    if (!route) {
      return jsonError(res, 404, 'Route not found');
    }

    return jsonSuccess(res, 200, 'Ok', route);
  } catch (error) {
    console.error('Error getting city service route:', error);
    return jsonError(res, 500, 'Failed to get city service route');
  }
}

/**
 * Create a new city service route
 */
export async function createRoute(req, res) {
  try {
    await connectDB();

    const { province, city, service, subservice, title, description, isActive, metadata } = req.body;

    // Validate required fields
    if (!province || !city || !service) {
      return jsonError(res, 400, 'Province, city, and service are required');
    }

    // Parse and validate route
    const parsedRoute = parseCityServiceRoute({
      province,
      city,
      service,
      subservice: subservice || null,
    });

    if (!parsedRoute.isValid) {
      return jsonError(res, 400, `Invalid route: ${parsedRoute.errors.join(', ')}`);
    }

    // Get route data with metadata
    const routeData = getCityServiceRouteData(parsedRoute);

    // Check if route already exists
    const existingRoute = await CityServiceRoute.findOne({
      province: parsedRoute.province,
      city: parsedRoute.city,
      service: parsedRoute.service,
      subservice: parsedRoute.subservice || null,
    });

    if (existingRoute) {
      return jsonError(res, 409, 'Route already exists');
    }

    // Create new route
    const newRoute = new CityServiceRoute({
      province: parsedRoute.province,
      city: parsedRoute.city,
      service: parsedRoute.service,
      subservice: parsedRoute.subservice || null,
      title: title || routeData.metadata.title,
      description: description || routeData.metadata.description,
      isActive: isActive !== undefined ? isActive : true,
      metadata: metadata || routeData.metadata,
      createdBy: req.user?._id || null,
    });

    await newRoute.save();

    const populatedRoute = await CityServiceRoute.findById(newRoute._id)
      .populate('createdBy', 'email name')
      .lean();

    return jsonSuccess(res, 201, 'City service route created successfully', populatedRoute);
  } catch (error) {
    console.error('Error creating city service route:', error);
    if (error.code === 11000) {
      return jsonError(res, 409, 'Route already exists');
    }
    return jsonError(res, 500, 'Failed to create city service route');
  }
}

/**
 * Update an existing route
 */
export async function updateRoute(req, res) {
  try {
    await connectDB();

    const { id } = req.query;
    if (!id) {
      return jsonError(res, 400, 'Route ID is required');
    }

    const { province, city, service, subservice, title, description, isActive, metadata } = req.body;

    const route = await CityServiceRoute.findById(id);
    if (!route) {
      return jsonError(res, 404, 'Route not found');
    }

    // If route parameters are being updated, validate them
    if (province || city || service || subservice !== undefined) {
      const parsedRoute = parseCityServiceRoute({
        province: province || route.province,
        city: city || route.city,
        service: service || route.service,
        subservice: subservice !== undefined ? subservice : route.subservice,
      });

      if (!parsedRoute.isValid) {
        return jsonError(res, 400, `Invalid route: ${parsedRoute.errors.join(', ')}`);
      }

      // Check for duplicate if route params changed
      const routeParamsChanged =
        province !== route.province ||
        city !== route.city ||
        service !== route.service ||
        subservice !== route.subservice;

      if (routeParamsChanged) {
        const existingRoute = await CityServiceRoute.findOne({
          _id: { $ne: id },
          province: parsedRoute.province,
          city: parsedRoute.city,
          service: parsedRoute.service,
          subservice: parsedRoute.subservice || null,
        });

        if (existingRoute) {
          return jsonError(res, 409, 'Route with these parameters already exists');
        }
      }

      // Update route parameters
      if (province) route.province = parsedRoute.province;
      if (city) route.city = parsedRoute.city;
      if (service) route.service = parsedRoute.service;
      route.subservice = parsedRoute.subservice || null;

      // Regenerate metadata if route params changed
      if (routeParamsChanged) {
        const routeData = getCityServiceRouteData(parsedRoute);
        route.metadata = routeData.metadata;
        if (!title) route.title = routeData.metadata.title;
        if (!description) route.description = routeData.metadata.description;
      }
    }

    // Update other fields
    if (title !== undefined) route.title = title;
    if (description !== undefined) route.description = description;
    if (isActive !== undefined) route.isActive = isActive;
    if (metadata !== undefined) route.metadata = metadata;

    await route.save();

    const updatedRoute = await CityServiceRoute.findById(id)
      .populate('createdBy', 'email name')
      .lean();

    return jsonSuccess(res, 200, 'Route updated successfully', updatedRoute);
  } catch (error) {
    console.error('Error updating city service route:', error);
    if (error.code === 11000) {
      return jsonError(res, 409, 'Route with these parameters already exists');
    }
    return jsonError(res, 500, 'Failed to update city service route');
  }
}

/**
 * Delete a route
 */
export async function deleteRoute(req, res) {
  try {
    await connectDB();

    const { id } = req.query;
    if (!id) {
      return jsonError(res, 400, 'Route ID is required');
    }

    const route = await CityServiceRoute.findByIdAndDelete(id);
    if (!route) {
      return jsonError(res, 404, 'Route not found');
    }

    return jsonSuccess(res, 200, 'Route deleted successfully', { id });
  } catch (error) {
    console.error('Error deleting city service route:', error);
    return jsonError(res, 500, 'Failed to delete city service route');
  }
}

/**
 * Test a route (validate and get route data)
 */
export async function testRoute(req, res) {
  try {
    const { province, city, service, subservice } = req.body;

    if (!province || !city || !service) {
      return jsonError(res, 400, 'Province, city, and service are required');
    }

    // Parse and validate route
    const parsedRoute = parseCityServiceRoute({
      province,
      city,
      service,
      subservice: subservice || null,
    });

    if (!parsedRoute.isValid) {
      return jsonError(res, 400, `Invalid route: ${parsedRoute.errors.join(', ')}`, {
        isValid: false,
        errors: parsedRoute.errors,
      });
    }

    // Get route data with metadata
    const routeData = getCityServiceRouteData(parsedRoute);

    // Build test URL
    const baseUrl = req.headers.host
      ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
      : 'http://localhost:3000';
    const testUrl = `${baseUrl}${routeData.canonicalUrl}`;

    return jsonSuccess(res, 200, 'Route test successful', {
      ...routeData,
      testUrl,
      parsedRoute,
    });
  } catch (error) {
    console.error('Error testing city service route:', error);
    return jsonError(res, 500, 'Failed to test route');
  }
}

