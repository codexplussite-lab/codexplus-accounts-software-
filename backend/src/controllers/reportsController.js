const prisma = require('../prismaClient');

exports.getReports = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'asc' }
    });

    const by_date = transactions.map(t => ({
      date: t.date.toISOString().slice(0, 10),
      transaction_type: t.transactionType,
      total: t.amount
    }));

    res.json({ by_date });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
