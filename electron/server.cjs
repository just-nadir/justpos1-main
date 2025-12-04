const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const { onChange } = require('./database.cjs'); // Signal
const ip = require('ip');

// Controllerlar
const tableController = require('./controllers/tableController.cjs');
const productController = require('./controllers/productController.cjs');
const orderController = require('./controllers/orderController.cjs');
const settingsController = require('./controllers/settingsController.cjs');
const staffController = require('./controllers/staffController.cjs'); // YANGI

function startServer() {
  const app = express();
  const PORT = 3000; 

  app.use(cors());
  app.use(express.json());

  const httpServer = http.createServer(app);
  
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  // Signalni tarqatish
  onChange((type, id) => {
    console.log(`📡 Update: ${type} ${id || ''}`);
    io.emit('update', { type, id });
  });

  io.on('connection', (socket) => {
    console.log('📱 Yangi qurilma ulandi:', socket.id);
    socket.on('disconnect', () => console.log('❌ Qurilma uzildi:', socket.id));
  });

  // --- API ---

  // YANGI: LOGIN API
  app.post('/api/login', (req, res) => {
    try {
      const { pin } = req.body;
      const user = staffController.login(pin); // Bazadan tekshiramiz
      res.json(user);
    } catch (e) {
      res.status(401).json({ error: "Noto'g'ri PIN kod" });
    }
  });

  app.get('/api/halls', (req, res) => {
    try { res.json(tableController.getHalls()); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/tables', (req, res) => {
    try { res.json(tableController.getTables()); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/categories', (req, res) => {
    try { res.json(productController.getCategories()); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/products', (req, res) => {
    try {
      const products = productController.getProducts().filter(p => p.is_active === 1);
      res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/tables/:id/items', (req, res) => {
    try { res.json(orderController.getTableItems(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/orders/add', (req, res) => {
    try {
      orderController.addItem(req.body);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/orders/bulk-add', (req, res) => {
    try {
      const { tableId, items } = req.body;
      if (!tableId || !items || !Array.isArray(items)) throw new Error("Noto'g'ri ma'lumot");
      orderController.addBulkItems(tableId, items);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/settings', (req, res) => {
    try { res.json(settingsController.getSettings()); } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/tables/guests', (req, res) => {
    try {
      const { tableId, count } = req.body;
      tableController.updateTableGuests(tableId, count);
      res.json({ success: true });
    } catch (e) { 
      console.error(e);
      res.status(500).json({ error: e.message }); 
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    const localIp = ip.address();
    console.log(`============================================`);
    console.log(`📡 REAL-TIME SERVER: http://${localIp}:${PORT}`);
    console.log(`============================================`);
  });
}

module.exports = startServer;