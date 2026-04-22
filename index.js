const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// =========================
// 🗄️ DATABASE (IN-MEMORY)
// =========================
let visitors = [];

/* =========================
   🏠 ROOT ROUTE (FIX ERROR)
========================= */
app.get('/', (req, res) => {
  res.send('🏫 School Visitor Log & Access Monitoring System API is running');
});

/* =========================
   ❤️ HEALTH CHECK
========================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running properly',
  });
});

/* =========================
   🧾 CREATE VISITOR REQUEST
========================= */
app.post('/visitors', (req, res) => {
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
  res.json(visitor);
});

/* =========================
   🛠️ APPROVE + GENERATE QR
========================= */
app.put('/visitors/:id/approve', (req, res) => {
  const visitor = visitors.find((v) => v.id === req.params.id);

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

/* =========================
   📲 QR CHECK-IN (SAFE)
========================= */
app.post('/visitors/checkin', (req, res) => {
  const { qr } = req.body;

  if (!qr) {
    return res.status(400).json({ message: 'QR required' });
  }

  const parts = qr.split('|');

  if (parts.length !== 2) {
    return res.status(400).json({ message: 'Invalid QR format' });
  }

  const id = parts[0].split(':')[1];
  const token = parts[1].split(':')[1];

  const visitor = visitors.find((v) => v.id === id);

  if (!visitor || visitor.qrToken !== token) {
    return res.status(400).json({ message: 'Invalid QR or visitor not found' });
  }

  visitor.status = 'CHECKED-IN';
  visitor.checkInTime = new Date();

  res.json({
    message: 'Check-in successful',
    visitor,
  });
});

/* =========================
   🚪 CHECK-OUT
========================= */
app.put('/visitors/checkout/:id', (req, res) => {
  const visitor = visitors.find((v) => v.id === req.params.id);

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found' });
  }

  visitor.status = 'EXITED';
  visitor.checkOutTime = new Date();

  res.json({
    message: 'Check-out successful',
    visitor,
  });
});

/* =========================
   📋 GET ALL VISITORS
========================= */
app.get('/visitors', (req, res) => {
  res.json(visitors);
});

/* =========================
   🔍 GET SINGLE VISITOR
========================= */
app.get('/visitors/:id', (req, res) => {
  const visitor = visitors.find((v) => v.id === req.params.id);

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found' });
  }

  res.json(visitor);
});

/* =========================
   📊 DAILY REPORT
========================= */
app.get('/reports/daily', (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayVisitors = visitors.filter((v) => {
    const created = new Date(v.createdAt);
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime();
  });

  res.json({
    total: todayVisitors.length,
    pending: todayVisitors.filter((v) => v.status === 'PENDING').length,
    approved: todayVisitors.filter((v) => v.status === 'APPROVED').length,
    checkedIn: todayVisitors.filter((v) => v.status === 'CHECKED-IN').length,
    exited: todayVisitors.filter((v) => v.status === 'EXITED').length,
  });
});

/* =========================
   🌐 SERVER START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
