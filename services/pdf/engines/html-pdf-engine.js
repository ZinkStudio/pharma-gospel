// /services/pdf/engines/html-pdf-engine.js
export class HtmlPdfEngine {
    static async renderToBlob(element, options = {}) {
        if (!window.html2pdf) {
            throw new Error('[HtmlPdfEngine] html2pdf bundle non chargé localement.');
        }

        const sandbox = document.createElement('div');
        Object.assign(sandbox.style, {
            position: 'fixed', top: '0', left: '0', width: '210mm',
            background: 'white', opacity: '0', zIndex: '-1', pointerEvents: 'none'
        });

        const targetNode = typeof element === 'string' 
            ? new DOMParser().parseFromString(element, 'text/html').body.firstChild 
            : element.cloneNode(true);

        sandbox.appendChild(targetNode);
        document.body.appendChild(sandbox);

        const config = {
            margin: options.margin ?? 0,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#fff', scrollY: 0 },
            jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' }
        };

        try {
            await new Promise(r => setTimeout(r, 150)); // Attente du rendu du DOM / CSS
            const pdfWorker = window.html2pdf().set(config).from(sandbox.firstChild);
            return await pdfWorker.output('blob');
        } finally {
            sandbox.remove();
        }
    }

    static async buildGridDOM(items, { columns = 4, rows = 6, itemRenderer }) {
        const container = document.createElement('div');
        container.className = 'pdf-grid-container';

        const itemsPerPage = columns * rows;
        let currentPage = null;

        items.forEach((item, index) => {
            if (index % itemsPerPage === 0) {
                currentPage = document.createElement('div');
                currentPage.className = 'pdf-page-grid';
                Object.assign(currentPage.style, {
                    display: 'grid',
                    width: '210mm',
                    height: '297mm',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    pageBreakAfter: 'always',
                    boxSizing: 'border-box',
                    padding: '5mm'
                });
                container.appendChild(currentPage);
            }
            const itemNode = itemRenderer(item);
            currentPage.appendChild(itemNode);
        });

        return container;
    }
}