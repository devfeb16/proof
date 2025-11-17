import mongoose from 'mongoose';

const ScrapedDataSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, index: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    mainHeadings: {
      h1: [{ type: String, trim: true }],
      h2: [{ type: String, trim: true }],
    },
    importantLinks: [
      {
        text: { type: String, trim: true },
        href: { type: String, trim: true },
      },
    ],
    imageCount: { type: Number, default: 0 },
    mainImages: [
      {
        alt: { type: String, trim: true },
        src: { type: String, trim: true },
      },
    ],
    textPreview: { type: String },
    metadata: {
      author: { type: String, trim: true },
      ogTitle: { type: String, trim: true },
      ogDescription: { type: String, trim: true },
      ogImage: { type: String, trim: true },
    },
    structuredDataCount: { type: Number, default: 0 },
    scrapedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scrapedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for faster queries
ScrapedDataSchema.index({ url: 1, scrapedAt: -1 });
ScrapedDataSchema.index({ scrapedBy: 1, scrapedAt: -1 });

const ScrapedData = mongoose.models.ScrapedData || mongoose.model('ScrapedData', ScrapedDataSchema);

export default ScrapedData;

