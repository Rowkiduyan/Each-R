import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public', 'samples');
const outFile = path.join(outDir, 'license-photocopy-sample.pdf');

fs.mkdirSync(outDir, { recursive: true });

const eol = '\n';

// A tiny, self-contained PDF with one page and a single line of text.
const streamText = [
  'BT',
  '/F1 24 Tf',
  '72 720 Td',
  '(Sample License Photocopy) Tj',
  'ET',
].join(eol) + eol;

const objects = [];
objects.push({
  id: 1,
  body: `<< /Type /Catalog /Pages 2 0 R >>`,
});
objects.push({
  id: 2,
  body: `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
});
objects.push({
  id: 3,
  body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> >>`,
});
objects.push({
  id: 4,
  body: `<< /Length ${Buffer.byteLength(streamText, 'utf8')} >>${eol}stream${eol}${streamText}endstream`,
});
objects.push({
  id: 5,
  body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
});

let pdf = `%PDF-1.4${eol}`;

// Record offsets for each object start.
const offsets = [0]; // xref entry for object 0
for (const obj of objects) {
  offsets[obj.id] = Buffer.byteLength(pdf, 'utf8');
  pdf += `${obj.id} 0 obj${eol}${obj.body}${eol}endobj${eol}`;
}

const xrefStart = Buffer.byteLength(pdf, 'utf8');

pdf += `xref${eol}`;
pdf += `0 ${objects.length + 1}${eol}`;

// Object 0 free entry
pdf += `0000000000 65535 f ${eol}`;

for (let i = 1; i <= objects.length; i++) {
  const off = offsets[i] ?? 0;
  const offStr = String(off).padStart(10, '0');
  pdf += `${offStr} 00000 n ${eol}`;
}

pdf += `trailer${eol}`;
pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>${eol}`;
pdf += `startxref${eol}`;
pdf += `${xrefStart}${eol}`;
pdf += `%%EOF${eol}`;

fs.writeFileSync(outFile, pdf, { encoding: 'utf8' });
console.log(`Wrote sample PDF: ${outFile}`);
