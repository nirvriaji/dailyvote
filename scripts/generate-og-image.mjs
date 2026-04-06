import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Inter font (bundled with satori)
const interRegularPath = resolve(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff');
const interBoldPath    = resolve(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff');

let fontRegular, fontBold;
try {
  fontRegular = readFileSync(interRegularPath);
  fontBold    = readFileSync(interBoldPath);
} catch {
  // Fallback: download Inter subset via fetch
  console.log('⚠ @fontsource/inter not found — fetching font subset...');
  const res = await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2');
  const buf = Buffer.from(await res.arrayBuffer());
  fontRegular = buf;
  fontBold    = buf;
}

const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        fontFamily: 'Inter',
        position: 'relative',
      },
      children: [
        // Top: eyebrow
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#C8102E',
                    flexShrink: '0',
                  },
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '18px',
                    fontWeight: '400',
                    color: '#64748b',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  },
                  children: 'Elecciones Perú 2026',
                },
              },
            ],
          },
        },

        // Middle: main title
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            },
            children: [
              {
                type: 'h1',
                props: {
                  style: {
                    fontSize: '72px',
                    fontWeight: '700',
                    color: '#f1f5f9',
                    lineHeight: '1.05',
                    margin: '0',
                    letterSpacing: '-0.02em',
                  },
                  children: 'Simula tu voto.\nEntenderás todo.',
                },
              },
              {
                type: 'p',
                props: {
                  style: {
                    fontSize: '26px',
                    fontWeight: '400',
                    color: '#94a3b8',
                    margin: '0',
                    lineHeight: '1.4',
                  },
                  children: 'Elige partido, candidatos y ve cómo se convierten en escaños.',
                },
              },
            ],
          },
        },

        // Bottom: date pill + domain
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    background: '#C8102E',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: '700',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    letterSpacing: '0.01em',
                  },
                  children: '12 de abril de 2026',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '18px',
                    fontWeight: '400',
                    color: '#475569',
                  },
                  children: 'lafechamasimportante.com',
                },
              },
            ],
          },
        },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold,    weight: 700, style: 'normal' },
    ],
  }
);

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
const png   = resvg.render().asPng();

const outPath = resolve(__dirname, '../static/og-image.png');
writeFileSync(outPath, png);
console.log(`✓ og-image.png generated → ${outPath} (${Math.round(png.length / 1024)} KB)`);
