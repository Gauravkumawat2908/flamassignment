
const SocketAPI = (function () {
  let socket = null;

  function connect(room, name, handlers) {
    socket = io(); 
    socket.on('connect', () => {
      socket.emit('join-room', { room, name });
    });

    socket.on('snapshot', (data) => handlers.onSnapshot && handlers.onSnapshot(data));
    socket.on('op-start', (op) => handlers.onOpStart && handlers.onOpStart(op));
    socket.on('op-update', (upd) => handlers.onOpUpdate && handlers.onOpUpdate(upd));
    socket.on('op-end', (e) => handlers.onOpEnd && handlers.onOpEnd(e));
    socket.on('started', (ack) => handlers.onStarted && handlers.onStarted(ack));
    socket.on('history-applied', (h) => handlers.onHistory && handlers.onHistory(h));
    socket.on('cursor', (c) => handlers.onCursor && handlers.onCursor(c));
    socket.on('peer-joined', (u) => handlers.onPeerJoin && handlers.onPeerJoin(u));
    socket.on('peer-left', (u) => handlers.onPeerLeft && handlers.onPeerLeft(u));
    socket.on('disconnect', () => handlers.onDisconnect && handlers.onDisconnect());
  }

  function sendCursor(room, payload) {
    if (!socket) return;
    socket.emit('cursor', payload);
  }

  function sendStroke(ev) {
    if (!socket) return;
    socket.emit('stroke', ev);
  }

  function sendHistory(action) {
    if (!socket) return;
    socket.emit('history', { action });
  }

  return { connect, sendCursor, sendStroke, sendHistory };
})();
