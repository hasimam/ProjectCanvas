require('dotenv').config();
const express = require('express');
const { publicCors, adminCors } = require('./middleware/cors');
const rateLimiter = require('./middleware/rateLimit');
const canvasRoutes = require('./routes/canvas');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public routes
app.use('/api/canvas', publicCors, rateLimiter, canvasRoutes);

// Admin routes
app.use('/api/admin', adminCors, adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
