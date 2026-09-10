// /services/pdf/engines/pdf-lib-engine.js
export class PdfLibEngine {
    static async fillAndRender(pdfUrl, fieldData, options = {}) {
        if (!window.PDFLib) {
            throw new Error('[PdfLibEngine] PDFLib non chargé localement.');
        }

        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`[PdfLibEngine] Impossible de charger : ${pdfUrl}`);
        const buffer = await response.arrayBuffer();

        const { PDFDocument } = window.PDFLib;
        const pdfDoc = await PDFDocument.load(buffer);
        const form = pdfDoc.getForm();

        // Remplissage dynamique des champs AcroForm
        Object.entries(fieldData).forEach(([fieldName, value]) => {
            try {
                const field = form.getTextField(fieldName);
                if (field) field.setText(String(value ?? ''));
            } catch {
                console.warn(`[PdfLibEngine] Champ introuvable ou non-texte: ${fieldName}`);
            }
        });

        if (options.flatten !== false) {
            form.flatten();
        }

        const bytes = await pdfDoc.save();
        return new Blob([bytes], { type: 'application/pdf' });
    }
}