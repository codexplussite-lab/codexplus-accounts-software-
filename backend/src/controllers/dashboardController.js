const prisma = require('../prismaClient');

exports.getDashboard = async (req, res) => {
  try {
    const income = await prisma.transaction.aggregate({ where: { transactionType: 'income' }, _sum: { amount: true } });
    const expense = await prisma.transaction.aggregate({ where: { transactionType: 'expense' }, _sum: { amount: true } });
    const pendingDuesTotal = await prisma.duePayment.aggregate({ where: { status: 'pending' }, _sum: { amount: true } });
    
    // Get account summaries
    const accounts = await prisma.account.findMany();
    const account_summaries = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: acc.balance || 0
    }));

    // Get recent transactions
    const recent_transactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: { category: true }
    });

    // Get pending dues
    const pending_dues = await prisma.duePayment.findMany({
      where: { status: 'pending' },
      take: 5,
      orderBy: { dueDate: 'asc' },
      include: { party: true }
    });

    // Get last 6 months for periods chart
    const periods = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthYear = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const mIncome = await prisma.transaction.aggregate({
        where: { transactionType: 'income', date: { gte: start, lte: end } },
        _sum: { amount: true }
      });
      const mExpense = await prisma.transaction.aggregate({
        where: { transactionType: 'expense', date: { gte: start, lte: end } },
        _sum: { amount: true }
      });
      
      const inc = mIncome._sum.amount || 0;
      const exp = mExpense._sum.amount || 0;
      
      periods[monthYear] = {
        income: inc,
        expense: exp,
        balance: inc - exp
      };
    }

    res.json({
      totals: {
        income: income._sum.amount || 0,
        expense: expense._sum.amount || 0,
        pending_payable: pendingDuesTotal._sum.amount || 0,
        current_balance: (income._sum.amount || 0) - (expense._sum.amount || 0)
      },
      account_summaries,
      recent_transactions: recent_transactions.map(t => ({
        id: t.id,
        date: t.date,
        title: t.title,
        amount: t.amount,
        transaction_type: t.transactionType,
        category_name: t.category ? t.category.name : 'Uncategorized'
      })),
      pending_dues: pending_dues.map(d => ({
        id: d.id,
        dueDate: d.dueDate,
        amount: d.amount,
        party_name: d.party ? d.party.name : 'Unknown',
        due_type: d.dueType
      })),
      periods
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
