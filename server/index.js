require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// API routes (must come before static files)
app.use("/api", dashboardRoutes);

// Serve the built React dashboard from ../dashboard/dist
const distPath = path.join(__dirname, "..", "dashboard", "dist");
app.use(express.static(distPath));

// Fallback: always return index.html for client-side routing
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✅ GabDash disponível em http://localhost:${PORT}\n`);
});
