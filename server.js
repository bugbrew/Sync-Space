const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
const server = http.createServer(app);

// --- MONGODB CONNECTION ---
// Replace YOUR_ACTUAL_PASSWORD with your real Atlas password.
// If your password has special characters like @, use a simple one for now.
const dbURI = process.env.MONGO_URI;
mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB Atlas ✅"))
  .catch((err) => {
    console.error(
      "❌ DB Connection Error. Drawing will be LIVE only, not saved.",
    );
    console.error(err.message);
  });

// Define the blueprint for a drawing stroke
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

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Send drawing history from DB to the new user
  try {
    const history = await Stroke.find().sort({ timestamp: 1 });
    socket.emit("drawing_history", history);
  } catch (err) {
    console.error("Could not fetch history:", err.message);
  }

  socket.on("join_workspace", (name) => {
    socket.username = name;
    console.log(`${name} joined the board`);
  });

  socket.on("drawing_data", (data) => {
    // 🚀 STEP 1: Broadcast IMMEDIATELY so it feels real-time
    socket.broadcast.emit("receive_drawing", data);

    // 💾 STEP 2: Save to DB in the background (don't make users wait)
    const newStroke = new Stroke(data);
    newStroke.save().catch((err) => console.error("Save failed:", err.message));
  });

  socket.on("cursor_move", (data) => {
    socket.broadcast.emit("receive_cursor", {
      ...data,
      id: socket.id,
      username: socket.username || "Guest",
    });
  });

  socket.on("clear_board", async () => {
    try {
      await Stroke.deleteMany({});
      io.emit("clear_board_ui");
      console.log("Board cleared by user.");
    } catch (err) {
      console.error("Clear failed:", err.message);
    }
  });

  socket.on("disconnect", () => {
    io.emit("user_disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));