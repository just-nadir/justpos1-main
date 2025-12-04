const { db, notify } = require('../database.cjs');

module.exports = {
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  
  addCustomer: (c) => {
      const res = db.prepare('INSERT INTO customers (name, phone, type, value, balance, birthday, debt) VALUES (?, ?, ?, ?, ?, ?, 0)').run(c.name, c.phone, c.type, c.value, 0, c.birthday);
      notify('customers', null);
      return res;
  },
  
  deleteCustomer: (id) => {
      const res = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      notify('customers', null);
      return res;
  },

  getDebtors: () => db.prepare('SELECT * FROM customers WHERE debt > 0').all(),
  getDebtHistory: (id) => db.prepare('SELECT * FROM debt_history WHERE customer_id = ? ORDER BY id DESC').all(id),
  
  payDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    const updateDebt = db.transaction(() => {
      db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, customerId);
      db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'payment', date, comment);
    });
    const res = updateDebt();
    notify('customers', null);
    notify('debtors', null);
    return res;
  }
};