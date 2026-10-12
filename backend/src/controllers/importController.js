
const prisma = require('../prismaClient');
const exceljs = require('exceljs');
const fs = require('fs');

exports.importTransactions = async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    const transactions = [];

    const defaultAccount = await prisma.account.findFirst({ where: { companyId: req.user.companyId } });
    const defaultCategory = await prisma.category.findFirst({ where: { companyId: req.user.companyId, categoryType: 'expense' } });

    let headerRow = null;
    let titleCol = -1, amountCol = -1, dateCol = -1, typeCol = -1;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        headerRow = row;
        row.eachCell((cell, colNumber) => {
          const val = (cell.value || '').toString().toLowerCase();
          if (val.includes('title') || val.includes('detail')) titleCol = colNumber;
          if (val.includes('amount') || val.includes('price')) amountCol = colNumber;
          if (val.includes('date')) dateCol = colNumber;
          if (val.includes('type')) typeCol = colNumber;
        });
      } else {
        if (titleCol > -1 && amountCol > -1) {
          const title = row.getCell(titleCol).value;
          const amount = parseFloat(row.getCell(amountCol).value) || 0;
          const dateVal = row.getCell(dateCol > -1 ? dateCol : 1).value;
          const date = dateVal ? new Date(dateVal) : new Date();
          const typeVal = typeCol > -1 ? (row.getCell(typeCol).value || '').toString().toLowerCase() : 'expense';
          const type = typeVal.includes('income') ? 'income' : 'expense';

          if (title && amount) {
            transactions.push({
              title: title.toString(),
              amount: amount,
              date: date,
              transactionType: type,
              paymentMethod: 'cash',
              categoryId: defaultCategory?.id || 1,
              accountId: defaultAccount?.id || 1,
              companyId: req.user.companyId
            });
          }
        }
      }
    });

    if (transactions.length > 0) {
      await prisma.transaction.createMany({ data: transactions, skipDuplicates: true });
    }
    
    fs.unlinkSync(req.file.path);
    res.json({ success: true, importedCount: transactions.length });
  } catch (error) {
    if(req.file) fs.unlinkSync(req.file.path);
    console.error("IMPORT ERROR", error);
    res.status(500).json({ detail: 'Import failed: ' + String(error.message) });
  }
};

exports.importSales = async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    const sales = [];

    const defaultAccount = await prisma.account.findFirst({ where: { companyId: req.user.companyId } });
    const defaultStock = await prisma.stock.findFirst({ where: { companyId: req.user.companyId } });

    // Simple robust approach for sales
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
         const qty = parseInt(row.getCell(1).value) || 0;
         const price = parseFloat(row.getCell(2).value) || 0;
         if (qty > 0 && price > 0) {
           sales.push({
             quantity: qty,
             salePrice: price,
             totalPrice: qty * price,
             date: new Date(),
             stockId: defaultStock?.id || 1,
             accountId: defaultAccount?.id || 1,
             companyId: req.user.companyId
           });
         }
      }
    });

    if (sales.length > 0) {
      await prisma.sale.createMany({ data: sales, skipDuplicates: true });
    }
    fs.unlinkSync(req.file.path);
    res.json({ success: true, importedCount: sales.length });
  } catch (error) {
    if(req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ detail: 'Import failed: ' + String(error.message) });
  }
};

exports.importStock = async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    const stock = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
         const name = (row.getCell(1).value || '').toString();
         const qty = parseInt(row.getCell(2).value) || 0;
         const price = parseFloat(row.getCell(3).value) || 0;
         if (name) {
           stock.push({
             name: name,
             quantity: qty,
             unitPrice: price,
             companyId: req.user.companyId
           });
         }
      }
    });

    if (stock.length > 0) {
      await prisma.stock.createMany({ data: stock, skipDuplicates: true });
    }
    fs.unlinkSync(req.file.path);
    res.json({ success: true, importedCount: stock.length });
  } catch (error) {
    if(req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ detail: 'Import failed: ' + String(error.message) });
  }
};
