
const CanvasManager = (function () {
  const canvas = document.getElementById('draw');
  const overlay = document.getElementById('cursors');
  const ctx = canvas.getContext('2d');
  const octx = overlay.getContext('2d');

  let DPR = window.devicePixelRatio || 1;

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    octx.setTransform(DPR, 0, 0, DPR, 0, 0);
    redrawAll();
  }

  window.addEventListener('resize', fitCanvas);
  setTimeout(fitCanvas, 50);

  
  const ops = new Map(); 
  const order = []; 

  
  let localMeta = { color: '#000', width: 4, tool: 'pen' };
  let drawing = false;
  let tempId = null; 
  let currentOpId = null; 
  let bufferPoints = [];

  function setMeta(meta) { localMeta = { ...localMeta, ...meta }; }

  
  function strokeSegment(context, pts, meta) {
    if (!pts || pts.length < 2) return;
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const w = meta.width;
    if (meta.tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = Math.max(8, w * 2);
      context.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      context.globalCompositeOperation = 'source-over';
      context.lineWidth = w;
      context.strokeStyle = meta.color;
    }

    context.beginPath();
    context.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      const cy = (pts[i].y + pts[i + 1].y) / 2;
      context.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
    }
    const last = pts[pts.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
    context.restore();
  }

  function redrawAll() {

    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);
    for (const id of order) {
      const op = ops.get(id);
      if (!op || !op.active) continue;
      strokeSegment(ctx, op.points, op.meta);
    }
  }

  function handleSnapshot(snapshot) {
    ops.clear();
    order.length = 0;
    (snapshot.ops || []).forEach(op => {
      ops.set(op.id, { ...op, meta: op.meta || op.meta }); // preserve meta
      order.push(op.id);
    });
    redrawAll();
  }

  function handleOpStart(op) {
    if (!ops.has(op.id)) {
      ops.set(op.id, { ...op });
      order.push(op.id);
      strokeSegment(ctx, op.points, op.meta);
    }
  }

  function handleOpUpdate({ opId, points }) {
    const op = ops.get(opId);
    if (!op) return;
    op.points.push(...points);
    const seg = op.points.slice(-60);
    strokeSegment(ctx, seg, op.meta);
  }

  function handleHistory({ opId, active }) {
    const op = ops.get(opId);
    if (!op) return;
    op.active = active;
    redrawAll();
  }

  
  const cursors = new Map();
  function drawCursors() {
    octx.clearRect(0, 0, overlay.width / DPR, overlay.height / DPR);
    for (const [id, c] of cursors.entries()) {
      octx.beginPath();
      octx.fillStyle = c.color || '#000';
      octx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      octx.fill();
      octx.font = '12px Arial';
      octx.fillText(c.name || id.slice(0,4), c.x + 8, c.y + 4);
    }
  }

  function updateCursor(c) {
    cursors.set(c.id, c);
    drawCursors();
  }

  return {
    setMeta,
    beginLocalStroke: function (firstPoint) {
      drawing = true;
      tempId = 't_' + Math.random().toString(36).slice(2,9);
      currentOpId = null;
      bufferPoints = [firstPoint];
      strokeSegment(ctx, bufferPoints, localMeta);
      return tempId;
    },
    addLocalPoint: function (pt) {
      if (!drawing) return;
      bufferPoints.push(pt);
      const seg = bufferPoints.slice(-40);
      strokeSegment(ctx, seg, localMeta);
    },
    finishLocalStroke: function () {
      if (!drawing) return null;
      drawing = false;
      
      const localId = currentOpId || tempId;
      const op = {
        id: localId,
        owner: 'me',
        meta: { ...localMeta },
        points: bufferPoints.slice(),
        active: true
      };
      if (!ops.has(localId)) {
        ops.set(localId, op);
        order.push(localId);
      } else {
        
        const ex = ops.get(localId);
        ex.points.push(...bufferPoints);
      }
      bufferPoints = [];
      return { tempId, points: op.points, meta: op.meta, opId: currentOpId };
    },
    mapTempToOp: function (temp, opId) {
      
      if (!temp) return;
      if (temp === opId) return;
      const local = ops.get(temp);
      if (local) {
        ops.delete(temp);
        ops.set(opId, local);
        local.id = opId;
        
        const idx = order.indexOf(temp);
        if (idx >= 0) order[idx] = opId;
        redrawAll();
      }
    },
    handleSnapshot,
    handleOpStart,
    handleOpUpdate,
    handleHistory,
    updateCursor,
    getCanvasSize: function() { return canvas.getBoundingClientRect(); },
    setMeta
  };
})();
