import { LitElement } from './lit-all.min.js';

export class BaseLit extends LitElement {
  // Optionnel : centraliser les émetteurs d'événements
  emit(eventName, detail) {
    this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
  }
}