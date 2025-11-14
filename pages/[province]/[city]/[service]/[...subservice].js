import { parseCityServiceRoute, getCityServiceRouteData } from '../../../../controllers/cityServiceController';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';

/**
 * Dynamic City + Service Route Page
 * Handles URLs like: /ab/calgary/electrician/high-voltage-electrician/
 * Week 1 Task: Dynamic endpoint creation for location-based routing
 */
export default function CityServicePage({ routeData, error }) {
  // Handle invalid routes
  if (error || !routeData || !routeData.isValid) {
    return (
      <div className="city-service-page">
        <Header />
        <main className="error-container">
          <div className="container">
            <h1>Page Not Found</h1>
            <p>
              {error || 
               (routeData?.errors && routeData.errors.length > 0 
                 ? routeData.errors.join(', ') 
                 : 'The requested city and service page could not be found.')}
            </p>
            <a href="/" className="back-link">Return to Home</a>
          </div>
        </main>
        <Footer />
        <style jsx>{`
          .city-service-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .error-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .error-container .container {
            text-align: center;
            max-width: 600px;
          }
          .error-container h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #333;
          }
          .error-container p {
            font-size: 1.1rem;
            color: #666;
            margin-bottom: 2rem;
          }
          .back-link {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background 0.2s;
          }
          .back-link:hover {
            background: #0051cc;
          }
        `}</style>
      </div>
    );
  }

  const { metadata, province, city, service, subservice } = routeData;

  return (
    <div className="city-service-page">
      <Header />
      <main className="city-service-main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <h1 className="page-title">{metadata.title}</h1>
            <p className="page-description">{metadata.description}</p>
          </section>

          {/* Location & Service Info */}
          <section className="info-section">
            <div className="info-grid">
              <div className="info-card">
                <h2>Location</h2>
                <p className="location-text">
                  <strong>{metadata.city}</strong>, {metadata.province}
                </p>
              </div>
              <div className="info-card">
                <h2>Service Category</h2>
                <p className="service-text">
                  {metadata.subservice || metadata.service}
                </p>
              </div>
            </div>
          </section>

          {/* Content Section */}
          <section className="content-section">
            <h2>Available Services</h2>
            <p>
              This page is for {metadata.service.toLowerCase()} services
              {metadata.subservice && ` - specifically ${metadata.subservice.toLowerCase()}`} 
              {' '}in {metadata.city}, {metadata.province}.
            </p>
            <p>
              <em>This is a dynamic route implementation for Week 1 task. 
              Additional functionality and content will be added in future phases.</em>
            </p>
          </section>

          {/* Route Debug Info (can be removed in production) */}
          <section className="debug-section">
            <details>
              <summary>Route Information (Debug)</summary>
              <pre>{JSON.stringify({ province, city, service, subservice }, null, 2)}</pre>
            </details>
          </section>
        </div>
      </main>
      <Footer />
      <style jsx>{`
        .city-service-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #fff;
        }
        .city-service-main {
          flex: 1;
          padding: 2rem 0;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        .hero-section {
          text-align: center;
          padding: 3rem 0;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 2rem;
        }
        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .page-description {
          font-size: 1.2rem;
          color: #666;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .info-section {
          margin-bottom: 3rem;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .info-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .info-card h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }
        .location-text,
        .service-text {
          font-size: 1.25rem;
          color: #1a1a1a;
          margin: 0;
        }
        .content-section {
          margin-bottom: 3rem;
          padding: 2rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .content-section h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .content-section p {
          font-size: 1rem;
          line-height: 1.6;
          color: #333;
          margin-bottom: 1rem;
        }
        .content-section em {
          color: #666;
          font-style: italic;
        }
        .debug-section {
          margin-top: 2rem;
          padding: 1rem;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
        }
        .debug-section details {
          cursor: pointer;
        }
        .debug-section summary {
          font-weight: 600;
          color: #856404;
          margin-bottom: 0.5rem;
        }
        .debug-section pre {
          background: #fff;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 0.875rem;
          color: #333;
        }
        @media (max-width: 768px) {
          .page-title {
            font-size: 2rem;
          }
          .page-description {
            font-size: 1rem;
          }
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Server-side props for dynamic routing
 * Validates and processes route parameters
 */
export async function getServerSideProps(context) {
  const { params, req, res } = context;

  try {
    // Parse and validate route parameters
    // Handle subservice - can be undefined, empty array, or array with values
    const subserviceParam = params.subservice && 
                            Array.isArray(params.subservice) && 
                            params.subservice.length > 0
      ? params.subservice
      : params.subservice || null;

    const parsedRoute = parseCityServiceRoute({
      province: params.province,
      city: params.city,
      service: params.service,
      subservice: subserviceParam,
    });

    // Get complete route data with metadata
    const routeData = getCityServiceRouteData(parsedRoute);

    // If route is invalid, return 404
    if (!routeData.isValid) {
      res.statusCode = 404;
      return {
        props: {
          routeData: null,
          error: routeData.errors.join(', '),
        },
      };
    }

    // Set SEO headers
    if (routeData.canonicalUrl) {
      res.setHeader('X-Canonical-URL', routeData.canonicalUrl);
    }

    return {
      props: {
        routeData,
        error: null,
      },
    };
  } catch (error) {
    console.error('Error in city service route:', error);
    res.statusCode = 500;
    return {
      props: {
        routeData: null,
        error: 'An error occurred while processing the request.',
      },
    };
  }
}

