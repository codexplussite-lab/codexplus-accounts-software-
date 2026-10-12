
const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  const categories = await prisma.category.findMany({ where: { companyId: req.user.companyId }, orderBy: { createdAt: 'desc' } });
  res.json(categories.map(c => ({
    id: c.id, name: c.name, category_type: c.categoryType, color: c.color
  })));
};

exports.create = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Category name is required.' });
    const c = await prisma.category.create({ data: { companyId: req.user.companyId, name: d.name, categoryType: d.category_type || 'expense', color: d.color || '#000000' }});
    res.status(201).json({ id: c.id, name: c.name, category_type: c.categoryType, color: c.color });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ detail: 'Category name is required.' });
    
    const existing = await prisma.category.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Category not found' });

    const c = await prisma.category.update({ where: { id: Number(req.params.id) }, data: { name: d.name, categoryType: d.category_type || 'expense', color: d.color || '#000000' }});
    res.json({ id: c.id, name: c.name, category_type: c.categoryType, color: c.color });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.remove = async (req, res) => { await prisma.category.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };
