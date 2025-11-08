
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const RoomManager = require('./room-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;
const rooms = new RoomManager();

app.use(express.static(path.join(__dirname, '..', 'client')));

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);


  socket.on('join-room', ({ room = 'main', name = 'Anon' }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.name = name;

    rooms.addUser(room, { id: socket.id, name });

    const snapshot = rooms.getRoomSnapshot(room);
    socket.emit('snapshot', snapshot);

    
    socket.to(room).emit('peer-joined', { id: socket.id, name });

    console.log(`${name} joined ${room}`);
  });

  socket.on('cursor', (payload) => {
    const room = socket.data.room;
    if (!room) return;
   
    const out = { ...payload, id: socket.id, name: socket.data.name };
    socket.to(room).emit('cursor', out);
  });


  socket.on('stroke', (msg) => {
    const room = socket.data.room;
    if (!room) return;

    if (msg.event === 'start') {
      const op = rooms.createOperation(room, {
        owner: socket.id,
        ownerName: socket.data.name,
        meta: msg.meta,
        points: msg.points || [],
        tempId: msg.tempId || null
      });
   
      socket.emit('started', { tempId: msg.tempId, opId: op.id });
  
      socket.to(room).emit('op-start', op);
    } else if (msg.event === 'update') {
      const appended = rooms.appendPoints(room, msg.targetId, msg.points || []);
      if (appended) {
        
        socket.to(room).emit('op-update', { opId: appended.id, points: msg.points });
      }
    } else if (msg.event === 'end') {
      const finished = rooms.finishOperation(room, msg.opId);
      if (finished) socket.to(room).emit('op-end', { opId: msg.opId });
    }
  });

  
  socket.on('history', ({ action }) => {
    const room = socket.data.room;
    if (!room) return;
    const result = rooms.applyHistoryAction(room, action);
    if (result) {
      io.to(room).emit('history-applied', result);
    }
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    const name = socket.data.name;
    if (room) {
      rooms.removeUser(room, socket.id);
      socket.to(room).emit('peer-left', { id: socket.id, name });
    }
    console.log('Disconnected:', socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
