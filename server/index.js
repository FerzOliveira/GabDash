require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const dashboardRoutes = require("./routes/dashboard");
const importRoutes = require("./routes/import");
const { initDatabase } = require("./scripts/initDb");
const { testConnection } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// API routes (must come before static files)
app.use("/api", dashboardRoutes);
app.use("/api", importRoutes);

// Serve the built React dashboard from ../dashboard/dist
const distPath = path.join(__dirname, "..", "dashboard", "dist");
app.use(express.static(distPath));

// Fallback: always return index.html for client-side routing
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Initialize database, then start server
async function start() {
  try {
    await initDatabase();
    await testConnection();
  } catch (err) {
    console.error("⚠️  MySQL não disponível:", err.message);
    console.error("   O servidor iniciará, mas a importação não funcionará até o MySQL estar acessível.");
  }

  app.listen(PORT, () => {
    console.log(`\n✅ GabDash disponível em http://localhost:${PORT}\n`);
  });
}

start();
