const prisma = require('../prismaClient');

exports.getAll = async (req, res) => { 
  const stock = await prisma.stock.findMany({ where: { companyId: req.user.companyId },  include: { sales: true }, orderBy: { createdAt: 'desc' }  });
  res.json(stock.map(s => {
    let sold = 0;
    for (const sale of s.sales) sold += Number(sale.quantity || 0);
    return {
      id: s.id, name: s.name, quantity: s.quantity, unit_price: s.unitPrice,
      vendor_name: s.vendorName, vendor_phone: s.vendorPhone, vendor_address: s.vendorAddress,
      sold_stock: sold, remaining_stock: Number(s.quantity) - sold
    };
  }));
};

exports.create = async (req, res) => {
  try {
    const { name, quantity, unit_price, vendor_name, vendor_phone, vendor_address } = req.body;
    if (!name) return res.status(400).json({ detail: 'Stock name is required.' });
    
    // Auto-create/link vendor
    if (vendor_name && vendor_name.trim() !== '') {
      let existingParty = await prisma.party.findFirst({ where: { name: vendor_name.trim(), companyId: req.user.companyId } });
      if (!existingParty) {
        await prisma.party.create({ data: { companyId: req.user.companyId, name: vendor_name.trim(), partyType: 'vendor', phone: vendor_phone || '', address: vendor_address || '' } });
      } else if (existingParty.partyType !== 'vendor') {
        // Optionally update partyType to vendor if it was something else, but let's just leave it or update phone/address
        await prisma.party.update({ where: { id: existingParty.id }, data: { partyType: 'vendor' }});
      }
    }

    const s = await prisma.stock.create({ data: { companyId: req.user.companyId,  name, quantity: parseInt(quantity)||0, unitPrice: parseFloat(unit_price)||0, vendorName: vendor_name || '', vendorPhone: vendor_phone || '', vendorAddress: vendor_address || '' } });
    res.status(201).json({ id: s.id, name: s.name, quantity: s.quantity, unit_price: s.unitPrice, vendor_name: s.vendorName, vendor_phone: s.vendorPhone, vendor_address: s.vendorAddress });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const { name, quantity, unit_price, vendor_name, vendor_phone, vendor_address } = req.body;
    if (!name) return res.status(400).json({ detail: 'Stock name is required.' });
    const existing = await prisma.stock.findFirst({ where: { id: Number(req.params.id), companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ detail: 'Not found or unauthorized' });

    // Auto-create/link vendor
    if (vendor_name && vendor_name.trim() !== '') {
      let existingParty = await prisma.party.findFirst({ where: { name: vendor_name.trim(), companyId: req.user.companyId } });
      if (!existingParty) {
        await prisma.party.create({ data: { companyId: req.user.companyId, name: vendor_name.trim(), partyType: 'vendor', phone: vendor_phone || '', address: vendor_address || '' } });
      } else if (existingParty.partyType !== 'vendor') {
        await prisma.party.update({ where: { id: existingParty.id }, data: { partyType: 'vendor' }});
      }
    }

    const s = await prisma.stock.update({ where: { id: Number(req.params.id) }, data: { name, quantity: parseInt(quantity)||0, unitPrice: parseFloat(unit_price)||0, vendorName: vendor_name || '', vendorPhone: vendor_phone || '', vendorAddress: vendor_address || '' } });
    res.json({ id: s.id, name: s.name, quantity: s.quantity, unit_price: s.unitPrice, vendor_name: s.vendorName, vendor_phone: s.vendorPhone, vendor_address: s.vendorAddress });
  } catch (error) { res.status(400).json({ detail: error.message }); }
};

exports.remove = async (req, res) => { await prisma.stock.deleteMany({ where: { id: Number(req.params.id), companyId: req.user.companyId } }).catch(()=>{}); res.status(204).send(); };
