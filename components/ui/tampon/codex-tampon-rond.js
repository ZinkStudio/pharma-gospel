import { BaseTampon } from './base-tampon.js';

/**
 * <codex-tampon-rond top="…" bottom="…" center="…" center-sub="…" color="…" size="250">
 *
 * Reproduit la géométrie de stamp.html (anneaux à 0.988/0.942/0.732 × rayon,
 * texte courbé à 0.786 et 0.896 × rayon), mais paramétrée : tout est calculé
 * depuis `size`, aucune valeur n'est plus figée pour un texte précis.
 */
export class CodexTamponRond extends BaseTampon {
  buildSvg() {
    const s = this.size;
    const c = s / 2;
    const color = this.color;
    const uid = Math.random().toString(36).slice(2, 9); // évite les collisions d'id si plusieurs tampons sont montés

    const rOuter = c * 0.988;
    const rRing2 = c * 0.942;
    const rInner = c * 0.732;
    const rTextTop = c * 0.786;
    const rTextBottom = c * 0.896;

    const pathTop = `pathTop-${uid}`;
    const pathBottom = `pathBottom-${uid}`;

    return `
      <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink">
        <g transform="rotate(5 ${c} ${c})">
          <circle cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="${color}" stroke-width="${s * 0.012}"></circle>
          <circle cx="${c}" cy="${c}" r="${rRing2}" fill="none" stroke="${color}" stroke-width="${s * 0.008}"></circle>

          ${this.top ? `
          <text font-size="${s * 0.072}" font-family="Marianne, sans-serif" fill="${color}" font-weight="bold"
            transform="rotate(0, ${c}, ${c})">
            <defs>
              <path id="${pathTop}" d="M ${c} ${c} m -${rTextTop}, 0 a ${rTextTop},${rTextTop} 0 1,1 ${rTextTop * 2},0 a ${rTextTop},${rTextTop} 0 1,1 -${rTextTop * 2},0"></path>
            </defs>
            <textPath href="#${pathTop}" xlink:href="#${pathTop}">${this.top}&nbsp;</textPath>
          </text>` : ''}

          ${this.bottom ? `
          <text font-size="${s * 0.072}" font-family="Marianne, sans-serif" fill="${color}" font-weight="bold"
            transform="rotate(-5 ${c} ${c})">
            <defs>
              <path id="${pathBottom}" d="M ${c} ${c} m -${rTextBottom}, 0 a ${rTextBottom},${rTextBottom} 0 1,0 ${rTextBottom * 2},0 a ${rTextBottom},${rTextBottom} 0 1,0 -${rTextBottom * 2},0"></path>
            </defs>
            <textPath href="#${pathBottom}" xlink:href="#${pathBottom}">${this.bottom}</textPath>
          </text>` : ''}

          <circle cx="${c}" cy="${c}" r="${rInner}" fill="none" stroke="${color}" stroke-width="${s * 0.008}"></circle>

          ${this.center ? `
          <text x="${c}" y="${c - s * 0.05}" fill="${color}" font-size="${s * 0.088}" font-family="Marianne, sans-serif"
            font-weight="bold" transform="rotate(0 ${c} ${c - s * 0.05})">
            <tspan dy="${s * 0.027}" text-anchor="middle" x="${c}">${this.center}</tspan>
          </text>` : ''}

          ${this.centerSub ? `
          <text x="${c}" y="${c + s * 0.05}" fill="${color}" font-size="${s * 0.088}" font-family="Marianne, sans-serif"
            transform="rotate(0 ${c} ${c + s * 0.05})">
            <tspan dy="${s * 0.027}" text-anchor="middle" x="${c}">${this.centerSub}</tspan>
          </text>` : ''}
        </g>
      </svg>
    `;
  }
}

if (!customElements.get('codex-tampon-rond')) {
  customElements.define('codex-tampon-rond', CodexTamponRond);
}