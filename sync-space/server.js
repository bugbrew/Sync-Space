const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// In-memory storage for the canvas (Replaces MongoDB)
let canvasHistory = null;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Send the current drawing to the new user immediately
  if (canvasHistory) {
    socket.emit("load-canvas", canvasHistory);
  }

  // 2. Live Drawing Broadcast
  socket.on("draw-data", (data) => {
    socket.broadcast.emit("draw-data", data);
  });

  // 3. Cursor Movement Broadcast
  socket.on("cursor-move", (data) => {
    socket.broadcast.emit("cursor-update", { ...data, id: socket.id });
  });

  // 4. Save current state to memory
  socket.on("save-to-memory", (dataURL) => {
    canvasHistory = dataURL;
  });

  // 5. Clear Canvas for everyone
  socket.on("clear-canvas-request", () => {
    canvasHistory = null;
    io.emit("clear-canvas-execute");
  });

  socket.on("disconnect", () => {
    io.emit("user-left", socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 SyncSpace (No-DB) running at http://localhost:${PORT}`);
});
