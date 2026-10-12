const prisma = require('../prismaClient');

exports.getAll = async (req, res) => {
  try {
    const records = await prisma.note.findMany({ where: { companyId: req.user.companyId }, 
      orderBy: { createdAt: 'desc' }
     });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = req.body;
    const record = await prisma.note.create({ data });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const record = await prisma.note.update({
      where: { id: Number(id) },
      data
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.note.deleteMany({ where: { id: Number(id), companyId: req.user.companyId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};
