const prisma = require('../prismaClient');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const PR_WATERMARK_FULL = 'App Developed and Updated by: CODEX PLUS (https://codexplus.site/) | Call us: +923253315524 | Email us: info@codexplus.site';

// Helper to format currency in PKR
function formatMoney(amount) {
  const num = parseFloat(amount || 0);
  return 'Rs. ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to format dates cleanly
function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch (e) {
    return String(d);
  }
}

/**
 * Reusable PDF Report Builder
 */
function buildExecutivePdf(res, options) {
  const {
    filename,
    businessName = 'Codex Plus Accounts',
    address = '',
    phone = '',
    email = '',
    logoBase64 = null,
    reportTitle = 'Executive Financial Report',
    periodText = 'All Records',
    kpis = [],
    columns = [],
    rows = [],
    totalsRow = null,
    extraSummary = null
  } = options;

  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `${businessName} - ${reportTitle}`,
      Author: 'CODEX PLUS Enterprise Engine',
      Subject: reportTitle
    }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  const drawPageHeader = (isFirstPage) => {
    // Top primary accent bar
    doc.save();
    doc.rect(margin, margin, contentWidth, 3).fill('#0f172a');
    doc.restore();

    if (isFirstPage) {
      let currentY = margin + 12;
      let logoDrawn = false;

      if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.startsWith('data:image')) {
        try {
          const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, margin, currentY, { fit: [95, 42] });
          logoDrawn = true;
        } catch (e) {
          logoDrawn = false;
        }
      }

      const textStartX = logoDrawn ? margin + 105 : margin;
      const textMaxWidth = 240;

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a')
        .text(businessName, textStartX, currentY, { width: textMaxWidth, lineBreak: true });

      const details = [];
      if (address) details.push(address);
      if (phone) details.push(`Tel: ${phone}`);
      if (email) details.push(`Email: ${email}`);

      if (details.length > 0) {
        doc.font('Helvetica').fontSize(8).fillColor('#475569')
          .text(details.join(' | '), textStartX, doc.y + 2, { width: textMaxWidth });
      }

      // Right Side Report Badge
      const badgeWidth = 175;
      const badgeX = pageWidth - margin - badgeWidth;
      const badgeY = currentY;

      doc.save();
      doc.roundedRect(badgeX, badgeY, badgeWidth, 24, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a')
        .text(reportTitle.toUpperCase(), badgeX, badgeY + 7, { width: badgeWidth, align: 'center' });

      const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`Generated: ${dateStr}`, badgeX, badgeY + 28, { width: badgeWidth, align: 'right' });

      if (periodText) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
          .text(`Filter: ${periodText}`, badgeX, badgeY + 38, { width: badgeWidth, align: 'right' });
      }

      const dividerY = Math.max(doc.y + 10, currentY + 54);
      doc.save();
      doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, dividerY).lineTo(pageWidth - margin, dividerY).stroke();
      doc.restore();

      return dividerY + 10;
    } else {
      // Subsequent page mini header
      const miniY = margin + 8;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text(`${businessName.toUpperCase()} — ${reportTitle.toUpperCase()}`, margin, miniY);
      doc.save();
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(margin, miniY + 14).lineTo(pageWidth - margin, miniY + 14).stroke();
      doc.restore();
      return miniY + 22;
    }
  };

  let curY = drawPageHeader(true);

  // Draw KPI Summary Cards
  if (kpis && kpis.length > 0) {
    const cardGap = 8;
    const numCards = kpis.length;
    const totalGaps = (numCards - 1) * cardGap;
    const cardWidth = (contentWidth - totalGaps) / numCards;
    const cardHeight = 36;

    kpis.forEach((kpi, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);
      const cardY = curY;

      doc.save();
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b')
        .text(kpi.label.toUpperCase(), cardX + 8, cardY + 6, { width: cardWidth - 16, lineBreak: false });

      const valColor = kpi.tone === 'success' ? '#15803d' : (kpi.tone === 'danger' ? '#b91c1c' : '#0f172a');
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(valColor)
        .text(String(kpi.value), cardX + 8, cardY + 17, { width: cardWidth - 16, lineBreak: false });
    });

    curY += cardHeight + 14;
  }

  // Draw Table
  const tableHeaderHeight = 20;
  const tableRowHeight = 18;

  const drawTableHeader = (y) => {
    doc.save();
    doc.rect(margin, y, contentWidth, tableHeaderHeight).fill('#1e293b');
    doc.restore();

    let curColX = margin;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');

    columns.forEach(col => {
      const paddingX = 4;
      doc.text(
        col.header.toUpperCase(),
        curColX + paddingX,
        y + 6,
        { width: col.width - (paddingX * 2), align: col.align || 'left', lineBreak: false }
      );
      curColX += col.width;
    });

    return y + tableHeaderHeight;
  };

  curY = drawTableHeader(curY);

  // Table Data Rows
  rows.forEach((row, rowIndex) => {
    if (curY + tableRowHeight > pageHeight - 55) {
      doc.addPage();
      curY = drawPageHeader(false);
      curY = drawTableHeader(curY);
    }

    const isEven = rowIndex % 2 === 0;
    doc.save();
    doc.rect(margin, curY, contentWidth, tableRowHeight).fill(isEven ? '#ffffff' : '#f8fafc');
    doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(margin, curY + tableRowHeight).lineTo(pageWidth - margin, curY + tableRowHeight).stroke();
    doc.restore();

    let curColX = margin;

    columns.forEach(col => {
      const cellVal = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '';
      const paddingX = 4;

      if (col.isBold) doc.font('Helvetica-Bold');
      else doc.font('Helvetica');

      if (col.colorKey && row[col.colorKey]) {
        doc.fillColor(row[col.colorKey]);
      } else {
        doc.fillColor('#334155');
      }

      doc.fontSize(7.5).text(
        cellVal,
        curColX + paddingX,
        curY + 5,
        { width: col.width - (paddingX * 2), align: col.align || 'left', lineBreak: false }
      );
      curColX += col.width;
    });

    curY += tableRowHeight;
  });

  // Totals Row
  if (totalsRow) {
    if (curY + 22 > pageHeight - 55) {
      doc.addPage();
      curY = drawPageHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.save();
    doc.rect(margin, curY, contentWidth, 22).fill('#f1f5f9');
    doc.strokeColor('#0f172a').lineWidth(1.2).moveTo(margin, curY).lineTo(pageWidth - margin, curY).stroke();
    doc.strokeColor('#0f172a').lineWidth(0.75).moveTo(margin, curY + 20).lineTo(pageWidth - margin, curY + 20).stroke();
    doc.strokeColor('#0f172a').lineWidth(0.75).moveTo(margin, curY + 22).lineTo(pageWidth - margin, curY + 22).stroke();
    doc.restore();

    let curColX = margin;
    columns.forEach(col => {
      const val = totalsRow[col.key] !== undefined ? String(totalsRow[col.key]) : '';
      const paddingX = 4;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
      if (val) {
        doc.text(
          val,
          curColX + paddingX,
          curY + 6,
          { width: col.width - (paddingX * 2), align: col.align || 'left', lineBreak: false }
        );
      }
      curColX += col.width;
    });

    curY += 26;
  }

  // Extra summary (e.g. Net Cash Balance)
  if (extraSummary) {
    if (curY + 20 > pageHeight - 55) {
      doc.addPage();
      curY = drawPageHeader(false);
    }
    const boxW = 210;
    const boxX = margin + contentWidth - boxW;
    doc.save();
    doc.roundedRect(boxX, curY, boxW, 20, 3).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
      .text(extraSummary.label, boxX + 8, curY + 6, { width: 105, align: 'left' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(extraSummary.color || '#0f172a')
      .text(extraSummary.value, boxX + 110, curY + 6, { width: 92, align: 'right' });
    curY += 24;
  }

  // Official On-Page PR Certification Box
  const prBoxHeight = 36;
  if (curY + prBoxHeight + 35 <= pageHeight) {
    curY += 12;
    doc.save();
    doc.roundedRect(margin, curY, contentWidth, prBoxHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.rect(margin, curY, 3.5, prBoxHeight).fill('#0f172a');
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a')
      .text('App Developed and Updated by: CODEX PLUS (https://codexplus.site/)', margin + 12, curY + 7, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.2).fillColor('#475569')
      .text('Call us: +923253315524  •  Email us: info@codexplus.site  •  Custom Enterprise Software Solutions', margin + 12, curY + 20, { lineBreak: false });
    curY += prBoxHeight;
  }

  // Footer & Watermark loop over buffered pages
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);

    // CRITICAL: Disable bottom margin so writing the footer NEVER triggers an unwanted blank page
    doc.page.margins.bottom = 0;

    doc.save();
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(margin, pageHeight - 25).lineTo(pageWidth - margin, pageHeight - 25).stroke();
    doc.restore();

    doc.font('Helvetica').fontSize(6.8).fillColor('#64748b').text(
      PR_WATERMARK_FULL,
      margin,
      pageHeight - 18,
      { width: 440, lineBreak: false }
    );

    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(
      `Page ${i + 1} of ${pageRange.count}`,
      pageWidth - margin - 75,
      pageHeight - 18,
      { width: 75, align: 'right', lineBreak: false }
    );
  }

  doc.end();
}

/**
 * Reusable Excel Report Builder
 */
async function buildExecutiveExcel(res, options) {
  const {
    filename,
    sheetName = 'Report',
    businessName = 'Codex Plus Accounts',
    address = '',
    reportTitle = 'Executive Financial Report',
    periodText = 'All Records',
    kpis = [],
    columns = [],
    rows = [],
    totalsRow = null,
    extraSummary = null
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CODEX PLUS Enterprise Engine';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  const numCols = Math.max(columns.length, 6);
  const endColLetter = String.fromCharCode(65 + numCols - 1);

  // Row 1: Brand Banner
  worksheet.mergeCells(`A1:${endColLetter}1`);
  const r1 = worksheet.getCell('A1');
  r1.value = `  ${businessName.toUpperCase()} — ${reportTitle.toUpperCase()}`;
  r1.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  r1.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 30;

  // Row 2: Metadata Banner
  worksheet.mergeCells(`A2:${endColLetter}2`);
  const r2 = worksheet.getCell('A2');
  const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  r2.value = `  ${address ? address + ' | ' : ''}Scope: ${periodText} | Exported: ${dateStr}`;
  r2.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF94A3B8' } };
  r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  r2.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;
  let currentRowIdx = 4;

  // KPI Block
  if (kpis && kpis.length > 0) {
    const kpiRowLabels = worksheet.getRow(currentRowIdx);
    const kpiRowVals = worksheet.getRow(currentRowIdx + 1);
    kpiRowLabels.height = 18;
    kpiRowVals.height = 22;

    kpis.forEach((kpi, idx) => {
      if (idx < numCols) {
        const colLetter = String.fromCharCode(65 + idx);

        const cLabel = worksheet.getCell(`${colLetter}${currentRowIdx}`);
        cLabel.value = kpi.label.toUpperCase();
        cLabel.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
        cLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cLabel.alignment = { vertical: 'middle', horizontal: 'center' };
        cLabel.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        const cVal = worksheet.getCell(`${colLetter}${currentRowIdx + 1}`);
        cVal.value = kpi.value;
        const valColor = kpi.tone === 'success' ? 'FF16A34A' : (kpi.tone === 'danger' ? 'FFDC2626' : 'FF0F172A');
        cVal.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: valColor } };
        cVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cVal.alignment = { vertical: 'middle', horizontal: 'center' };
        cVal.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }
    });

    currentRowIdx += 2;
    worksheet.getRow(currentRowIdx).height = 10;
    currentRowIdx += 1;
  }

  // Table Headers
  const headerRowIdx = currentRowIdx;
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.height = 24;

  columns.forEach((col, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    const cell = worksheet.getCell(`${colLetter}${headerRowIdx}`);
    cell.value = col.header.toUpperCase();
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF1E293B' } }
    };
  });

  currentRowIdx += 1;

  // Data Rows
  rows.forEach((row, rIdx) => {
    const dataRow = worksheet.getRow(currentRowIdx);
    dataRow.height = 20;
    const isEven = rIdx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    columns.forEach((col, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const cell = worksheet.getCell(`${colLetter}${currentRowIdx}`);
      const val = row[col.key];
      cell.value = (val === undefined || val === null) ? '' : val;

      cell.font = {
        name: 'Segoe UI',
        size: 9,
        bold: !!col.isBold,
        color: { argb: 'FF334155' }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (col.numFmt && typeof val === 'number') {
        cell.numFmt = col.numFmt;
      }
    });

    currentRowIdx += 1;
  });

  // Totals Row
  if (totalsRow) {
    const totRow = worksheet.getRow(currentRowIdx);
    totRow.height = 22;

    columns.forEach((col, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const cell = worksheet.getCell(`${colLetter}${currentRowIdx}`);
      const val = totalsRow[col.key];
      cell.value = (val === undefined || val === null) ? '' : val;

      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (col.numFmt && typeof val === 'number') {
        cell.numFmt = col.numFmt;
      }
    });

    currentRowIdx += 1;
  }

  // Extra Summary (Net Balance)
  if (extraSummary) {
    worksheet.getRow(currentRowIdx).height = 8;
    currentRowIdx += 1;

    const lastColLetter = String.fromCharCode(65 + columns.length - 1);
    const secondLastColLetter = String.fromCharCode(65 + columns.length - 2);

    const labelCell = worksheet.getCell(`${secondLastColLetter}${currentRowIdx}`);
    labelCell.value = extraSummary.label;
    labelCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const valCell = worksheet.getCell(`${lastColLetter}${currentRowIdx}`);
    valCell.value = extraSummary.numericValue !== undefined ? extraSummary.numericValue : extraSummary.value;
    valCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: extraSummary.color || 'FF0F172A' } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    valCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valCell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
    if (typeof valCell.value === 'number') {
      valCell.numFmt = '"Rs. "#,##0.00';
    }

    currentRowIdx += 1;
  }

  // Spacing
  worksheet.getRow(currentRowIdx).height = 12;
  currentRowIdx += 1;

  // Permanent CODEX PLUS PR Row
  worksheet.mergeCells(`A${currentRowIdx}:${endColLetter}${currentRowIdx}`);
  const prCell = worksheet.getCell(`A${currentRowIdx}`);
  prCell.value = `  ${PR_WATERMARK_FULL}`;
  prCell.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF64748B' } };
  prCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  prCell.alignment = { vertical: 'middle', horizontal: 'center' };
  prCell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };
  worksheet.getRow(currentRowIdx).height = 20;

  // Auto-fit Column Widths
  columns.forEach((col, idx) => {
    let maxLen = col.header.length;
    rows.forEach(r => {
      const v = r[col.key];
      if (v !== undefined && v !== null) {
        const str = typeof v === 'number' ? `Rs. ${v.toLocaleString('en-US')}` : String(v);
        if (str.length > maxLen) maxLen = str.length;
      }
    });
    const colWidth = Math.min(45, Math.max(col.width || 12, maxLen + 4));
    worksheet.getColumn(idx + 1).width = colWidth;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  return res.end();
}

/**
 * EXPORT TRANSACTIONS (PDF & EXCEL)
 */
exports.exportTransactions = async (req, res) => {
  try {
    const { type } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true }
    });

    const businessName = user?.company?.name || 'Codex Plus Accounts';
    const address = user?.company?.address || '';
    const phone = user?.company?.phone || '';
    const email = user?.username || '';
    const logoBase64 = user?.company?.logoBase64;

    // Filters
    const where = { companyId: user.companyId };
    if (req.query.type) where.transactionType = req.query.type;
    if (req.query.category) where.categoryId = parseInt(req.query.category);
    if (req.query.account) where.accountId = parseInt(req.query.account);
    if (req.query.payment_method) where.paymentMethod = req.query.payment_method;
    if (req.query.start || req.query.end) {
      where.date = {};
      if (req.query.start) where.date.gte = new Date(req.query.start);
      if (req.query.end) where.date.lte = new Date(`${req.query.end}T23:59:59.999Z`);
    }

    const txs = await prisma.transaction.findMany({
      where,
      include: { category: true, account: true, party: true },
      orderBy: { date: 'desc' }
    });

    // Metrics
    let totalDebit = 0;
    let totalCredit = 0;
    txs.forEach(t => {
      const amt = parseFloat(t.amount || 0);
      if (t.transactionType === 'expense') totalDebit += amt;
      else if (t.transactionType === 'income') totalCredit += amt;
    });
    const netBalance = totalCredit - totalDebit;

    const kpis = [
      { label: 'Total Entries', value: `${txs.length}` },
      { label: 'Total Credit (Inflow)', value: formatMoney(totalCredit), tone: 'success' },
      { label: 'Total Debit (Outflow)', value: formatMoney(totalDebit), tone: 'danger' },
      { label: 'Net Cash Balance', value: formatMoney(netBalance), tone: netBalance >= 0 ? 'success' : 'danger' }
    ];

    const columns = [
      { header: 'Date', key: 'date', width: 65, align: 'center' },
      { header: 'Title / Description', key: 'title', width: 145, align: 'left', isBold: true },
      { header: 'Category', key: 'category', width: 75, align: 'left' },
      { header: 'Account / Method', key: 'method', width: 68, align: 'left' },
      { header: 'Debit (Out)', key: 'debit', width: 85, align: 'right', numFmt: '"Rs. "#,##0.00' },
      { header: 'Credit (In)', key: 'credit', width: 85, align: 'right', numFmt: '"Rs. "#,##0.00' }
    ];

    if (type === 'excel') {
      const rows = txs.map(t => {
        const amt = parseFloat(t.amount || 0);
        return {
          date: formatDate(t.date),
          title: t.title + (t.party?.name ? ` (${t.party.name})` : ''),
          category: t.category?.name || '-',
          method: (t.account?.name || t.paymentMethod || '-').toUpperCase(),
          debit: t.transactionType === 'expense' ? amt : null,
          credit: t.transactionType === 'income' ? amt : null
        };
      });

      const totalsRow = {
        title: 'TOTALS',
        debit: totalDebit,
        credit: totalCredit
      };

      const extraSummary = {
        label: 'NET BALANCE:',
        value: formatMoney(netBalance),
        numericValue: netBalance,
        color: netBalance >= 0 ? 'FF16A34A' : 'FFDC2626'
      };

      return await buildExecutiveExcel(res, {
        filename: 'transactions-statement',
        sheetName: 'Ledger',
        businessName,
        address,
        reportTitle: 'Official Transactions Ledger',
        periodText: req.query.start || req.query.end ? `${req.query.start || 'Start'} to ${req.query.end || 'Now'}` : 'All Company Records',
        kpis,
        columns,
        rows,
        totalsRow,
        extraSummary
      });

    } else if (type === 'pdf') {
      const rows = txs.map(t => {
        const amt = parseFloat(t.amount || 0);
        return {
          date: formatDate(t.date),
          title: t.title + (t.party?.name ? ` (${t.party.name})` : ''),
          category: t.category?.name || '-',
          method: (t.account?.name || t.paymentMethod || '-').toUpperCase(),
          debit: t.transactionType === 'expense' ? formatMoney(amt) : '-',
          credit: t.transactionType === 'income' ? formatMoney(amt) : '-'
        };
      });

      const totalsRow = {
        title: 'TOTALS',
        debit: formatMoney(totalDebit),
        credit: formatMoney(totalCredit)
      };

      const extraSummary = {
        label: 'NET CASH BALANCE:',
        value: formatMoney(netBalance),
        color: netBalance >= 0 ? '#15803d' : '#b91c1c'
      };

      return buildExecutivePdf(res, {
        filename: 'transactions-statement',
        businessName,
        address,
        phone,
        email,
        logoBase64,
        reportTitle: 'Official Transactions Ledger',
        periodText: req.query.start || req.query.end ? `${req.query.start || 'Start'} to ${req.query.end || 'Now'}` : 'All Company Records',
        kpis,
        columns,
        rows,
        totalsRow,
        extraSummary
      });

    } else {
      return res.status(400).json({ error: 'Invalid export type. Must be excel or pdf.' });
    }
  } catch (error) {
    console.error('Export Transactions Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXPORT SALES (PDF & EXCEL)
 */
exports.exportSales = async (req, res) => {
  try {
    const { type } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true }
    });

    const businessName = user?.company?.name || 'Codex Plus Accounts';
    const address = user?.company?.address || '';
    const phone = user?.company?.phone || '';
    const email = user?.username || '';
    const logoBase64 = user?.company?.logoBase64;

    const sales = await prisma.sale.findMany({
      where: { companyId: user.companyId },
      include: { stock: true, account: true },
      orderBy: { date: 'desc' }
    });

    let totalRevenue = 0;
    let totalUnits = 0;
    sales.forEach(s => {
      const q = parseInt(s.quantity || 0);
      const tot = parseFloat(s.totalPrice || (q * parseFloat(s.salePrice || 0)) || 0);
      totalUnits += q;
      totalRevenue += tot;
    });
    const avgOrder = sales.length > 0 ? (totalRevenue / sales.length) : 0;

    const kpis = [
      { label: 'Total Sales Orders', value: `${sales.length}` },
      { label: 'Total Units Sold', value: `${totalUnits.toLocaleString('en-US')}` },
      { label: 'Gross Sales Revenue', value: formatMoney(totalRevenue), tone: 'success' },
      { label: 'Average Order Value', value: formatMoney(avgOrder) }
    ];

    const columns = [
      { header: 'Date', key: 'date', width: 65, align: 'center' },
      { header: 'Stock Item', key: 'stock', width: 140, align: 'left', isBold: true },
      { header: 'Customer', key: 'customer', width: 95, align: 'left' },
      { header: 'Qty', key: 'qty', width: 45, align: 'center', numFmt: '#,##0' },
      { header: 'Unit Price', key: 'price', width: 85, align: 'right', numFmt: '"Rs. "#,##0.00' },
      { header: 'Total Price', key: 'total', width: 93, align: 'right', numFmt: '"Rs. "#,##0.00' }
    ];

    if (type === 'excel') {
      const rows = sales.map(s => {
        const q = parseInt(s.quantity || 0);
        const p = parseFloat(s.salePrice || 0);
        const tot = parseFloat(s.totalPrice || (q * p) || 0);
        return {
          date: formatDate(s.date),
          stock: s.stock?.name || '-',
          customer: s.customerName || 'Walk-in Customer',
          qty: q,
          price: p,
          total: tot
        };
      });

      const totalsRow = {
        customer: 'TOTALS',
        qty: totalUnits,
        total: totalRevenue
      };

      return await buildExecutiveExcel(res, {
        filename: 'sales-statement',
        sheetName: 'Sales Ledger',
        businessName,
        address,
        reportTitle: 'Sales Performance & Revenue Audit',
        periodText: 'All Historical Sales',
        kpis,
        columns,
        rows,
        totalsRow
      });

    } else if (type === 'pdf') {
      const rows = sales.map(s => {
        const q = parseInt(s.quantity || 0);
        const p = parseFloat(s.salePrice || 0);
        const tot = parseFloat(s.totalPrice || (q * p) || 0);
        return {
          date: formatDate(s.date),
          stock: s.stock?.name || '-',
          customer: s.customerName || 'Walk-in Customer',
          qty: String(q),
          price: formatMoney(p),
          total: formatMoney(tot)
        };
      });

      const totalsRow = {
        customer: 'TOTAL SALES',
        qty: String(totalUnits),
        total: formatMoney(totalRevenue)
      };

      return buildExecutivePdf(res, {
        filename: 'sales-statement',
        businessName,
        address,
        phone,
        email,
        logoBase64,
        reportTitle: 'Sales Performance & Revenue Audit',
        periodText: 'All Historical Sales',
        kpis,
        columns,
        rows,
        totalsRow
      });

    } else {
      return res.status(400).json({ error: 'Invalid export type. Must be excel or pdf.' });
    }
  } catch (error) {
    console.error('Export Sales Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXPORT STOCK (PDF & EXCEL)
 */
exports.exportStock = async (req, res) => {
  try {
    const { type } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true }
    });

    const businessName = user?.company?.name || 'Codex Plus Accounts';
    const address = user?.company?.address || '';
    const phone = user?.company?.phone || '';
    const email = user?.username || '';
    const logoBase64 = user?.company?.logoBase64;

    const stock = await prisma.stock.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: 'asc' }
    });

    let totalQty = 0;
    let totalValuation = 0;
    let lowStockCount = 0;

    stock.forEach(s => {
      const q = parseInt(s.quantity || 0);
      const p = parseFloat(s.unitPrice || 0);
      totalQty += q;
      totalValuation += (q * p);
      if (q <= 5) lowStockCount++;
    });

    const kpis = [
      { label: 'Active SKUs', value: `${stock.length}` },
      { label: 'Stock On Hand', value: `${totalQty.toLocaleString('en-US')} units` },
      { label: 'Total Valuation', value: formatMoney(totalValuation), tone: 'success' },
      { label: 'Low Stock (< 5)', value: `${lowStockCount} items`, tone: lowStockCount > 0 ? 'danger' : 'success' }
    ];

    const columns = [
      { header: 'Item Name', key: 'name', width: 165, align: 'left', isBold: true },
      { header: 'Vendor / Supplier', key: 'vendor', width: 125, align: 'left' },
      { header: 'In Stock Qty', key: 'qty', width: 65, align: 'center', numFmt: '#,##0' },
      { header: 'Unit Price', key: 'price', width: 84, align: 'right', numFmt: '"Rs. "#,##0.00' },
      { header: 'Total Value', key: 'total', width: 84, align: 'right', numFmt: '"Rs. "#,##0.00' }
    ];

    if (type === 'excel') {
      const rows = stock.map(s => {
        const q = parseInt(s.quantity || 0);
        const p = parseFloat(s.unitPrice || 0);
        return {
          name: s.name,
          vendor: s.vendorName || 'General Stock',
          qty: q,
          price: p,
          total: q * p
        };
      });

      const totalsRow = {
        vendor: 'TOTAL VALUATION',
        qty: totalQty,
        total: totalValuation
      };

      return await buildExecutiveExcel(res, {
        filename: 'stock-inventory-audit',
        sheetName: 'Inventory',
        businessName,
        address,
        reportTitle: 'Stock Inventory Valuation Audit',
        periodText: 'Current Active Inventory',
        kpis,
        columns,
        rows,
        totalsRow
      });

    } else if (type === 'pdf') {
      const rows = stock.map(s => {
        const q = parseInt(s.quantity || 0);
        const p = parseFloat(s.unitPrice || 0);
        return {
          name: s.name,
          vendor: s.vendorName || 'General Stock',
          qty: String(q),
          price: formatMoney(p),
          total: formatMoney(q * p)
        };
      });

      const totalsRow = {
        vendor: 'TOTAL VALUATION',
        qty: String(totalQty),
        total: formatMoney(totalValuation)
      };

      return buildExecutivePdf(res, {
        filename: 'stock-inventory-audit',
        businessName,
        address,
        phone,
        email,
        logoBase64,
        reportTitle: 'Stock Inventory Valuation Audit',
        periodText: 'Current Active Inventory',
        kpis,
        columns,
        rows,
        totalsRow
      });

    } else {
      return res.status(400).json({ error: 'Invalid export type. Must be excel or pdf.' });
    }
  } catch (error) {
    console.error('Export Stock Error:', error);
    res.status(500).json({ error: error.message });
  }
};
