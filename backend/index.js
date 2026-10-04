// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase } = require('./db/database');

console.log("Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

// Initialize database and apply pending migrations
try {
  initDatabase();
  console.log("Database: Connected & Migrated ✅");
} catch (dbErr) {
  console.error("Database initialization failed ❌:", dbErr.message);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const leanCanvasRoutes = require('./routes/leanCanvas');
const mvpRoutes = require('./routes/mvp');
const revenueRoutes = require('./routes/revenue');
const pitchRoutes = require('./routes/pitch');
const personaRoutes = require('./routes/personas');
const competitorRoutes = require('./routes/competitors');
const planRoutes = require('./routes/plans');

app.use('/api/lean-canvas', leanCanvasRoutes);
app.use('/api/mvp', mvpRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/pitch', pitchRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/plans', planRoutes);

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

module.exports = app;

