require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// 1. MIDDLEWARE
// origin: "*" allows your Vercel frontend to talk to this Render backend easily
app.use(cors());

const server = http.createServer(app);

// 2. MONGODB CONNECTION
// Ensure MONGO_URI is set in your Render "Environment" tab
const dbURI = process.env.MONGO_URI;

mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB Atlas ✅"))
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
  });

// Blueprint for a drawing stroke
const StrokeSchema = new mongoose.Schema({
  x0: Number,
  y0: Number,
  x1: Number,
  y1: Number,
  color: String,
  width: Number,
  timestamp: { type: Date, default: Date.now },
});
const Stroke = mongoose.model("Stroke", StrokeSchema);

// 3. SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "https://vercel.com/mehak-portfolio/sync-space",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Fetch history from DB and send it to the new user immediately
  try {
    const history = await Stroke.find().sort({ timestamp: 1 });
    socket.emit("drawing_history", history);
  } catch (err) {
    console.error("Error fetching history:", err.message);
  }

  // Set username for the session
  socket.on("join_workspace", (name) => {
    socket.username = name;
  });

  // Handle incoming drawing data
  socket.on("drawing_data", (data) => {
    // 1. Broadcast to everyone else immediately (Real-time speed)
    socket.broadcast.emit("receive_drawing", data);

    // 2. Save to database in the background
    const newStroke = new Stroke(data);
    newStroke.save().catch((err) => console.error("Save failed:", err.message));
  });

  // Handle cursor movements
  socket.on("cursor_move", (data) => {
    socket.broadcast.emit("receive_cursor", {
      ...data,
      id: socket.id,
      username: socket.username || "Guest",
    });
  });

  // Clear board for everyone and the DB
  socket.on("clear_board", async () => {
    try {
      await Stroke.deleteMany({});
      io.emit("clear_board_ui");
    } catch (err) {
      console.error("Clear error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    io.emit("user_disconnected", socket.id);
  });
});

// 4. START SERVER
// Render uses process.env.PORT, otherwise defaults to 4000 for local testing
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 SyncSpace Server running on port ${PORT}`);
});
