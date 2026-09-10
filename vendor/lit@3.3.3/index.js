// 1. On importe tout depuis le bundle global de Lit et on ré-exporte tout
export * from './lit-all.min.js';

// 2. On importe et ré-exporte également votre classe de base
export { BaseLit } from './base-lit.js';