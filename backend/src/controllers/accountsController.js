
const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  const accounts = await prisma.account.findMany({ where: { companyId: req.user.companyId }, include: { transactions: true }, orderBy: { createdAt: 'desc' } });
  res.json(accounts.map(a => {
    let balance = Number(a.openingBalance || 0);
    for (const tx of a.transactions) {
      if (tx.transactionType === 'income') balance += Number(tx.amount);
      else balance -= Number(tx.amount);
    }
    return {
      id: a.id, name: a.name, account_type: a.accountType, opening_balance: a.openingBalance,
      current_balance: balance
    };
  }));
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Account name is required.' });
    const a = await prisma.account.create({ data: { 
      companyId: req.user.companyId, name: d.name, accountType: d.account_type || 'cash', openingBalance: parseFloat(d.opening_balance)||0
    }});
    res.status(201).json({ id: a.id, name: a.name, account_type: a.accountType, opening_balance: a.openingBalance, current_balance: a.openingBalance });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Account name is required.' });
    
    const existing = await prisma.account.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Account not found' });

    const a = await prisma.account.update({ where: { id: Number(req.params.id) }, data: { 
      name: d.name, accountType: d.account_type || 'cash', openingBalance: parseFloat(d.opening_balance)||0
    }});
    res.json({ id: a.id, name: a.name, account_type: a.accountType, opening_balance: a.openingBalance });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.remove = async (req, res) => { await prisma.account.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };
