/**
 * GS1 DataMatrix Parser pour officine.
 * Conforme aux spécifications GS1 / ANSM (Série 01 GTIN, 17 Date, 10 Lot, 21 Serial).
 *
 * @param {string} rawString - Chaîne brute issue de la douchette
 * @returns {Object} Structure normalisée des données extraites
 */
export function parseGS1(rawString) {
  const result = {
    cip: null,        // CIP13 (13 chiffres)
    gtin: null,       // GTIN14 complet (14 chiffres)
    exp: null,        // Date ISO (YYYY-MM-DD)
    expFr: null,      // Date affichage FR (DD/MM/YYYY)
    lot: null,        // Numéro de lot
    serial: null,     // Numéro de série
    raw: rawString || ''
  };

  if (!rawString || typeof rawString !== 'string') return result;

  // 1. Normalisation des séparateurs FNC1 / GS (ASCII 29 -> ])
  const cleaned = rawString.replace(/[\u001d\u001e\u0004]/g, ']');

  // 2. Extraction GTIN / CIP (IA 01 : 14 chiffres fixes)
  const matchCip = cleaned.match(/01(\d{14})/);
  if (matchCip) {
    result.gtin = matchCip[1];
    // Extraction du CIP13 (suppression du premier '0' de l'EAN-14)
    result.cip = matchCip[1].startsWith('0') ? matchCip[1].substring(1) : matchCip[1];
  }

  // 3. Extraction Date de Péremption (IA 17 : 6 chiffres fixes AAMMJJ)
  const matchExp = cleaned.match(/17(\d{6})/);
  if (matchExp) {
    const rawDate = matchExp[1];
    const aa = rawDate.substring(0, 2);
    const mm = rawDate.substring(2, 4);
    let jj = rawDate.substring(4, 6);

    const year = parseInt(`20${aa}`, 10);
    const month = parseInt(mm, 10);

    // Si le jour vaut "00", GS1 spécifie le dernier jour du mois
    if (jj === '00') {
      const lastDay = new Date(year, month, 0).getDate();
      jj = String(lastDay).padStart(2, '0');
    }

    result.exp = `${year}-${mm.padStart(2, '0')}-${jj}`;
    result.expFr = `${jj}/${mm.padStart(2, '0')}/${year}`;
  }

  // 4. Extraction Numéro de Lot (IA 10 : longueur variable jusqu'à 20 char, s'arrête au FNC1 ']')
  const matchLot = cleaned.match(/10([^\^\]]+)/);
  if (matchLot) {
    result.lot = matchLot[1].trim();
  }

  // 5. Extraction Numéro de Série (IA 21 : longueur variable jusqu'à 20 char, s'arrête au FNC1 ']')
  const matchSerial = cleaned.match(/21([^\^\]]+)/);
  if (matchSerial) {
    result.serial = matchSerial[1].trim();
  }

  return result;
}