(function(){
  // Modelo
  let nodes = []; // {id,label,x,y,color,size,et,lt}
  let edges = []; // {id,source,target,type,weight,slack,isCritical}
  let currentTool = 'select'; // select | move | addNode | addEdge | delete
  let selectedNodeId = null;
  let pendingEdgeSource = null;
  let dragging = false;
  let dragOffset = {x:0,y:0};
  let oldViewX = 0;
  let oldViewY = 0;
  let mousePos = {x:0,y:0};
  let viewX = 0;
  let viewY = 0;
  const curveAmount = 30;

  // Canvas
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function genId(){ return Math.random().toString(36).slice(2,9); }

  // Setup canvas size (responsive + DPR)
  function resizeCanvas() {
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(400, Math.floor(rect.width)); // Minimum 400px width
    const h = Math.max(300, Math.floor(rect.height)); // Minimum 300px height
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    console.log(`Canvas resized: ${w}x${h} (DPR: ${dpr}, Actual: ${canvas.width}x${canvas.height})`);
    render();
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('load', resizeCanvas);
  resizeCanvas();

  // Helpers
  function nextLabel(){
    const idx = nodes.length;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let n = idx, label = '';
    do { label = letters[n % 26] + label; n = Math.floor(n/26) - 1; } while(n >= 0);
    return label;
  }

  function getMousePos(evt){
    const rect = canvas.getBoundingClientRect();
    return { x: (evt.clientX - rect.left), y: (evt.clientY - rect.top) };
  }

  function getWorldPos(screenPos){
    return { x: screenPos.x + viewX, y: screenPos.y + viewY };
  }

  function hitNode(pos){
    for(let i = nodes.length - 1; i >= 0; i--){
      const n = nodes[i];
      const r = n.size || 22;
      if(Math.hypot(pos.x - n.x, pos.y - n.y) <= r + 4) return n.id;
    }
    return null;
  }

  function pointToSegmentDistance(p, A, B){
    const APx = p.x - A.x, APy = p.y - A.y;
    const ABx = B.x - A.x, ABy = B.y - A.y;
    const ab2 = ABx*ABx + ABy*ABy;
    if(ab2 === 0) return Math.hypot(p.x-A.x, p.y-A.y);
    const t = Math.max(0, Math.min(1, (APx*ABx + APy*ABy)/ab2));
    const Cx = A.x + ABx*t, Cy = A.y + ABy*t;
    return Math.hypot(p.x-Cx, p.y-Cy);
  }

  function hitEdge(pos){
    const threshold = 6;
    for(const e of edges){
      const a = nodes.find(n=>n.id===e.source);
      const b = nodes.find(n=>n.id===e.target);
      if(!a || !b) continue;
      if(a.id === b.id){
        const r = (a.size||22)+14;
        const cx = a.x + r, cy = a.y - r;
        const d = Math.hypot(pos.x-cx, pos.y-cy);
        if(Math.abs(d - r) < threshold) return e.id;
        continue;
      }
      const A = projectEdgePoint(a,b);
      const B = projectEdgePoint(b,a);
      const dx = B.x - A.x, dy = B.y - A.y;
      const dist = Math.hypot(dx, dy);
      if(dist < 1) continue;
      const perpX = -dy / dist * curveAmount;
      const perpY = dx / dist * curveAmount;
      const control = {x: (A.x + B.x)/2 + perpX, y: (A.y + B.y)/2 + perpY};
      const d1 = pointToSegmentDistance(pos, A, control);
      const d2 = pointToSegmentDistance(pos, control, B);
      const d = Math.min(d1, d2);
      if(d < threshold) return e.id;
    }
    return null;
  }

  function projectEdgePoint(nFrom, nTo){
    const r = nFrom.size || 22;
    const ang = Math.atan2(nTo.y - nFrom.y, nTo.x - nFrom.x);
    return { x: nFrom.x + Math.cos(ang)*r, y: nFrom.y + Math.sin(ang)*r };
  }

  function midpointOnEdge(a,b){
    if(a.id === b.id){
      const r = (a.size||22) + 14;
      return { x: a.x + r, y: a.y - r*1.5 };
    }
    const A = projectEdgePoint(a,b), B = projectEdgePoint(b,a);
    const dx = B.x - A.x, dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    if(dist < 1) return {x: (A.x + B.x)/2, y: (A.y + B.y)/2};
    const perpX = -dy / dist * curveAmount;
    const perpY = dx / dist * curveAmount;
    const control = {x: (A.x + B.x)/2 + perpX, y: (A.y + B.y)/2 + perpY};
    const t = 0.5;
    const x = (1-t)*(1-t)*A.x + 2*(1-t)*t*control.x + t*t*B.x;
    const y = (1-t)*(1-t)*A.y + 2*(1-t)*t*control.y + t*t*B.y;
    return {x, y};
  }

  function drawArrowhead(from, to){
    const angle = Math.atan2(to.y-from.y, to.x-from.x);
    const size = 8;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size*Math.cos(angle - Math.PI/6), to.y - size*Math.sin(angle - Math.PI/6));
    ctx.lineTo(to.x - size*Math.cos(angle + Math.PI/6), to.y - size*Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
  }

  // PIZARRAAAA
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e496ecff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // background grid (before translate)
    const step = 28;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;

    const startX = (Math.floor(viewX / step) * step - viewX);
    for(let sx = startX; sx < canvas.clientWidth; sx += step){
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.clientHeight); ctx.stroke();
    }

    const startY = (Math.floor(viewY / step) * step - viewY);
    for(let sy = startY; sy < canvas.clientHeight; sy += step){
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.clientWidth, sy); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-viewX, -viewY);

    // edges
    edges.forEach(e=>{
      const a = nodes.find(n=>n.id===e.source);
      const b = nodes.find(n=>n.id===e.target);
      if(!a||!b) return;
      ctx.save();

      const isCritical = (e.isCritical === true);
      ctx.strokeStyle = isCritical ? 'red' : 'rgba(11, 11, 11, 0.8)';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      const A = projectEdgePoint(a,b);
      const B = projectEdgePoint(b,a);
      if(a.id === b.id){
        const r = (a.size||22) + 14;
        const cx = a.x + r, cy = a.y - r;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
        if(e.type !== 'undirected'){ drawArrowhead({x:cx, y:cy+r}, {x:cx, y:cy-r}); }
      } else {
        const dx = B.x - A.x, dy = B.y - A.y;
        const dist = Math.hypot(dx, dy);
        if(dist < 1) return;
        const perpX = -dy / dist * curveAmount;
        const perpY = dx / dist * curveAmount;
        const control = {x: (A.x + B.x)/2 + perpX, y: (A.y + B.y)/2 + perpY};
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(control.x, control.y, B.x, B.y); ctx.stroke();

        if(e.type === 'directed' || e.type === 'bidirectional'){
          const angle = Math.atan2(B.y - control.y, B.x - control.x);
          const prev = {x: B.x - Math.cos(angle) * 1, y: B.y - Math.sin(angle) * 1};
          drawArrowhead(prev, B);
        }
        if(e.type === 'bidirectional'){
          const angle = Math.atan2(A.y - control.y, A.x - control.x);
          const prev = {x: A.x - Math.cos(angle) * 1, y: A.y - Math.sin(angle) * 1};
          drawArrowhead(prev, A);
        }
      }

      const mid = midpointOnEdge(a,b);

      // PESOOOO
      if(e.weight != null && e.weight !== ''){
        ctx.fillStyle = '#0f0007ff';
        ctx.font = '600 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(String(e.weight.toFixed(0)), mid.x, mid.y-10);
      }

      // Holgura (h=) abajo, si está calculada
      if(e.slack !== undefined){
        ctx.fillStyle = '#0f0007ff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`h=${Math.round(e.slack)}`, mid.x, mid.y + 10);
      }

      ctx.restore();
    });

    // nodes
    nodes.forEach(n=>{
      ctx.save();
      const r = n.size || 22;
      if(n.id === selectedNodeId){
        ctx.beginPath(); ctx.arc(n.x,n.y,r+6,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2); ctx.fillStyle = n.color || '#FBBD40'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
      ctx.fillStyle = '#071021';
      ctx.font = '700 12px Poppins, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);

      // ET | LT abajo, si está calculada
      if(n.et !== undefined && n.lt !== undefined){
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`${Math.round(n.et)} | ${Math.round(n.lt)}`, n.x, n.y + r + 5);
      }

      ctx.restore();
    });

    // pending edge preview
    if(pendingEdgeSource){
      const src = nodes.find(n=>n.id===pendingEdgeSource);
      if(src){
        const worldMouse = getWorldPos(mousePos);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        const A = projectEdgePoint(src, worldMouse);
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(worldMouse.x, worldMouse.y); ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function render(){
    draw();
    syncPanels();
  }

  // Enhanced warning modal
  function showWarning(message) {
    return new Promise((resolve) => {
      const warningModal = document.createElement('div');
      warningModal.className = 'modal fade';
      warningModal.id = 'warningModal';
      warningModal.setAttribute('tabindex', '-1');
      warningModal.setAttribute('aria-hidden', 'true');
      warningModal.setAttribute('data-bs-backdrop', 'static');
      warningModal.setAttribute('data-bs-keyboard', 'false');
      warningModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-transparent border-0" style="background: linear-gradient(135deg, var(--dark-purple, #2F0C33), var(--violet-red, #8C144E)); border-radius: 15px; box-shadow: 0 10px 30px rgba(47, 12, 51, 0.7);">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title text-white animate__animated animate__fadeIn" style="font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--pastel-orange, #FBBD40); text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">Advertencia</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4 text-center">
              <p class="text-white animate__animated animate__fadeInUp" style="font-size: 1.1rem; color: var(--pastel-orange, #FBBD40);">${message}</p>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-light animate__animated animate__fadeIn" data-bs-dismiss="modal" style="border-color: var(--carrot-orange, #EE9029); color: var(--carrot-orange, #EE9029);">Aceptar</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(warningModal);

      const modal = new bootstrap.Modal(warningModal);
      modal.show();

      warningModal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(warningModal);
        resolve();
      }, { once: true });
    });
  }

  function validateWeight(value) {
    if (value === '' || value === null) return true; 
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      showWarning('El peso debe ser un número no negativo.');
      return false;
    }
    return true;
  }

  // limpia limpia
  function clearAll() {
    nodes = [];
    edges = [];
    selectedNodeId = null;
    pendingEdgeSource = null;
    document.getElementById('critical-path-result').innerHTML = '';
    render();
  }

  // UI sync
  function syncPanels(){
    // node form
    const form = document.getElementById('node-form');
    const noSel = document.getElementById('no-selection');
    if(!selectedNodeId){ if(form) form.classList.add('d-none'); if(noSel) noSel.classList.remove('d-none'); }
    else {
      const n = nodes.find(x=>x.id===selectedNodeId);
      if(!n) { selectedNodeId = null; syncPanels(); return; }
      if(form) form.classList.remove('d-none'); if(noSel) noSel.classList.add('d-none');
      document.getElementById('node-label').value = n.label;
      document.getElementById('node-color').value = n.color || '#FBBD40';
      document.getElementById('node-size').value = n.size || 22;
    }

    // edges table
    const tbody = document.getElementById('edges-tbody');
    tbody.innerHTML = '';
    edges.forEach((e,idx)=>{
      const from = nodes.find(n=>n.id===e.source);
      const to = nodes.find(n=>n.id===e.target);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${from ? from.label : '?'}</td>
        <td>${to ? to.label : '?'}</td>
        <td>
          <select class="form-select form-select-sm edge-type" data-id="${e.id}">
            <option value="directed" ${e.type==='directed'?'selected':''}>Dirigida</option>
            <option value="undirected" ${e.type==='undirected'?'selected':''}>No dirigida</option>
            <option value="bidirectional" ${e.type==='bidirectional'?'selected':''}>Bidireccional</option>
          </select>
        </td>
        <td><input type="number" step="any" min="0" class="form-control form-control-sm edge-weight" data-id="${e.id}" value="${e.weight ?? ''}" style="width:85px" placeholder="peso"></td>
        <td>${e.slack !== undefined ? Math.round(e.slack) : ''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger edge-del" data-id="${e.id}" title="Eliminar" style="color: #2F0C33"><i class="bi bi-trash"></i></button></td>
      `;
      tbody.appendChild(tr);
    });

    // bind edge table events (delegation simple)
    tbody.querySelectorAll('.edge-type').forEach(sel=>{
      sel.onchange = (ev)=>{
        const id = ev.target.dataset.id;
        const e = edges.find(x=>x.id===id);
        if(e) { e.type = ev.target.value; render(); }
      };
    });
    tbody.querySelectorAll('.edge-weight').forEach(inp=>{
      inp.onchange = (ev)=>{
        const id = ev.target.dataset.id;
        const e = edges.find(x=>x.id===id);
        if(e) {
          if (validateWeight(ev.target.value)) {
            e.weight = ev.target.value === '' ? null : parseFloat(ev.target.value);
            render();
          } else {
            ev.target.value = e.weight ?? '';
          }
        }
      };
    });
    tbody.querySelectorAll('.edge-del').forEach(btn=>{
      btn.onclick = (ev)=>{
        const id = ev.currentTarget.dataset.id;
        edges = edges.filter(x=> x.id !== id);
        render();
      };
    });

    // matrix
    buildAdjacencyMatrix();
  }

  function buildAdjacencyMatrix(){
    const table = document.getElementById('matrix-table');
    const tableModal = document.getElementById('matrix-table-modal');
    table.innerHTML = '';
    tableModal.innerHTML = '';
    const ordered = [...nodes].sort((a,b)=> (a.label||'').localeCompare(b.label||''));
    if(ordered.length === 0) return { matrix: [], ordered: [] };
    const indexById = new Map(ordered.map((n,i)=>[n.id,i]));
    const n = ordered.length;
    const M = Array.from({length:n},()=>Array(n).fill(0));
    edges.forEach(e=>{
      const i = indexById.get(e.source), j = indexById.get(e.target);
      if(i==null || j==null) return;
      const w = (e.weight==null || isNaN(e.weight)) ? 1 : Number(e.weight);
      if(e.type === 'directed') M[i][j] += w;
      else { M[i][j] += w; M[j][i] += w; }
    });

    const createMatrixTable = (target, isDark = true) => {
      // CABECERA SOLO CON LABELS (sin columna vacía inicial)
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr>' + ordered.map(o=>`<th>${o.label}</th>`).join('') + '</tr>';
      target.appendChild(thead);
      
      // CUERPO SIN PRIMERA COLUMNA DE LABELS
      const tbody = document.createElement('tbody');
      for(let i=0;i<n;i++){
        const row = document.createElement('tr');
        // Eliminamos el primer <th> que contenía el label
        row.innerHTML = M[i].map(v=>`<td>${Number.isInteger(v)?v:v.toFixed(2)}</td>`).join('');
        tbody.appendChild(row);
      }
      target.appendChild(tbody);
      if(isDark) target.classList.add('table-dark');
    };

    createMatrixTable(table);
    createMatrixTable(tableModal);
    
    return { matrix: M, ordered };
  }

  // Tool handling
  function setTool(t){
    currentTool = t;
    const ids = ['btn-select','btn-move','btn-add-node','btn-add-edge','btn-delete'];
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.classList.remove('on');
    });
    document.getElementById('btn-select').classList.toggle('on', t==='select');
    document.getElementById('btn-move').classList.toggle('on', t==='move');
    document.getElementById('btn-add-node').classList.toggle('on', t==='addNode');
    document.getElementById('btn-add-edge').classList.toggle('on', t==='addEdge');
    document.getElementById('btn-delete').classList.toggle('on', t==='delete');
    if(t !== 'addEdge') pendingEdgeSource = null;
    render();
  }

  // Bind toolbar
  document.getElementById('btn-select').onclick = ()=>{ setTool('select'); };
  document.getElementById('btn-move').onclick = ()=>{ setTool('move'); };
  document.getElementById('btn-add-node').onclick = ()=>{ setTool('addNode'); };
  document.getElementById('btn-add-edge').onclick = ()=>{ setTool('addEdge'); };
  document.getElementById('btn-delete').onclick = ()=>{ setTool('delete'); };
  document.getElementById('btn-clear').onclick = ()=>{ clearAll(); };

  // Nueva ventana de optimización mejorada
  // Note: we keep showOptimizationDialog from original code
  document.getElementById('btn-assignment').onclick = () => {
    // Show the same optimization dialog and run assignment according to choice
    showOptimizationDialog().then(result => {
      if (result !== null) {
        computeCriticalPath(result);
      }
    });
  };

  // Función para mostrar diálogo de optimización personalizado
  function showOptimizationDialog() {
    return new Promise((resolve) => {
      const modalId = 'optimizationModal';
      let existingModal = document.getElementById(modalId);
      if (existingModal) {
        existingModal.remove();
      }

      const optimizationModal = document.createElement('div');
      optimizationModal.className = 'modal fade';
      optimizationModal.id = modalId;
      optimizationModal.setAttribute('tabindex', '-1');
      optimizationModal.setAttribute('aria-hidden', 'true');
      optimizationModal.setAttribute('data-bs-backdrop', 'static');
      optimizationModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content" style="
            background: linear-gradient(135deg, var(--dark-purple, #2F0C33), var(--violet-red, #8C144E));
            border: 2px solid var(--carrot-orange, #EE9029);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(47, 12, 51, 0.7);
            overflow: hidden;
          ">
            <div class="modal-header border-0 pb-2" style="border-bottom: 1px solid rgba(251, 189, 64, 0.3) !important;">
              <h5 class="modal-title w-100 text-center" style="
                font-family: 'Poppins', sans-serif;
                font-weight: 700;
                color: var(--pastel-orange, #FBBD40);
                text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
                font-size: 1.3rem;
              ">
                <i class="bi bi-gear-fill me-2"></i>Modo de Cálculo
              </h5>
            </div>
            
            <div class="modal-body p-4 text-center">
              <p class="text-white mb-3" style="
                font-size: 1rem;
                color: #FFFFFF !important;
                line-height: 1.4;
              ">
                Selecciona el tipo de optimización:
              </p>
              
              <div class="d-flex flex-column gap-3">
                <button type="button" class="btn btn-optimization max-btn animate__animated animate__fadeInLeft" data-result="max" style="
                  background: linear-gradient(45deg, #8C144E, #C2185B);
                  border: 2px solid #FBBD40;
                  color: white;
                  font-weight: 600;
                  padding: 12px 20px;
                  border-radius: 10px;
                  transition: all 0.3s ease;
                  font-family: 'Poppins', sans-serif;
                ">
                  <i class="bi bi-arrow-up-circle-fill me-2"></i>
                  Maximizar (Asignación)
                </button>
                
                <button type="button" class="btn btn-optimization min-btn animate__animated animate__fadeInRight" data-result="min" style="
                  background: linear-gradient(45deg, #2F0C33, #4A148C);
                  border: 2px solid #EE9029;
                  color: white;
                  font-weight: 600;
                  padding: 12px 20px;
                  border-radius: 10px;
                  transition: all 0.3s ease;
                  font-family: 'Poppins', sans-serif;
                ">
                  <i class="bi bi-arrow-down-circle-fill me-2"></i>
                  Minimizar (Asignación)
                </button>
              </div>
              
              <div class="mt-3">
                <small class="text-warning" style="opacity: 0.8;">
                  <i class="bi bi-info-circle me-1"></i>
                  Asignación entre filas/columnas según matriz de adyacencia
                </small>
              </div>
            </div>
            
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-light btn-cancel" data-bs-dismiss="modal" style="
                border-color: var(--carrot-orange, #EE9029);
                color: var(--carrot-orange, #EE9029);
                font-weight: 500;
              ">
                <i class="bi bi-x-circle me-1"></i>Cancelar
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(optimizationModal);

      const modal = new bootstrap.Modal(optimizationModal);
      modal.show();

      // Efectos hover para los botones
      const optimizationButtons = optimizationModal.querySelectorAll('.btn-optimization');
      optimizationButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 5px 15px rgba(251, 189, 64, 0.4)';
        });
        
        btn.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
        
        btn.addEventListener('click', function() {
          const result = this.getAttribute('data-result');
          
          // Efecto de confirmación
          this.style.background = 'linear-gradient(45deg, #00C853, #64DD17)';
          this.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Seleccionado';
          
          setTimeout(() => {
            modal.hide();
            resolve(result);
          }, 500);
        });
      });

      // Botón cancelar
      optimizationModal.querySelector('.btn-cancel').addEventListener('click', () => {
        resolve(null);
      });

      optimizationModal.addEventListener('hidden.bs.modal', () => {
        if (optimizationModal.parentNode) {
          optimizationModal.parentNode.removeChild(optimizationModal);
        }
        if (!optimizationModal.querySelector('.btn-optimization').disabled) {
          resolve(null);
        }
      }, { once: true });
    });
  }

  // Node form
  document.getElementById('node-save').onclick = ()=>{
    if(!selectedNodeId) return;
    const n = nodes.find(x=>x.id===selectedNodeId);
    if(!n) return;
    const lbl = document.getElementById('node-label').value.trim() || n.label;
    const col = document.getElementById('node-color').value;
    const size = parseInt(document.getElementById('node-size').value,10) || 22;
    n.label = lbl; n.color = col; n.size = size;
    render();
  };
  document.getElementById('node-delete').onclick = ()=>{
    if(!selectedNodeId) return;
    nodes = nodes.filter(x=>x.id !== selectedNodeId);
    edges = edges.filter(e=> e.source !== selectedNodeId && e.target !== selectedNodeId);
    selectedNodeId = null;
    render();
  };

  // Canvas interactions
  canvas.addEventListener('mousemove', (ev)=>{
    mousePos = getMousePos(ev);
    const worldPos = getWorldPos(mousePos);
    if(dragging){
      if(currentTool === 'select' && selectedNodeId){
        const n = nodes.find(x=>x.id===selectedNodeId);
        n.x = clamp(worldPos.x - dragOffset.x, viewX + 10, viewX + canvas.clientWidth - 10);
        n.y = clamp(worldPos.y - dragOffset.y, viewY + 10, viewY + canvas.clientHeight - 10);
        render();
      } else if(currentTool === 'move'){
        viewX = oldViewX - (mousePos.x - dragOffset.x);
        viewY = oldViewY - (mousePos.y - dragOffset.y);
        render();
      }
    } else {
      if(pendingEdgeSource) render();
    }
  });

  canvas.addEventListener('mousedown', (ev)=>{
    const pos = getMousePos(ev);
    const worldPos = getWorldPos(pos);
    const nid = hitNode(worldPos);
    const eid = hitEdge(worldPos);

    if(currentTool === 'addNode'){
      const newNode = { id: genId(), label: nextLabel(), x: worldPos.x, y: worldPos.y, color: '#FBBD40', size: 22 };
      nodes.push(newNode);
      selectedNodeId = newNode.id;
      render();
      return;
    }

    if(currentTool === 'addEdge'){
      if(nid){
        if(!pendingEdgeSource){
          pendingEdgeSource = nid;
          render();
        } else {
          const type = edgeTypeFromUI();
          const srcId = pendingEdgeSource;
          const dstId = nid;

          if (srcId === dstId) {
            showWarning('No se permiten aristas-loop (una arista no puede conectar un nodo consigo mismo).');
            pendingEdgeSource = null;
            render();
            return;
          }

          const existsOpposite = edges.some(e => e.source === dstId && e.target === srcId);
          if (existsOpposite) {
            showWarning('Ya existe una arista en la dirección contraria. No se permite crear la arista opuesta.');
            pendingEdgeSource = null;
            render();
            return;
          }

          customPrompt('Peso de la arista', '1', 'number').then(weightStr => {
            if (weightStr === null) {
              pendingEdgeSource = null;
              render();
              return;
            }
            if (!validateWeight(weightStr)) {
              pendingEdgeSource = null;
              render();
              return;
            }
            const weight = (weightStr === '' || weightStr === null) ? null : parseFloat(weightStr);

            const existsSame = edges.some(e => e.source === srcId && e.target === dstId);
            if (existsSame) {
              showWarning('Ya existe una arista entre esos nodos en el mismo sentido. No se crean duplicados.');
              pendingEdgeSource = null;
              render();
              return;
            }

            edges.push({ id: genId(), source: srcId, target: dstId, type, weight });
            pendingEdgeSource = null;
            render();
          });
        }
      }
      return;
    }

    if(currentTool === 'delete'){
      if(nid){
        nodes = nodes.filter(x=>x.id !== nid);
        edges = edges.filter(e=> e.source !== nid && e.target !== nid);
        if(selectedNodeId === nid) selectedNodeId = null;
        render();
        return;
      }
      if(eid){
        edges = edges.filter(e=> e.id !== eid);
        render();
        return;
      }
      return;
    }

    if(currentTool === 'move'){
      dragging = true;
      dragOffset = {x: pos.x, y: pos.y};
      oldViewX = viewX;
      oldViewY = viewY;
      return;
    }

    if(currentTool === 'select'){
      if(nid){
        selectedNodeId = nid;
        const n = nodes.find(x=>x.id===nid);
        dragging = true;
        dragOffset = {x: worldPos.x - n.x, y: worldPos.y - n.y};
      } else {
        selectedNodeId = null;
      }
      render();
    }
  });

  window.addEventListener('mouseup', ()=>{ dragging = false; });

  // helpers
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function edgeTypeFromUI(){
    if(document.getElementById('edgeUndirected').checked) return 'undirected';
    if(document.getElementById('edgeBidirectional').checked) return 'bidirectional';
    return 'directed';
  }

  // Custom prompt using modal
  function customPrompt(title, defaultValue = '', inputType = 'text') {
    return new Promise((resolve) => {
      const modalTitle = document.getElementById('inputModalTitle');
      const input = document.getElementById('inputModalValue');
      modalTitle.textContent = title;
      input.value = defaultValue;
      input.type = inputType;
      input.focus();
      const modal = new bootstrap.Modal(document.getElementById('inputModal'), { backdrop: 'static', keyboard: false });
      modal.show();

      const confirmBtn = document.getElementById('inputModalConfirm');
      const handleConfirm = () => {
        const value = input.value.trim();
        resolve(value || null);
        modal.hide();
      };
      confirmBtn.addEventListener('click', handleConfirm);

      document.getElementById('inputModal').addEventListener('hidden.bs.modal', () => {
        resolve(null);
        confirmBtn.removeEventListener('click', handleConfirm);
      }, { once: true });
    });
  }

  // DESCARGAR PNG
  async function downloadGraphPng() {
    const defaultGraph = document.getElementById('filename').value.trim() || 'grafos';
    const graphName = await customPrompt('Nombre del grafo:', defaultGraph);
    if (graphName === null) return;
    const name = graphName.trim() || defaultGraph;
    render();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.png';
    a.click();
  }

  document.getElementById('btn-image').onclick = downloadGraphPng;

  // EXPORTAR JSON
  async function exportJSON() {
    const defaultName = document.getElementById('filename').value.trim() || 'grafos';
    const name = await customPrompt('Nombre del archivo JSON:', defaultName);
    if (name === null) return;
    const safeName = name.trim() || defaultName;
    const payload = {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        x: Number(n.x),
        y: Number(n.y),
        color: n.color || '#FBBD40',
        size: Number(n.size) || 22,
        et: n.et !== undefined ? Number(n.et) : undefined,
        lt: n.lt !== undefined ? Number(n.lt) : undefined
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || 'directed',
        weight: (e.weight == null ? null : Number(e.weight)),
        isCritical: !!e.isCritical,
        slack: e.slack !== undefined ? (Number.isFinite(e.slack) ? Number(e.slack) : e.slack) : undefined
      })),
      viewX, viewY,
      currentTool,
      selectedNodeId,
      pendingEdgeSource,
      criticalResultHTML: document.getElementById('critical-path-result') ? document.getElementById('critical-path-result').innerHTML : ''
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.getElementById('btn-export').onclick = exportJSON;

  // Import JSON
  document.getElementById('importFile').onchange = (ev) => {
    const f = ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if(!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) throw new Error('JSON inválido: debe contener arrays nodes y edges');

        const loopEdges = (obj.edges || []).filter(ed => ed && ed.source === ed.target);
        if (loopEdges.length > 0) {
          showWarning(`Se ignoraron ${loopEdges.length} aristas-loop (source === target) en el JSON importado.`);
        }

        nodes = obj.nodes.map(n => ({
          id: n.id,
          label: n.label,
          x: Number(n.x),
          y: Number(n.y),
          color: n.color || '#FBBD40',
          size: Number(n.size) || 22,
          et: (n.et !== undefined ? (isNaN(Number(n.et)) ? undefined : Number(n.et)) : undefined),
          lt: (n.lt !== undefined ? (isNaN(Number(n.lt)) ? undefined : Number(n.lt)) : undefined)
        }));

        edges = (obj.edges || []).filter(e => e && e.source !== e.target).map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type || 'directed',
          weight: (e.weight == null ? null : Number(e.weight)),
          isCritical: !!e.isCritical,
          slack: (e.slack !== undefined && e.slack !== null) ? (isNaN(Number(e.slack)) ? e.slack : Number(e.slack)) : undefined
        }));

        viewX = obj.viewX || 0;
        viewY = obj.viewY || 0;
        currentTool = obj.currentTool || 'select';
        selectedNodeId = (obj.selectedNodeId && nodes.some(n=>n.id===obj.selectedNodeId)) ? obj.selectedNodeId : null;
        pendingEdgeSource = (obj.pendingEdgeSource && nodes.some(n=>n.id===obj.pendingEdgeSource)) ? obj.pendingEdgeSource : null;

        if(document.getElementById('critical-path-result') && typeof obj.criticalResultHTML === 'string') {
          document.getElementById('critical-path-result').innerHTML = obj.criticalResultHTML;
        } else if(document.getElementById('critical-path-result')) {
          document.getElementById('critical-path-result').innerHTML = '';
        }

        render();
      } catch(err) {
        showWarning('Error al importar JSON: ' + err.message);
      }
    };
    reader.readAsText(f);
    ev.target.value = '';
  };

  // refresh matrix
  document.getElementById('refresh-matrix').onclick = buildAdjacencyMatrix;
  document.getElementById('show-matrix-modal').onclick = buildAdjacencyMatrix;

  // ---------- INICIO: reemplazar computeCriticalPath con algoritmo de asignación (Hungarian) ----------
  // computeCriticalPath ahora realiza una asignación (Hungarian) y muestra matrices
  function computeCriticalPath(mode = 'max') {
    if (nodes.length === 0) {
      showWarning('Agrega nodos primero.');
      return;
    }

    // Usamos la matriz de adyacencia que ya construye buildAdjacencyMatrix()
    const { matrix: adjMatrix, ordered } = buildAdjacencyMatrix();
    const n = ordered.length;
    if (n === 0) { showWarning('No hay nodos.'); return; }

    // Convertir la matrix adjMatrix (n x n) en matriz de costes para asignación
    const { costMatrix, displayMatrix } = buildCostMatrixForAssignment(adjMatrix, ordered, mode);

    // Ejecutar Hungarian (minimiza). Para maximizar, ya convertimos costos arriba.
    const { assignment, totalCost } = hungarian(costMatrix);

    // Construir matriz resultado (0/1) y pares asignados
    const resultMatrix = Array.from({length: n}, ()=>Array(n).fill(0));
    const pairs = [];
    for (let i = 0; i < assignment.length; i++) {
      const j = assignment[i];
      if (j >= 0 && j < n) {
        resultMatrix[i][j] = 1;
        // Marcar arista asignada si existe
        const uId = ordered[i].id, vId = ordered[j].id;
        edges.forEach(e => {
          if (e.source === uId && e.target === vId) e.isCritical = true;
          else if ((e.type === 'undirected' || e.type === 'bidirectional') &&
                   ((e.source === uId && e.target === vId) || (e.source === vId && e.target === uId))) e.isCritical = true;
        });
        pairs.push(`${ordered[i].label} → ${ordered[j].label}`);
      }
    }

    // Mostrar resultados: matriz de coste y matriz resultado
    const resultDiv = document.getElementById('critical-path-result');
    // Limpiar marca previa en nodos ET/LT
    for (let nd of ordered) { delete nd.et; delete nd.lt; }
    // quitar slack antiguo
    for (let e of edges) { delete e.slack; }

    const sign = (mode === 'max') ? 'Maximizar' : 'Minimizar';
    // Construir tablas HTML
    function matrixToHtml(mat, labels){
      // CABECERA SOLO CON LABELS
      let html = '<table class="table table-sm table-striped"><thead><tr>';
      html += labels.map(l => `<th>${l}</th>`).join('') + '</tr></thead><tbody>';
      
      // FILAS SIN PRIMERA COLUMNA DE LABELS
      for (let i = 0; i < mat.length; i++){
        html += `<tr>`;
        for (let j = 0; j < mat[i].length; j++) {
          const v = mat[i][j];
          html += `<td>${(Number.isFinite(v) ? (Math.abs(v) > 999999 ? '∞' : v.toFixed ? v.toFixed(2) : v) : '∞')}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
    }

    const labels = ordered.map(x => x.label);
    const costHtml = matrixToHtml(displayMatrix, labels); // displayMatrix: la matriz de costos legible (antes de transformar para maximizar)
    const resultHtml = matrixToHtml(resultMatrix, labels);

    const total = (mode === 'max') ? totalCost : totalCost; // totalCost ya se calcula sobre la matriz final usada por Hungarian
    resultDiv.innerHTML = `
      <div><strong>Asignación (${sign}):</strong></div>
      <div class="mt-2"><strong>Pares asignados:</strong> ${pairs.length ? pairs.join(', ') : '(ninguna)'}</div>
      <div class="mt-2"><strong>Costo total (según matriz usada):</strong> ${Number.isFinite(total) ? total.toFixed(2) : '∞'}</div>
      <hr style="border-color: rgba(255,255,255,0.08)" />
      <div><strong>Matriz de costos (entrada):</strong>${costHtml}</div>
      <div><strong>Matriz resultado (0 = no asignado, 1 = asignado):</strong>${resultHtml}</div>
      <small class="text-muted">Nota: celdas con "∞" significan que no existía arista y se usó coste grande para evitar asignación.</small>
    `;

    render();
  }

  // Construye matriz de costos a partir de la matriz de adyacencia M (que buildAdjacencyMatrix crea)
  // Devuelve costMatrix (para Hungarian) y displayMatrix (costes legibles, antes de la transformación para maximizar)
  function buildCostMatrixForAssignment(M, ordered, mode='max'){
    const n = ordered.length;
    // Copiar M para mostrar (si hay NaN o faltantes, interpretamos como 0 mostrado)
    const display = Array.from({length:n}, (_,i)=> Array.from({length:n}, (_,j) => {
      const v = (M && M[i] && M[i][j] != null) ? M[i][j] : 0;
      return Number.isFinite(v) ? v : 0;
    }));

    // Para Hungarian, necesitamos costos finitos y preferiblemente evitar auto-asignaciones.
    // Usamos un "big" suficientemente grande comparado a los costes existentes.
    let maxVal = 0;
    for (let i=0;i<n;i++) for (let j=0;j<n;j++) if (Number.isFinite(display[i][j])) maxVal = Math.max(maxVal, Math.abs(display[i][j]));
    const big = Math.max(1e6, (maxVal + 1) * 1000);

    // Construir matriz de costos (clon)
    const cost = Array.from({length:n}, (_,i)=> Array.from({length:n}, (_,j) => {
      let val = (M && M[i] && M[i][j] != null) ? Number(M[i][j]) : Infinity;
      if (!Number.isFinite(val)) val = big;
      // evitar auto-asignación
      if (i === j) val = big;
      return val;
    }));

    // Si el usuario pidió maximizar, transformamos para minimizar: cost' = Cmax - cost
    if (mode === 'max') {
      // Para transformar correctamente, calcular Cmax finito (no contar big)
      let Cmax = 0;
      for (let i=0;i<n;i++){
        for (let j=0;j<n;j++){
          if (cost[i][j] < big) Cmax = Math.max(Cmax, cost[i][j]);
        }
      }
      Cmax = Cmax || 0;
      // Si todos son big (no aristas), dejar la matriz como está (no hay asignación real)
      if (Cmax === 0) {
        // convertimos: cost' = (big - cost) para mantener big as low priority
        for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
          if (cost[i][j] >= big) cost[i][j] = big;
          else cost[i][j] = (Cmax + 1) - cost[i][j]; // invertir para max
        }
      } else {
        for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
          if (cost[i][j] >= big) cost[i][j] = big;
          else cost[i][j] = Cmax - cost[i][j];
        }
      }
    }

    return { costMatrix: cost, displayMatrix: display };
  }

  // Hungarian algorithm (O(n^3)), input: square matrix of finite numbers (use big for "forbidden")
  // returns { assignment: array where assignment[i] = column assigned to row i (or -1), totalCost }
  function hungarian(costMatrix) {
    // Pad to square if necessary (should already be square here)
    let n = costMatrix.length;
    if (n === 0) return { assignment: [], totalCost: 0 };

    // Clone matrix and ensure numeric
    const a = Array.from({length:n}, (_,i)=> Array.from({length:n}, (_,j)=> Number(costMatrix[i][j])));

    const u = Array(n+1).fill(0); // potential for rows
    const v = Array(n+1).fill(0); // potential for cols
    const p = Array(n+1).fill(0); // p[j] = i matched to j
    const way = Array(n+1).fill(0);

    for (let i = 1; i <= n; ++i) {
      p[0] = i;
      let j0 = 0;
      const minv = Array(n+1).fill(Infinity);
      const used = Array(n+1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= n; ++j) {
          if (used[j]) continue;
          const cur = a[i0-1][j-1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; ++j) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
          else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const assignment = Array(n).fill(-1);
    for (let j = 1; j <= n; ++j) {
      if (p[j] > 0 && p[j] <= n) assignment[p[j]-1] = j-1;
    }

    let total = 0;
    for (let i = 0; i < n; i++) {
      const j = assignment[i];
      if (j >= 0 && j < n && Number.isFinite(a[i][j])) total += a[i][j];
      else total = Infinity;
    }

    return { assignment, totalCost: total };
  }
  // ---------- FIN: reemplazo computeCriticalPath ----------

  // Initial UI state
  setTool('select');
  render();

  // Expose for debugging (opcional)
  window.__G = { nodes, edges, render, setTool };
})();