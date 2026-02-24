const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { generateLatex } = require('./latexGenerator');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate-latext', async (req, res) => {
  try {
    const { spreadsheetId, docId, token } = req.body;

    if (!spreadsheetId || !docId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Generating LaTeX for doc ${docId} in sheet ${spreadsheetId}...`);
    const result = await generateLatex(spreadsheetId, docId, token);

    // Return the content directly as JSON, frontend will trigger download
    // Alternatively, we could stream it as a file download directly here
    res.json({
      success: true,
      tex: result.tex,
      bib: result.bib,
      filename: result.filename
    });

  } catch (error) {
    console.error('Error generating LaTeX:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Error fetching image');
  }
});

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

// --- Persistence Setup ---
const fs = require('fs');
const path = require('path');
const WORKBOOKS_FILE = path.join(__dirname, 'workbooks.json');

// Shared workbooks storage (in-memory, loaded from file)
let sharedWorkbooks = [];

// Load initial data
try {
  if (fs.existsSync(WORKBOOKS_FILE)) {
    const data = fs.readFileSync(WORKBOOKS_FILE, 'utf8');
    sharedWorkbooks = JSON.parse(data);
    console.log(`Loaded ${sharedWorkbooks.length} workbooks from disk.`);
  } else {
    // Create empty file if not exists
    fs.writeFileSync(WORKBOOKS_FILE, '[]', 'utf8');
    console.log('Created new workbooks storage file.');
  }
} catch (err) {
  console.error('Error loading workbooks:', err);
  sharedWorkbooks = [];
}

// Helper to save data
const saveWorkbooks = () => {
  try {
    fs.writeFileSync(WORKBOOKS_FILE, JSON.stringify(sharedWorkbooks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving workbooks:', err);
  }
};

app.get('/api/workbooks', (req, res) => {
  res.json(sharedWorkbooks);
});

app.post('/api/workbooks', (req, res) => {
  const { id, name, description, createdBy } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Avoid duplicates
  if (sharedWorkbooks.some(wb => wb.id === id)) {
    return res.status(409).json({ error: 'Workbook already exists' });
  }
  
  const newBook = { 
    id, 
    name, 
    description: description || '', 
    createdBy: createdBy || 'Anonymous',
    createdAt: new Date().toISOString()
  };
  
  sharedWorkbooks.push(newBook);
  saveWorkbooks(); // Persist changes
  
  // Notify all clients about the new list
  io.emit('workbooks_update', sharedWorkbooks);
  
  res.status(201).json(newBook);
});

app.delete('/api/workbooks/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = sharedWorkbooks.length;
  sharedWorkbooks = sharedWorkbooks.filter(b => b.id !== id);
  
  if (sharedWorkbooks.length !== initialLength) {
    saveWorkbooks(); // Persist changes
    io.emit('workbooks_update', sharedWorkbooks);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Workbook not found' });
  }
});

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
    
    // Send current shared workbooks to the new user
    socket.emit('workbooks_update', sharedWorkbooks);
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

  // Data update event (e.g. image saved, row deleted)
  socket.on('data_update', (data) => {
    // data: { docId: string, type: 'image' | 'row' | 'cell', ... }
    const user = connectedUsers.get(socket.id);
    if (user && user.currentDoc) {
      // Broadcast to everyone in the same document room
      socket.to(user.currentDoc).emit('data_update', {
        ...data,
        fromUser: user.name,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedUsers.delete(socket.id);
    io.emit('users_update', Array.from(connectedUsers.values()));
  });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});