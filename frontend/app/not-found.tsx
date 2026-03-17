import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="heading-display text-gradient mb-4">404</h1>
      <h2 className="heading-md mb-8">Page Not Found</h2>
      <p className="text-muted mb-8" style={{ maxWidth: '400px' }}>
        The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back home where it&apos;s safe.
      </p>
      <Link href="/" className="btn btn-primary">
        Go Back Home
      </Link>
    </div>
  );
}
