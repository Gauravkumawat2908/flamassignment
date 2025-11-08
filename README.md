
A minimal real-time collaborative drawing application built with raw HTML5 Canvas and Socket.io. Supports brush & eraser, multi-user cursor indicators, incremental stroke updates, and global undo/redo.


1. Clone project
2. cd collaborative-canvas
3. npm install
4. npm start
5. Open `http://localhost:3000` in multiple tabs 


- Each stroke is an **operation** (op): immutable list of points + meta (color, size, tool).
- Clients draw locally immediately (optimistic) then send `start/update/end` messages to server.
- Server stores ops in memory and broadcasts incremental updates to peers.
- Undo/redo toggles op.active on server and broadcasts change; clients re-render skipping inactive ops.


- Open 2+ tabs and draw — strokes should appear live.
- Click Undo in any tab to remove last visible stroke globally; Redo restores it.



- Server stores everything in memory — restart loses history.
- Undo is global (not per-user).
- No authentication.
- No DB persistence or horizontal scaling.


2–3 hours (design + coding)

