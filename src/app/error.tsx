'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#3D1F12', color: '#FFF6E9', fontFamily: 'Georgia, serif', textAlign: 'center', padding: 24 }}>
          <div>
            <img src="/brand/mandala.png" alt="" width={80} height={80} style={{ borderRadius: '50%', margin: '0 auto 20px', opacity: 0.9 }} />
            <h1 style={{ fontSize: '2.2rem', margin: '0 0 10px' }}>Something boiled over in the kitchen</h1>
            <p style={{ color: '#D3A37E', maxWidth: 460, margin: '0 auto 26px', lineHeight: 1.7 }}>
              An unexpected error occurred. Our kitchen crew has been notified — please try again.
            </p>
            <button
              onClick={reset}
              style={{ background: '#D80018', color: '#FFF6E9', border: 0, padding: '13px 32px', borderRadius: 999, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
            >
              Try again
            </button>
            <p style={{ marginTop: 18, color: '#F0A81C' }}>छठी मइया सबके मनोकामना पूर्ण करें।</p>
            {error.digest ? <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,246,233,0.4)' }}>Ref: {error.digest}</p> : null}
          </div>
        </div>
      </body>
    </html>
  );
}
