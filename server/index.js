const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for demo
    methods: ["GET", "POST"]
  }
});

// In-memory storage
const connectedUsers = new Map(); // socketId -> UserData
const documentRooms = new Map(); // docId -> Set<socketId>

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User joins with their info
  socket.on('join_app', (userData) => {
    // userData: { name, email, avatar? }
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      status: 'online',
      currentDoc: null,
      lastActivity: new Date().toISOString(),
      recentChanges: []
    });
    
    // Broadcast updated user list
    io.emit('users_update', Array.from(connectedUsers.values()));
  });

  // User enters a specific document
  socket.on('enter_document', (docId) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Leave previous doc if any
      if (user.currentDoc) {
        socket.leave(user.currentDoc);
      }
      
      user.currentDoc = docId;
      user.status = 'editing';
      user.lastActivity = new Date().toISOString();
      connectedUsers.set(socket.id, user);
      
      socket.join(docId);
      
      // Notify everyone
      io.emit('users_update', Array.from(connectedUsers.values()));
    }
  });

  // User leaves a document (back to dashboard)
  socket.on('leave_document', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentDoc) {
      socket.leave(user.currentDoc);
      user.currentDoc = null;
      user.status = 'online';
      connectedUsers.set(socket.id, user);
      io.emit('users_update', Array.from(connectedUsers.values()));
    }
  });

  // User performs an action
  socket.on('user_action', (actionData) => {
    // actionData: { action: "Edited Title", timestamp }
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date().toISOString();
      
      // Keep only last 3 changes
      const change = {
        desc: actionData.action,
        time: user.lastActivity
      };
      
      user.recentChanges.unshift(change);
      if (user.recentChanges.length > 3) {
        user.recentChanges.pop();
      }
      
      connectedUsers.set(socket.id, user);
      io.emit('users_update', Array.from(connectedUsers.values()));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedUsers.delete(socket.id);
    io.emit('users_update', Array.from(connectedUsers.values()));
  });
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});