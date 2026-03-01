const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// MongoDB Connection (REPLACE <db_password> WITH YOURS)
const MONGO_URI =
  "mongodb+srv://esha28102005_db_user:<db_password>@cluster0.6nk7eyc.mongodb.net/SyncSpace";
mongoose.connect(MONGO_URI).then(() => console.log("DB Connected"));

const Drawing = mongoose.model("Drawing", { canvasData: String });

io.on("connection", async (socket) => {
  const saved = await Drawing.findOne();
  if (saved) socket.emit("load-canvas", saved.canvasData);

  socket.on("draw-data", (data) => socket.broadcast.emit("draw-data", data));
  socket.on("cursor-move", (data) =>
    socket.broadcast.emit("cursor-update", { ...data, id: socket.id }),
  );
  socket.on("save-to-db", async (dataURL) => {
    await Drawing.findOneAndUpdate(
      {},
      { canvasData: dataURL },
      { upsert: true },
    );
  });
});

server.listen(5000, () => console.log("Runing on http://localhost:5000"));
