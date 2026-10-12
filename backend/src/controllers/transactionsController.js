
const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  try {
    const txs = await prisma.transaction.findMany({ where: { companyId: req.user.companyId },  include: { category: true, account: true, party: true }, orderBy: { date: 'desc' }  });
    res.json(txs.map(t => ({
      id: t.id, title: t.title, amount: t.amount, date: t.date, transaction_type: t.transactionType, payment_method: t.paymentMethod,
      category: t.category?.id || t.categoryId, account: t.account?.id || t.accountId, party: t.party?.id || t.partyId,
      notes: t.notes, reference_number: t.referenceNumber, attachment: t.attachment,
      category_name: t.category?.name, account_name: t.account?.name, party_name: t.party?.name
    })));
  } catch (error) {
    res.status(500).json({ detail: "GET ALL ERROR: " + String(error.message || error) });
  }
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) return res.status(400).json({ detail: 'Title is required.' });
    if (!d.category || isNaN(parseInt(d.category))) return res.status(400).json({ detail: 'Please select a valid Category.' });
    if (!d.account || isNaN(parseInt(d.account))) return res.status(400).json({ detail: 'Please select a valid Account.' });
    if (!d.amount || isNaN(parseFloat(d.amount))) return res.status(400).json({ detail: 'Amount must be a valid number.' });

    let parsedPartyId = null;
    if (d.party && d.party !== "" && !isNaN(parseInt(d.party))) {
      parsedPartyId = parseInt(d.party);
    }

    const t = await prisma.transaction.create({ data: { companyId: req.user.companyId,  
      title: d.title, amount: parseFloat(d.amount)||0, date: new Date(d.date || Date.now()), transactionType: d.transaction_type || 'expense', paymentMethod: d.payment_method||'cash',
      categoryId: parseInt(d.category), accountId: parseInt(d.account), partyId: parsedPartyId,
      notes: d.notes || '', referenceNumber: d.reference_number || '', attachment: d.attachment || null
    }});
    res.status(201).json({ id: t.id });
  } catch (error) { 
    console.error("CREATE ERROR", error);
    res.status(400).json({ detail: "CREATE ERROR: " + String(error.message || error) }); 
  }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) return res.status(400).json({ detail: 'Title is required.' });
    if (!d.category || isNaN(parseInt(d.category))) return res.status(400).json({ detail: 'Please select a valid Category.' });
    if (!d.account || isNaN(parseInt(d.account))) return res.status(400).json({ detail: 'Please select a valid Account.' });

    let parsedPartyId = null;
    if (d.party && d.party !== "" && !isNaN(parseInt(d.party))) {
      parsedPartyId = parseInt(d.party);
    }

    const existing = await prisma.transaction.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Not found or unauthorized' });
    const t = await prisma.transaction.update({ where: { id: Number(req.params.id) }, data: { 
      title: d.title, amount: parseFloat(d.amount)||0, date: new Date(d.date || Date.now()), transactionType: d.transaction_type || 'expense', paymentMethod: d.payment_method||'cash',
      categoryId: parseInt(d.category), accountId: parseInt(d.account), partyId: parsedPartyId,
      notes: d.notes || '', referenceNumber: d.reference_number || '', attachment: d.attachment || null
    }});
    res.json({ id: t.id });
  } catch (error) { 
    res.status(400).json({ detail: "UPDATE ERROR: " + String(error.message || error) }); 
  }
};

exports.remove = async (req, res) => { await prisma.transaction.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };
