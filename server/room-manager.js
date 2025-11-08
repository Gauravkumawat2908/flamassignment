
const OpStore = require('./op-store');

class RoomManager {
  constructor() {
    this._rooms = new Map(); 
  }

  _ensure(room) {
    if (!this._rooms.has(room)) {
      this._rooms.set(room, { users: new Map(), store: new OpStore(room) });
    }
    return this._rooms.get(room);
  }

  addUser(room, user) {
    const r = this._ensure(room);
    r.users.set(user.id, { id: user.id, name: user.name });
  }

  removeUser(room, userId) {
    const r = this._ensure(room);
    r.users.delete(userId);
  }

  getRoomSnapshot(room) {
    const r = this._ensure(room);
    return {
      ops: r.store.getActiveOps(),
      users: Array.from(r.users.values())
    };
  }

  createOperation(room, { owner, ownerName, meta, points, tempId }) {
    const r = this._ensure(room);
    return r.store.create({ owner, ownerName, meta, points, tempId });
  }

  appendPoints(room, targetId, points) {
    const r = this._ensure(room);
    
    return r.store.append(targetId, points);
  }

  finishOperation(room, opId) {
    const r = this._ensure(room);
    return r.store.finish(opId);
  }

  applyHistoryAction(room, action) {
    const r = this._ensure(room);
    return r.store.applyHistory(action);
  }
}

module.exports = RoomManager;
