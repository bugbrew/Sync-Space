require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors()); // Global express cors
const server = http.createServer(app);

// --- 1. DB CONNECTION ---
const dbURI = process.env.MONGO_URI;

mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB Atlas ✅"))
  .catch((err) => console.error("❌ DB Connection Error:", err.message));

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

// --- 2. SOCKET SERVER (CORS FIX) ---
const io = new Server(server, {
  cors: {
    origin: "*", // Allows local testing (127.0.0.1) AND Vercel automatically
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Fetch history
  try {
    const history = await Stroke.find().sort({ timestamp: 1 });
    socket.emit("drawing_history", history);
  } catch (err) {
    console.error("History fetch error:", err.message);
  }

  socket.on("join_workspace", (name) => {
    socket.username = name;
    console.log(`${name} joined`);
  });

  socket.on("drawing_data", (data) => {
    socket.broadcast.emit("receive_drawing", data);
    const newStroke = new Stroke(data);
    newStroke.save().catch((err) => console.error("Save error:", err.message));
  });

  socket.on("cursor_move", (data) => {
    socket.broadcast.emit("receive_cursor", {
      ...data,
      id: socket.id,
      username: socket.username || "Guest",
    });
  });

  socket.on("clear_board", async () => {
    await Stroke.deleteMany({});
    io.emit("clear_board_ui");
  });

  socket.on("disconnect", () => {
    io.emit("user_disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
