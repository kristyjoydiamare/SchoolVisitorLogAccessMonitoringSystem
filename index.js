const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// =========================
// 🔓 MIDDLEWARE FIX
// =========================
app.use(cors()); // allows Postman + frontend access
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // optional safety

// =========================
// 🗄️ DATABASE
// =========================
let visitors = [];

// =========================
// 🏠 ROOT (TEST SERVER)
// =========================
app.get('/', (req, res) => {
  res.send('🏫 Visitor API is running');
});

// =========================
// ❤️ HEALTH CHECK
// =========================
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// =========================
// 🧾 CREATE VISITOR (POSTMAN TEST)
// =========================
app.post('/visitors', (req, res) => {
  console.log("BODY:", req.body); // 👈 helps debug Postman

  const { name, purpose } = req.body;

  if (!name || !purpose) {
    return res.status(400).json({
      message: 'Name and purpose are required',
    });
  }

  const visitor = {
    id: Date.now().toString(),
    name,
    purpose,
    status: 'PENDING',
    qrToken: null,
    checkInTime: null,
    checkOutTime: null,
    createdAt: new Date(),
  };

  visitors.push(visitor);

  res.status(201).json(visitor);
});

// =========================
// 📋 GET ALL VISITORS
// =========================
app.get('/visitors', (req, res) => {
  res.json(visitors);
});

// =========================
// 🔍 GET SINGLE VISITOR
// =========================
app.get('/visitors/:id', (req, res) => {
  const visitor = visitors.find(v => v.id === req.params.id);

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found' });
  }

  res.json(visitor);
});

// =========================
// 🛠️ APPROVE VISITOR
// =========================
app.put('/visitors/:id/approve', (req, res) => {
  const visitor = visitors.find(v => v.id === req.params.id);

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found' });
  }

  const token = crypto.randomBytes(6).toString('hex');

  visitor.status = 'APPROVED';
  visitor.qrToken = token;

  res.json({
    message: 'Visitor approved',
    qr: `visitorId:${visitor.id}|token:${token}`,
  });
});

// =========================
// 📲 CHECK-IN
// =========================
app.post('/visitors/checkin', (req, res) => {
  const { qr } = req.body;

  if (!qr) return res.status(400).json({ message: 'QR required' });

  const [idPart, tokenPart] = qr.split('|');

  const id = idPart?.split(':')[1];
  const token = tokenPart?.split(':')[1];

  const visitor = visitors.find(v => v.id === id);

  if (!visitor || visitor.qrToken !== token) {
    return res.status(400).json({ message: 'Invalid QR' });
  }

  visitor.status = 'CHECKED-IN';
  visitor.checkInTime = new Date();

  res.json({ message: 'Check-in successful', visitor });
});

// =========================
// 🚪 CHECK-OUT
// =========================
app.put('/visitors/checkout/:id', (req, res) => {
  const visitor = visitors.find(v => v.id === req.params.id);

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found' });
  }

  visitor.status = 'EXITED';
  visitor.checkOutTime = new Date();

  res.json({ message: 'Check-out successful', visitor });
});

// =========================
// 🌐 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});