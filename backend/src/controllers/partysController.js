const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  const parties = await prisma.party.findMany({ where: { companyId: req.user.companyId },  orderBy: { createdAt: 'desc' }  });
  res.json(parties.map(p => ({
    id: p.id, name: p.name, party_type: p.partyType, phone: p.phone, email: p.email, address: p.address, notes: p.notes
  })));
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Party name is required.' });
    const p = await prisma.party.create({ data: { companyId: req.user.companyId,  name: d.name, partyType: d.party_type || 'other', phone: d.phone || '', email: d.email || '', address: d.address || '', notes: d.notes || '' }});
    res.status(201).json({ id: p.id, name: p.name, party_type: p.partyType, phone: p.phone, email: p.email, address: p.address, notes: p.notes });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Party name is required.' });
    const existing = await prisma.party.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Not found or unauthorized' });
    const p = await prisma.party.update({ where: { id: Number(req.params.id) }, data: { name: d.name, partyType: d.party_type || 'other', phone: d.phone || '', email: d.email || '', address: d.address || '', notes: d.notes || '' }});
    res.json({ id: p.id, name: p.name, party_type: p.partyType, phone: p.phone, email: p.email, address: p.address, notes: p.notes });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.remove = async (req, res) => { await prisma.party.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };

exports.getHistory = async (req, res) => {
  try {
    const partyId = Number(req.params.id);
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ detail: "Party not found" });

    const transactions = await prisma.transaction.findMany({
      where: { companyId: req.user.companyId,  partyId },
      include: { category: true, account: true },
      orderBy: { date: 'desc' }
    });
    const dues = await prisma.duePayment.findMany({
      where: { companyId: req.user.companyId,  partyId },
      orderBy: { dueDate: 'desc' }
    });
    const sales = await prisma.sale.findMany({
      where: { companyId: req.user.companyId, customerName: party.name },
      include: { stock: true },
      orderBy: { date: 'desc' }
    });
    const suppliedStock = await prisma.stock.findMany({
      where: { companyId: req.user.companyId, vendorName: party.name },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      transactions: transactions.map(t => ({
        id: t.id, title: t.title, amount: t.amount, date: t.date, transaction_type: t.transactionType,
        category_name: t.category?.name, account_name: t.account?.name
      })),
      dues: dues.map(d => ({
        id: d.id, title: d.title, amount: d.amount, due_date: d.dueDate, status: d.status, due_type: d.dueType
      })),
      sales: sales.map(s => ({
        id: s.id, date: s.date, quantity: s.quantity, salePrice: s.salePrice, totalPrice: s.totalPrice, stock_name: s.stock?.name || 'Unknown Item'
      })),
      suppliedStock: suppliedStock.map(s => ({
        id: s.id, name: s.name, quantity: s.quantity, unit_price: s.unitPrice, date: s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};
