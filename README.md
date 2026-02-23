# 🎨 SyncSpace: Collaborative Whiteboard

SyncSpace is a real-time, multi-user drawing platform that allows users to collaborate on a shared digital canvas. Changes are synchronized instantly across all connected clients and saved to a database for persistence.

## 🚀 Key Features
* **Real-Time Collaboration:** See partner cursors and drawings instantly via WebSockets (Socket.io).
* **Persistent Drawing:** All strokes are saved to MongoDB, allowing the board to be restored even after a refresh.
* **Toolbox:** Support for various colors and an adjustable eraser.
* **User Identity:** Custom nicknames for participants with distinct cursor colors.
* **Smooth Rendering:** Uses HTML5 Canvas with CSS transitions for a fluid drawing experience.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+)
* **Backend:** Node.js, Express.js
* **Real-Time:** Socket.io
* **Database:** MongoDB Atlas & Mongoose
* **Deployment:** Render (Backend) & Vercel (Frontend)

## 🔧 Installation & Local Setup
1. Clone the repo: `git clone https://github.com/YOUR_USERNAME/syncspace.git`
2. Install dependencies: `npm install`
3. Set up your MongoDB Atlas connection string in `server.js`.
4. Run the server: `npm run dev`
5. Open `index.html` in your browser.
