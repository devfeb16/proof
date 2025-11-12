export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} TheServer. All rights reserved.</p>
      </div>
      <style jsx>{`
        .footer {
          background-color: #fafafa;
          border-top: 1px solid #eaeaea;
          padding: 2rem 0;
          margin-top: auto;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          text-align: center;
        }
        .footer p {
          margin: 0;
          color: #666;
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .footer {
            padding: 1.5rem 0;
          }
          .container {
            padding: 0 1.5rem;
          }
          .footer p {
            font-size: 0.8rem;
          }
        }
        @media (max-width: 480px) {
          .footer {
            padding: 1.25rem 0;
          }
          .container {
            padding: 0 1rem;
          }
          .footer p {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </footer>
  );
}

