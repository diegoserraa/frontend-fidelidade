import qrcode from 'qrcode-generator';

/**
 * Gera um SVG nítido do QR (data URI) a partir dos módulos calculados — sem
 * canvas e sem HTML de terceiros. `errorCorrectionLevel` 'M' é o equilíbrio
 * padrão; nível de tipo 0 = auto pelo tamanho do conteúdo.
 */
export function qrDataUri(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  let rects = '';
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) rects += `<rect x="${col}" y="${row}" width="1" height="1"/>`;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" shape-rendering="crispEdges">` +
    `<rect width="${count}" height="${count}" fill="#ffffff"/>` +
    `<g fill="#0b0b0b">${rects}</g>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Rasteriza o QR (SVG) em PNG — mais fácil de colar num documento/WhatsApp ou
 * mandar pra impressão do que um SVG. Usado só na hora de baixar (a tela usa
 * o SVG direto, que fica nítido em qualquer tamanho).
 */
export function qrPngDataUri(text: string, size = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível gerar a imagem do QR.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Não foi possível gerar a imagem do QR.'));
    img.src = qrDataUri(text);
  });
}

/** URL que o QR do balcão codifica — o app do cliente lê `?empresa=` e já vincula o cadastro a essa empresa. */
export function buildAppQrUrl(empresaId: string): string {
  return `${window.location.origin}/app?empresa=${empresaId}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Abre uma aba só com o QR (grande, pronto pra imprimir) e dispara o diálogo
 * de impressão do navegador assim que carrega. Janela separada — não a
 * própria tela do painel — pra não imprimir o resto da UI junto.
 */
export function printQrWindow(svgDataUri: string, titulo: string, subtitulo: string): boolean {
  const win = window.open('', '_blank', 'width=420,height=560');
  if (!win) return false;

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 48px 24px; margin: 0; }
  img { width: 300px; height: 300px; }
  h1 { font-size: 18px; margin: 24px 0 4px; }
  p { color: #555; font-size: 13px; margin: 0; }
</style>
</head>
<body>
  <img src="${svgDataUri}" alt="" />
  <h1>${escapeHtml(titulo)}</h1>
  <p>${escapeHtml(subtitulo)}</p>
</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
  return true;
}
