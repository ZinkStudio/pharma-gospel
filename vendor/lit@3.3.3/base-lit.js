/**
 * BaseLit — atome UI réactif.
 * À utiliser pour les composants dont le rendu est interne (shadow DOM
 * self-contained) et qui exposent des propriétés réactives.
 * Émet via `this.emit(name, detail)` (bubbles + composed).
 */
import { LitElement } from './lit-all.min.js';

export class BaseLit extends LitElement {
  // Optionnel : centraliser les émetteurs d'événements
  emit(eventName, detail) {
    this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
  }
}