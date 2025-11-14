import mongoose from 'mongoose';

/**
 * City Service Route Configuration Model
 * Stores route configurations for testing and management
 * Week 1 Task: Dynamic endpoint creation
 */
const CityServiceRouteSchema = new mongoose.Schema(
  {
    province: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true, lowercase: true },
    service: { type: String, required: true, trim: true, lowercase: true },
    subservice: { type: String, default: null, trim: true, lowercase: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastTested: { type: Date },
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound index for unique route combinations
CityServiceRouteSchema.index({ province: 1, city: 1, service: 1, subservice: 1 }, { unique: true });
CityServiceRouteSchema.index({ isActive: 1, createdAt: -1 });
CityServiceRouteSchema.index({ province: 1, city: 1 });

const CityServiceRoute =
  mongoose.models.CityServiceRoute ||
  mongoose.model('CityServiceRoute', CityServiceRouteSchema);

export default CityServiceRoute;

