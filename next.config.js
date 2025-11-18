/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure output file tracing to prevent .nft.json errors
  // Exclude all files from tracing since we're not using serverless deployment
  outputFileTracingExcludes: {
    '*': [
      'node_modules/**/*',
    ],
  },

  // Build optimizations for faster builds
  // Note: SWC minification is enabled by default in Next.js 15
  compiler: {
    // Remove console logs in production for smaller bundle
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['ag-grid-community', 'ag-grid-react'],
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  webpack: (config, { isServer, dev }) => {
    // Suppress webpack cache serialization warnings and autoprefixer warnings
    config.ignoreWarnings = [
      {
        module: /node_modules\/ag-grid-community/,
      },
      {
        message: /autoprefixer/,
      },
      {
        message: /No serializer registered for Warning/,
      },
      {
        message: /end value has mixed support/,
      },
    ];

    // In dev mode, disable webpack filesystem cache to prevent corruption issues
    // Next.js handles its own caching mechanisms
    if (dev) {
      config.cache = false;
    } else if (!isServer) {
      // Production build optimizations
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    // Ensure we don't interfere with Next.js's internal chunking
    // Next.js handles chunk splitting automatically and optimally

    // Reduce infrastructure logging to suppress cache warnings (production only)
    if (!isServer && !dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }

    return config;
  },

  // Suppress build warnings in console
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
}

module.exports = nextConfig

