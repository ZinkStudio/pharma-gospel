import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Valide le format et l'ordre des dates (JJ/MM/AAAA).
 */
export function validateDates(dateDebut, dateFin) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;

  if (!regex.test(dateDebut)) {
    throw new Error('Format date début invalide (attendu: JJ/MM/AAAA)');
  }

  if (!regex.test(dateFin)) {
    throw new Error('Format date fin invalide (attendu: JJ/MM/AAAA)');
  }

  const [jDebut, mDebut, aDebut] = dateDebut.split('/');
  const [jFin, mFin, aFin] = dateFin.split('/');

  const debut = new Date(parseInt(aDebut, 10), parseInt(mDebut, 10) - 1, parseInt(jDebut, 10));
  const fin = new Date(parseInt(aFin, 10), parseInt(mFin, 10) - 1, parseInt(jFin, 10));

  if (fin < debut) {
    throw new Error('La date de fin doit être après la date de début');
  }
}

/**
 * Modifie les dates du PDF Chronoposo (Zone bas pilulier + Zone haut droit production).
 * 
 * @param {ArrayBuffer|Uint8Array} pdfBuffer - Buffer du PDF d'origine
 * @param {Object} options
 * @param {string} options.dateDebut - Date de début (JJ/MM/AAAA)
 * @param {string} options.dateFin - Date de fin (JJ/MM/AAAA)
 * @param {string|null} [options.dateProduction=null] - Date de production optionnelle (JJ/MM/AAAA)
 * @returns {Promise<Uint8Array>} Le PDF sous forme de tableau d'octets prêt à être sauvegardé/téléchargé
 */
export async function modifyChronoposoDates(pdfBuffer, { dateDebut, dateFin, dateProduction = null }) {
  validateDates(dateDebut, dateFin);

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageHeight = page.getHeight();

    // ===== ZONE BAS : Rectangle & masquage pilulier =====
    page.drawRectangle({
      x: 30,
      y: 26,
      width: 180,
      height: 30,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    const fontSize = 8;

    const text1 = `PILLULIER COMMENCANT LE ${dateDebut}`;
    const textWidth1 = font.widthOfTextAtSize(text1, fontSize);
    page.drawText(text1, {
      x: 30 + 180 - textWidth1 - 4,
      y: 40,
      font: font,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    const text2 = `PILLULIER FINISSANT LE ${dateFin}`;
    const textWidth2 = font.widthOfTextAtSize(text2, fontSize);
    page.drawText(text2, {
      x: 30 + 180 - textWidth2 - 4,
      y: 32,
      font: font,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // ===== ZONE HAUT DROIT : Date de production (optionnel) =====
    if (dateProduction) {
      page.drawRectangle({
        x: 490,
        y: pageHeight - 120,
        width: 70,
        height: 14,
        color: rgb(1, 1, 1),
        opacity: 1,
      });

      page.drawText(`${dateProduction}`, {
        x: 490 + 5,
        y: pageHeight - 120 + 4,
        font: font,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save();
}