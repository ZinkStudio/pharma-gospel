/**
 * Utilitaires d'export et manipulation de Blobs pour pharma-gospel
 */

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename = 'document.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Vérifie si la Web Share API est disponible pour partager des fichiers
 * @param {Blob} blob 
 * @param {string} filename 
 * @returns {boolean}
 */
export function canShareFiles(blob, filename = 'document.pdf') {
  if (!navigator.share || !navigator.canShare) return false;
  const file = new File([blob], filename, { type: blob.type });
  return navigator.canShare({ files: [file] });
}

/**
 * Partage un fichier Blob via le menu natif du système (mobile / tablette)
 * @param {Blob} blob 
 * @param {string} filename 
 * @param {string} title 
 */
export async function shareBlob(blob, filename = 'document.pdf', title = 'Document Pharma') {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title,
      files: [file]
    });
  } else {
    // Fallback automatique sur le téléchargement classique si non supporté
    downloadBlob(blob, filename);
  }
}