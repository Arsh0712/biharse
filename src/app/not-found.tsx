import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FFF6E9', fontFamily: 'Georgia, serif', color: '#1C130B', textAlign: 'center', padding: '24px' }}>
          <div>
            <img src="/brand/mandala.png" alt="BiharSe mandala" width={88} height={88} style={{ borderRadius: '50%', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: '2.4rem', margin: '0 0 8px', color: '#3D1F12' }}>404 — this page took a different ghat</h1>
            <p style={{ color: '#7D6450', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.7 }}>
              The page you&apos;re looking for doesn&apos;t exist — but fresh thekua does.
            </p>
            <Link href="/" style={{ display: 'inline-block', background: '#D80018', color: '#FFF6E9', padding: '13px 30px', borderRadius: 999, textDecoration: 'none', fontWeight: 700 }}>
              Back to BiharSe
            </Link>
            <p style={{ marginTop: 20, color: '#F0A81C', fontFamily: 'serif', fontSize: 18 }}>बिहार की परंपरा और स्वाद, अब आपके घर तक।</p>
          </div>
        </div>
      </body>
    </html>
  );
}
