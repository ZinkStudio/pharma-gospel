/**
 * ⚠️ SHIM DE COMPATIBILITÉ — NE PAS UTILISER POUR DU NOUVEAU CODE.
 *
 * Ce fichier existe uniquement pour les vues qui n'ont pas encore migré
 * (codex-ordonnancier.js). Toute nouvelle vue doit importer directement
 * depuis `services/pdf/pdf-service.js`.
 *
 * Migration prévue : supprimer ce fichier une fois ordonnancier passé
 * sur `PDFService.capture()`.
 */
import { PDFService } from '../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../services/pdf/engines/html2pdf-engine.js';

export { PDF_PRESETS };

/**
 * @deprecated Utiliser PDFService.capture(element, { filename, ...preset, action: 'download' })
 */
export async function exportToPdf(element, filename = 'document.pdf', customOptions = {}) {
  return PDFService.capture(element, {
    filename,
    action: 'download',
    ...customOptions
  });
}

/**
 * @deprecated Utiliser PDFService.print(element, options)
 */
export function printElement(element, printOptions = {}) {
  return PDFService.print(element, printOptions);
}