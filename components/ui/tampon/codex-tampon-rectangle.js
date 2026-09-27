import { BaseTampon } from './base-tampon.js';

/**
 * <codex-tampon-rectangle top="…" center="…" bottom="…" color="…" size="250">
 *
 * Cadre rectangulaire, 3 lignes empilées (haut petit, centre en gras plus
 * grand, bas petit) — pas de texte courbé, géométrie volontairement simple.
 * `size` pilote la largeur ; la hauteur suit un ratio 250:140 par défaut.
 */
export class CodexTamponRectangle extends BaseTampon {
  buildSvg() {
    const w = this.size;
    const h = Math.round(w * 0.56);
    const color = this.color;
    const cx = w / 2;

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(-2 ${cx} ${h / 2})">
          <rect x="${w * 0.02}" y="${h * 0.05}" width="${w * 0.96}" height="${h * 0.9}" fill="none"
            stroke="${color}" stroke-width="${w * 0.012}" rx="${w * 0.02}"></rect>
          <rect x="${w * 0.05}" y="${h * 0.12}" width="${w * 0.9}" height="${h * 0.76}" fill="none"
            stroke="${color}" stroke-width="${w * 0.006}" rx="${w * 0.015}"></rect>

          ${this.top ? `
          <text x="${cx}" y="${h * 0.28}" fill="${color}" font-size="${w * 0.06}" font-family="Marianne, sans-serif"
            font-weight="bold" text-anchor="middle">${this.top}</text>` : ''}

          ${this.center ? `
          <text x="${cx}" y="${h * 0.55}" fill="${color}" font-size="${w * 0.1}" font-family="Marianne, sans-serif"
            font-weight="bold" text-anchor="middle">${this.center}</text>` : ''}

          ${this.bottom ? `
          <text x="${cx}" y="${h * 0.8}" fill="${color}" font-size="${w * 0.06}" font-family="Marianne, sans-serif"
            text-anchor="middle">${this.bottom}</text>` : ''}
        </g>
      </svg>
    `;
  }
}

if (!customElements.get('codex-tampon-rectangle')) {
  customElements.define('codex-tampon-rectangle', CodexTamponRectangle);
}