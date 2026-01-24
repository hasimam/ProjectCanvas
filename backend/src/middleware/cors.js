const cors = require('cors');

const publicCors = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
});

const adminCors = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = { publicCors, adminCors };
