
Operation-based model: Each stroke is recorded as an operation (op). Undo/redo toggles an op's `active` flag; replay draws only active ops.
Client-side prediction: user sees their strokes immediately; server confirms with canonical `opId`.
Incremental updates: clients send small point arrays frequently; server rebroadcasts to peers for smooth drawing.

- `join-room` { room, name } -> join
- `snapshot` { ops[], users[] } -> server to client on join
- `op-start` (server->clients) new op with opId
- `started` (server->origin) ack tempId -> opId
- `op-update` (server->clients) incremental points for opId
- `op-end` (server->clients)
- `cursor` (client->server->others) pointer positions for live cursors
- `history` (client->server) {action:'undo'|'redo'}
- `history-applied` (server->clients)

- Server keeps `_undoStack` and `_redoStack` of opIds.
- `undo`: pop last active opId and set `active=false` (push to redo)
- `redo`: pop from redo, set active=true (push back to undo)
- Deterministic and simple to implement across clients.


- Batching of points reduces overhead.
- Incremental drawing (draw recent points) avoids redrawing full canvas on every small update.
- Snapshotting & trimming recommended for production.

