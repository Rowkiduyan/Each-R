// Shared PDF branding helpers for jsPDF exports (lists, reports)
// Keeps exports consistent with the Each-R UI aesthetic.

export const EACHR_PDF_THEME = {
  brandRgb: [127, 29, 29], // Tailwind-ish red-900
  lightRgb: [248, 250, 252],
  textRgb: [15, 23, 42],
  mutedRgb: [71, 85, 105],
  borderRgb: [226, 232, 240],
};

export function buildEachRPdfPageHooks({
  title,
  subtitle,
  leftMetaLines = [],
  rightMetaLines = [],
} = {}) {
  const totalPagesExp = '{total_pages_count_string}';

  const didDrawPage = (doc) => {
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header background bar
    doc.setFillColor(...EACHR_PDF_THEME.brandRgb);
    doc.rect(0, 0, pageWidth, 56, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(String(title || 'Report'), 28, 30);

    // Subtitle
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(245, 245, 245);
      doc.text(String(subtitle), 28, 46);
    }

    // Meta lines under header
    const metaTop = 70;
    const leftLines = (Array.isArray(leftMetaLines) ? leftMetaLines : []).filter(Boolean).slice(0, 3);
    const rightLines = (Array.isArray(rightMetaLines) ? rightMetaLines : []).filter(Boolean).slice(0, 3);

    doc.setFontSize(9);
    doc.setTextColor(...EACHR_PDF_THEME.mutedRgb);

    leftLines.forEach((line, i) => {
      doc.text(String(line), 28, metaTop + i * 12);
    });

    rightLines.forEach((line, i) => {
      doc.text(String(line), pageWidth - 28, metaTop + i * 12, { align: 'right' });
    });

    // Footer
    doc.setDrawColor(...EACHR_PDF_THEME.borderRgb);
    doc.setLineWidth(1);
    doc.line(28, pageHeight - 36, pageWidth - 28, pageHeight - 36);

    doc.setFontSize(9);
    doc.setTextColor(...EACHR_PDF_THEME.mutedRgb);
    doc.text('Each-R', 28, pageHeight - 18);

    doc.text(`Page ${pageNumber} of ${totalPagesExp}`, pageWidth - 28, pageHeight - 18, { align: 'right' });

    doc.setTextColor(0, 0, 0);
  };

  return {
    totalPagesExp,
    didDrawPage,
  };
}

export function buildEachRAutoTableDefaults({
  title,
  subtitle,
  leftMetaLines,
  rightMetaLines,
} = {}) {
  const { totalPagesExp, didDrawPage } = buildEachRPdfPageHooks({
    title,
    subtitle,
    leftMetaLines,
    rightMetaLines,
  });

  return {
    totalPagesExp,
    // Give room for header + meta lines
    margin: { top: 110, left: 28, right: 28, bottom: 48 },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      textColor: EACHR_PDF_THEME.textRgb,
      lineColor: EACHR_PDF_THEME.borderRgb,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: EACHR_PDF_THEME.brandRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: EACHR_PDF_THEME.lightRgb,
    },
    didDrawPage: (data) => {
      // data.doc is the active jsPDF instance
      didDrawPage(data.doc);
    },
  };
}
