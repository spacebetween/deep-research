import { ImageResponse } from 'next/og';

export const alt = 'Bad Unicorn recruiter intelligence workspace';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#08070c',
          color: '#f7f3ff',
          display: 'flex',
          fontFamily: 'Arial, sans-serif',
          height: '100%',
          justifyContent: 'space-between',
          padding: 72,
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background:
              'radial-gradient(circle at 25% 15%, rgba(176, 38, 255, 0.34), transparent 34%), radial-gradient(circle at 88% 76%, rgba(74, 225, 118, 0.22), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))',
            display: 'flex',
            height: '100%',
            left: 0,
            position: 'absolute',
            top: 0,
            width: '100%',
          }}
        />
        <div
          style={{
            border: '1px solid rgba(221, 183, 255, 0.24)',
            borderRadius: 28,
            display: 'flex',
            height: '100%',
            padding: 48,
            position: 'relative',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 710 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ color: '#4ae176', fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>
                RECRUITER INTELLIGENCE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ color: '#ffffff', fontSize: 82, fontWeight: 800, lineHeight: 0.96 }}>
                  Bad Unicorn
                </div>
                <div style={{ color: '#ddb7ff', fontSize: 40, fontWeight: 700, lineHeight: 1.18 }}>
                  Candidate sourcing with receipts.
                </div>
              </div>
            </div>
            <div style={{ color: '#d9d1e5', fontSize: 31, lineHeight: 1.35, maxWidth: 690 }}>
              Turn vague hiring manager vibes into names, LinkedIn links, and evidence you can actually defend.
            </div>
          </div>
          <div style={{ alignItems: 'center', display: 'flex', flex: 1, justifyContent: 'center' }}>
            <div
              style={{
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: 32,
                display: 'flex',
                height: 310,
                justifyContent: 'center',
                width: 310,
              }}
            >
              <img
                alt=""
                src="https://bad-unicorn.hrgo.co.uk/unicornlogo.png"
                style={{ height: 226, objectFit: 'contain', width: 226 }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
