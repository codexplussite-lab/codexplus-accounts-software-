const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  const sales = await prisma.sale.findMany({ where: { companyId: req.user.companyId },  include: { stock: true, account: true }, orderBy: { date: 'desc' }  });
  res.json(sales.map(s => ({
    id: s.id, quantity: s.quantity, sale_price: s.salePrice, total_price: s.totalPrice, date: s.date,
    notes: s.notes, customer_name: s.customerName, customer_phone: s.customerPhone, customer_address: s.customerAddress,
    stock: s.stock?.id || s.stockId, account: s.account?.id || s.accountId,
    stock_name: s.stock?.name, account_name: s.account?.name
  })));
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.stock || isNaN(parseInt(d.stock))) return res.status(400).json({ detail: 'Please select a valid Stock Item.' });
    if (!d.account || isNaN(parseInt(d.account))) return res.status(400).json({ detail: 'Please select a valid Account to receive payment.' });
    if (!d.quantity || isNaN(parseInt(d.quantity))) return res.status(400).json({ detail: 'Quantity must be a valid number.' });

    // Auto-create Party if customer_name is provided
    let partyId = null;
    if (d.customer_name && d.customer_name.trim() !== '') {
      let existingParty = await prisma.party.findFirst({ where: { name: d.customer_name.trim(), companyId: req.user.companyId } });
      if (!existingParty) {
        existingParty = await prisma.party.create({ data: { companyId: req.user.companyId, 
            name: d.customer_name.trim(),
            partyType: 'customer',
            phone: d.customer_phone || '',
            address: d.customer_address || ''
          }
        });
      }
      partyId = existingParty.id;
    }

    // Find or create 'Sales' category
    let salesCategory = await prisma.category.findFirst({ where: { name: 'Sales', categoryType: 'income', companyId: req.user.companyId } });
    if (!salesCategory) {
      salesCategory = await prisma.category.create({ data: { name: 'Sales', categoryType: 'income', companyId: req.user.companyId } });
    }

    const totalPrice = (parseInt(d.quantity)||0) * (parseFloat(d.sale_price)||0);
    const date = new Date(d.date || Date.now());

    // Create the Transaction
    const transaction = await prisma.transaction.create({
      data: {
        companyId: req.user.companyId,
        title: `Sale - ${d.customer_name || 'Walk-in'}`,
        amount: totalPrice,
        date: date,
        transactionType: 'income',
        paymentMethod: 'cash',
        categoryId: salesCategory.id,
        accountId: parseInt(d.account),
        partyId: partyId,
        notes: d.notes || ''
      }
    });

    const s = await prisma.sale.create({ data: { companyId: req.user.companyId,  
      quantity: parseInt(d.quantity)||0, salePrice: parseFloat(d.sale_price)||0, totalPrice: totalPrice,
      date: date, notes: d.notes || '', customerName: d.customer_name || '', customerPhone: d.customer_phone || '', customerAddress: d.customer_address || '',
      stockId: parseInt(d.stock), accountId: parseInt(d.account), transactionId: transaction.id
    }});
    res.status(201).json({ id: s.id });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.stock || isNaN(parseInt(d.stock))) return res.status(400).json({ detail: 'Please select a valid Stock Item.' });
    if (!d.account || isNaN(parseInt(d.account))) return res.status(400).json({ detail: 'Please select a valid Account to receive payment.' });

    // Auto-create Party if customer_name is provided
    if (d.customer_name && d.customer_name.trim() !== '') {
      const existingParty = await prisma.party.findFirst({ where: { name: d.customer_name.trim(), companyId: req.user.companyId } });
      if (!existingParty) {
        await prisma.party.create({ data: { companyId: req.user.companyId, 
            name: d.customer_name.trim(),
            partyType: 'customer',
            phone: d.customer_phone || '',
            address: d.customer_address || ''
          }
        });
      }
    }
    
    const existing = await prisma.sale.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Not found or unauthorized' });
    const s = await prisma.sale.update({ where: { id: Number(req.params.id) }, data: { 
      quantity: parseInt(d.quantity)||0, salePrice: parseFloat(d.sale_price)||0, totalPrice: (parseInt(d.quantity)||0) * (parseFloat(d.sale_price)||0),
      date: new Date(d.date || Date.now()), notes: d.notes || '', customerName: d.customer_name || '', customerPhone: d.customer_phone || '', customerAddress: d.customer_address || '',
      stockId: parseInt(d.stock), accountId: parseInt(d.account)
    }});
    res.json({ id: s.id });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.remove = async (req, res) => { await prisma.sale.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };
