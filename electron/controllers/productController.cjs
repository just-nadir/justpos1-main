const { db, notify } = require('../database.cjs');

module.exports = {
  getCategories: () => db.prepare('SELECT * FROM categories').all(),
  
  addCategory: (name) => {
      const res = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      notify('products', null);
      return res;
  },

  getProducts: () => db.prepare(`
    SELECT p.*, c.name as category_name, k.name as kitchen_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN kitchens k ON p.destination = CAST(k.id AS TEXT)
  `).all(),
  
  addProduct: (p) => {
      const res = db.prepare('INSERT INTO products (category_id, name, price, destination, is_active) VALUES (?, ?, ?, ?, ?)').run(p.category_id, p.name, p.price, String(p.destination), 1);
      notify('products', null);
      return res;
  },
  
  toggleProductStatus: (id, status) => {
      const res = db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(status, id);
      notify('products', null);
      return res;
  },
  
  deleteProduct: (id) => {
      const res = db.prepare('DELETE FROM products WHERE id = ?').run(id);
      notify('products', null);
      return res;
  }
};