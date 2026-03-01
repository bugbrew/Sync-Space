const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "https://sync-space-six.vercel.app", // Your specific Vercel deployment URL
    methods: ["GET", "POST"],
  }),
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "https://sync-space-six.vercel.app" },
});

// Database Connection
const MONGO_URI =
  "mongodb+srv://esha28102005_db_user:esha28102005_db_user@cluster0.6nk7eyc.mongodb.net/SyncSpace?retryWrites=true&w=majority";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Cluster0"))
  .catch((err) => console.error("DB Connection Error:", err));

const DrawingSchema = new mongoose.Schema({
  canvasData: String, // Base64 string of the canvas
  updatedAt: { type: Date, default: Date.now },
});
const Drawing = mongoose.model("Drawing", DrawingSchema);

io.on("connection", async (socket) => {
  // Load last saved drawing from DB
  const savedDrawing = await Drawing.findOne().sort({ updatedAt: -1 });
  if (savedDrawing) {
    socket.emit("load-canvas", savedDrawing.canvasData);
  }

  socket.on("draw-data", (data) => {
    socket.broadcast.emit("draw-data", data);
  });

  socket.on("cursor-move", (data) => {
    socket.broadcast.emit("cursor-update", { ...data, id: socket.id });
  });

  socket.on("save-to-db", async (dataURL) => {
    await Drawing.findOneAndUpdate(
      {},
      { canvasData: dataURL, updatedAt: new Date() },
      { upsert: true },
    );
  });

  socket.on("disconnect", () => {
    io.emit("user-left", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server active on port ${PORT}`));
