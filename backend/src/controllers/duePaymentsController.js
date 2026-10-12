
const prisma = require('../prismaClient');

exports.getAll = async (req, res) => {
  try {
    const records = await prisma.duePayment.findMany({ where: { companyId: req.user.companyId }, 
      include: { party: true },
      orderBy: { createdAt: 'desc' }
     });
    res.json(records.map(d => ({
      id: d.id, title: d.title, due_type: d.dueType, amount: d.amount, 
      due_date: d.dueDate, status: d.status, notes: d.notes,
      party: d.party?.id || d.partyId, party_name: d.party?.name
    })));
  } catch (error) {
    res.status(500).json({ detail: "GET ALL DUES ERROR: " + String(error.message || error) });
  }
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) return res.status(400).json({ detail: 'Title is required.' });
    if (!d.amount || isNaN(parseFloat(d.amount))) return res.status(400).json({ detail: 'Amount must be a valid number.' });

    let parsedPartyId = null;
    if (d.party && d.party !== "" && !isNaN(parseInt(d.party))) {
      parsedPartyId = parseInt(d.party);
    }

    const record = await prisma.duePayment.create({ data: { companyId: req.user.companyId, 
        title: d.title,
        amount: parseFloat(d.amount) || 0,
        dueDate: new Date(d.due_date || Date.now()),
        dueType: d.due_type || 'payable',
        status: d.status || 'pending',
        partyId: parsedPartyId,
        notes: d.notes || ''
      }
    });
    res.status(201).json({ id: record.id });
  } catch (error) {
    res.status(400).json({ detail: "CREATE DUE ERROR: " + String(error.message || error) });
  }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) return res.status(400).json({ detail: 'Title is required.' });

    let parsedPartyId = null;
    if (d.party && d.party !== "" && !isNaN(parseInt(d.party))) {
      parsedPartyId = parseInt(d.party);
    }

    const existing = await prisma.duePayment.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Not found or unauthorized' });
    const record = await prisma.duePayment.update({
      where: { id: Number(req.params.id) },
      data: {
        title: d.title,
        amount: parseFloat(d.amount) || 0,
        dueDate: new Date(d.due_date || Date.now()),
        dueType: d.due_type || 'payable',
        status: d.status || 'pending',
        partyId: parsedPartyId,
        notes: d.notes || ''
      }
    });
    res.json({ id: record.id });
  } catch (error) {
    res.status(400).json({ detail: "UPDATE DUE ERROR: " + String(error.message || error) });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.duePayment.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};
