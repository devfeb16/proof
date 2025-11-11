import mongoose from 'mongoose';

const FundingOpportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    source: { type: String, default: '', trim: true },
    url: { type: String, default: '', trim: true },
    deadline: { type: Date },
    amountMin: { type: Number },
    amountMax: { type: Number },
    currency: { type: String, default: 'USD' },
    eligibility: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['open', 'closed', 'unknown'], default: 'unknown' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

// Helpful indexes for list queries
FundingOpportunitySchema.index({ createdAt: -1 });
FundingOpportunitySchema.index({ title: 1 });

const FundingOpportunity =
  mongoose.models.FundingOpportunity ||
  mongoose.model('FundingOpportunity', FundingOpportunitySchema);

export default FundingOpportunity;


