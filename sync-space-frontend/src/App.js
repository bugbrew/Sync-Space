import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("https://sync-space.onrender.com");

function SyncSpace() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("brush");
  const [remoteCursors, setRemoteCursors] = useState({});
  const [userName] = useState(
    () => prompt("Enter your name for the session:") || "Guest",
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    socket.on("load-canvas", (data) => {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = data;
    });

    socket.on("draw-data", (data) => {
      draw(data.x, data.y, data.lastX, data.lastY, data.color, data.size);
    });

    socket.on("cursor-update", (data) => {
      setRemoteCursors((prev) => ({ ...prev, [data.id]: data }));
    });

    socket.on("user-left", (id) => {
      setRemoteCursors((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });
  }, []);

  const draw = (x, y, lastX, lastY, drawColor, drawSize) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit("cursor-move", { x, y, name: userName });

    if (!isDrawing) return;

    const drawColor = tool === "eraser" ? "#FFFFFF" : color;
    draw(x, y, lastPos.current.x, lastPos.current.y, drawColor, size);

    socket.emit("draw-data", {
      x,
      y,
      lastX: lastPos.current.x,
      lastY: lastPos.current.y,
      color: drawColor,
      size,
    });
    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    socket.emit("save-to-db", canvasRef.current.toDataURL());
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>SyncSpace Collaborative Canvas</h2>

      <div
        style={{
          marginBottom: "10px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          onClick={() => setTool("brush")}
          style={{ fontWeight: tool === "brush" ? "bold" : "normal" }}
        >
          Brush
        </button>
        <button
          onClick={() => setTool("eraser")}
          style={{ fontWeight: tool === "eraser" ? "bold" : "normal" }}
        >
          Eraser
        </button>
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <span>Size: {size}px</span>
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          border: "2px solid #333",
          display: "inline-block",
        }}
      >
        <canvas
          ref={canvasRef}
          width={1000}
          height={600}
          onMouseDown={(e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            lastPos.current = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            };
            setIsDrawing(true);
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          style={{ background: "#fff", cursor: "crosshair" }}
        />

        {Object.values(remoteCursors).map((c) => (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                background: "red",
                borderRadius: "50%",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                background: "white",
                border: "1px solid #000",
                padding: "2px",
              }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SyncSpace;
