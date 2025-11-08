
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room') || 'main';
  document.getElementById('roomLabel').textContent = 'Room: ' + room;

  const nameInput = document.getElementById('name');
  const colorInput = document.getElementById('color');
  const sizeInput = document.getElementById('size');
  const toolSelect = document.getElementById('tool');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const peopleList = document.getElementById('people');

  const savedName = localStorage.getItem('cc_name') || ('User' + Math.floor(Math.random() * 1000));
  nameInput.value = savedName;

  let meta = { color: colorInput.value, width: Number(sizeInput.value), tool: toolSelect.value };

  SocketAPI.connect(room, nameInput.value || savedName, {
    onSnapshot(data) {
      peopleList.innerHTML = '';
      (data.users || []).forEach(addPerson);
      CanvasManager.handleSnapshot(data);
    },
    onOpStart(op) { CanvasManager.handleOpStart(op); },
    onOpUpdate(upd) { CanvasManager.handleOpUpdate(upd); },
    onOpEnd(e) {},
    onStarted(ack) {
      CanvasManager.mapTempToOp(ack.tempId, ack.opId);
    },
    onHistory(h) { CanvasManager.handleHistory(h); },
    onCursor(c) { CanvasManager.updateCursor(c); },
    onPeerJoin(u) { addPerson(u); },
    onPeerLeft(u) { removePerson(u); }
  });

  function addPerson(u) {
    const li = document.createElement('li');
    li.id = 'p_' + u.id;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = colorFromId(u.id);
    li.appendChild(dot);
    const txt = document.createTextNode(u.name || u.id.slice(0,4));
    li.appendChild(txt);
    peopleList.appendChild(li);
  }

  function removePerson(u) {
    const el = document.getElementById('p_' + u.id);
    if (el) el.remove();
  }

  function colorFromId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360} 70% 45%)`;
  }

  nameInput.addEventListener('change', () => {
    localStorage.setItem('cc_name', nameInput.value);
  });
  colorInput.addEventListener('input', () => { meta.color = colorInput.value; CanvasManager.setMeta(meta); });
  sizeInput.addEventListener('input', () => { meta.width = Number(sizeInput.value); CanvasManager.setMeta(meta); });
  toolSelect.addEventListener('change', () => { meta.tool = toolSelect.value; CanvasManager.setMeta(meta); });

  btnUndo.addEventListener('click', () => SocketAPI.sendHistory('undo'));
  btnRedo.addEventListener('click', () => SocketAPI.sendHistory('redo'));

  const drawCanvas = document.getElementById('draw');
  let isDown = false;
  let lastSentTime = 0;

  function relativePos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
  }

  function throttle(fn, limit) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  const sendCursorThrottled = throttle((p) => {
    SocketAPI.sendCursor(room, { x: p.x, y: p.y, color: meta.color });
  }, 80);

  let currentTemp = null;
  let currentOpId = null;

  drawCanvas.addEventListener('pointerdown', (e) => {
    isDown = true;
    const p = relativePos(e);
    currentTemp = CanvasManager.beginLocalStroke(p);
    SocketAPI.sendStroke({ event: 'start', tempId: currentTemp, meta: meta, points: [p] });
  });

  drawCanvas.addEventListener('pointermove', (e) => {
    const p = relativePos(e);
    CanvasManager.addLocalPoint(p);
    sendCursorThrottled(p);

    if (!isDown) return;
    SocketAPI.sendStroke({ event: 'update', targetId: currentOpId || currentTemp, points: [p] });
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    isDown = false;
    const finished = CanvasManager.finishLocalStroke();
    SocketAPI.sendStroke({ event: 'end', opId: finished.opId || null });
  });

})();
