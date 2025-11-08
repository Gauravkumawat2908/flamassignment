
const { v4: uuidv4 } = require('uuid');

class OpStore {
  constructor(roomName) {
    this.room = roomName;
    this._ops = new Map(); 
    this._order = []; 
    this._tempMap = new Map(); 
    this._undoStack = []; 
    this._redoStack = [];
  }

  create({ owner, ownerName, meta, points = [], tempId = null }) {
    const id = uuidv4();
    const op = {
      id,
      owner,
      ownerName,
      meta,
      points: Array.from(points),
      createdAt: Date.now(),
      active: true
    };
    this._ops.set(id, op);
    this._order.push(id);
    this._undoStack.push(id);
    this._redoStack = [];
    if (tempId) this._tempMap.set(tempId, id);
    return op;
  }

  _resolve(targetId) {
    
    if (!targetId) return null;
    if (this._ops.has(targetId)) return this._ops.get(targetId);
    if (this._tempMap.has(targetId)) return this._ops.get(this._tempMap.get(targetId));
    return null;
  }

  append(targetId, pts) {
    const op = this._resolve(targetId);
    if (!op) return null;
    if (!op.active) return null; 
    op.points.push(...pts);
    op.updatedAt = Date.now();
    return op;
  }

  finish(opId) {
    const op = this._ops.get(opId);
    if (!op) return null;
    op.finished = true;
    op.updatedAt = Date.now();
    return op;
  }

  getActiveOps() {
    
    return this._order
      .map(id => this._ops.get(id))
      .filter(op => op && op.active)
      .map(op => ({ ...op }));
  }

  applyHistory(action) {
    if (action === 'undo') {
      
      while (this._undoStack.length) {
        const candidate = this._undoStack.pop();
        const op = this._ops.get(candidate);
        if (op && op.active) {
          op.active = false;
          this._redoStack.push(candidate);
          return { opId: op.id, active: false, actor: null };
        }
      }
      return null;
    } else if (action === 'redo') {
      if (!this._redoStack.length) return null;
      const id = this._redoStack.pop();
      const op = this._ops.get(id);
      if (op && !op.active) {
        op.active = true;
        this._undoStack.push(id);
        return { opId: id, active: true, actor: null };
      }
      return null;
    }
    return null;
  }
}

module.exports = OpStore;
