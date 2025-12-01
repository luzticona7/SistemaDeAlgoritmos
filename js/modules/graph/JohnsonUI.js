// js/modules/graph/JohnsonUI.js
import { GraphRenderer } from '../../core/GraphRenderer.js';
import { computeCriticalPath } from '../algorithms/Johnson.js';

const canvas = document.getElementById('canvas');
const renderer = new GraphRenderer(canvas);

// Estado local
let nodes = (window.__G && window.__G.nodes) ? window.__G.nodes : [];
let edges = (window.__G && window.__G.edges) ? window.__G.edges : [];
let viewX = (window.__G && window.__G.viewX) ? window.__G.viewX : 0;
let viewY = (window.__G && window.__G.viewY) ? window.__G.viewY : 0;
let currentTool = (window.__G && window.__G.currentTool) ? window.__G.currentTool : 'select';
let selectedNodeId = (window.__G && window.__G.selectedNodeId) ? window.__G.selectedNodeId : null;
let pendingEdgeSource = (window.__G && window.__G.pendingEdgeSource) ? window.__G.pendingEdgeSource : null;
let mousePos = { x: 0, y: 0 };
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let oldViewX = 0, oldViewY = 0;

function genId() { return Math.random().toString(36).slice(2, 9); }

// Modal de advertencia personalizado (estilo algorithmU.js)
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

// Custom prompt usando el modal existente del HTML
function customPrompt(title, defaultValue = '', inputType = 'text') {
  return new Promise((resolve) => {
    const modalTitle = document.getElementById('inputModalTitle');
    const input = document.getElementById('inputModalValue');
    modalTitle.textContent = title;
    input.value = defaultValue;
    input.type = inputType;
    
    const modal = new bootstrap.Modal(document.getElementById('inputModal'), { backdrop: 'static', keyboard: false });
    modal.show();

    setTimeout(() => input.focus(), 300);

    const confirmBtn = document.getElementById('inputModalConfirm');
    const handleConfirm = () => {
      const value = input.value.trim();
      modal.hide();
      resolve(value || null);
    };

    const handleKeypress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    input.addEventListener('keypress', handleKeypress);

    document.getElementById('inputModal').addEventListener('hidden.bs.modal', () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      input.removeEventListener('keypress', handleKeypress);
      if (!modal._isShown) resolve(null);
    }, { once: true });
  });
}

// Diálogo de optimización personalizado (estilo algorithmU.js)
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
                Maximizar (Ruta Crítica)
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
                Minimizar (Ruta Más Corta)
              </button>
            </div>
            
            <div class="mt-3">
              <small class="text-warning" style="opacity: 0.8;">
                <i class="bi bi-info-circle me-1"></i>
                Ruta crítica para duraciones máximas
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

function resizeCanvas() {
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  const w = Math.max(400, Math.floor(rect.width));
  const h = Math.max(300, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);
resizeCanvas();

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return { x: (evt.clientX - rect.left), y: (evt.clientY - rect.top) };
}

function getWorldPos(screenPos) {
  return { x: screenPos.x + viewX, y: screenPos.y + viewY };
}

function nextLabel() {
  const idx = nodes.length;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let n = idx, label = '';
  do { label = letters[n % 26] + label; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return label;
}

function hitNode(pos) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const r = n.size || 22;
    if (Math.hypot(pos.x - n.x, pos.y - n.y) <= r + 4) return n.id;
  }
  return null;
}

function hitEdge(pos) {
  const threshold = 6;
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.source);
    const b = nodes.find(n => n.id === e.target);
    if (!a || !b) continue;
    if (a.id === b.id) {
      const r = (a.size || 22) + 14;
      const cx = a.x + r, cy = a.y - r;
      const d = Math.hypot(pos.x - cx, pos.y - cy);
      if (Math.abs(d - r) < threshold) return e.id;
      continue;
    }
    const A = renderer.projectEdgePoint(a, b);
    const B = renderer.projectEdgePoint(b, a);
    const dx = B.x - A.x, dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;
    const perpX = -dy / dist * renderer.curveAmount;
    const perpY = dx / dist * renderer.curveAmount;
    const control = { x: (A.x + B.x) / 2 + perpX, y: (A.y + B.y) / 2 + perpY };
    
    function pointToSeg(p, X, Y) {
      const APx = p.x - X.x, APy = p.y - X.y;
      const ABx = Y.x - X.x, ABy = Y.y - X.y;
      const ab2 = ABx * ABx + ABy * ABy;
      if (ab2 === 0) return Math.hypot(p.x - X.x, p.y - X.y);
      const t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / ab2));
      const Cx = X.x + ABx * t, Cy = X.y + ABy * t;
      return Math.hypot(p.x - Cx, p.y - Cy);
    }
    const d1 = pointToSeg(pos, A, control);
    const d2 = pointToSeg(pos, control, B);
    const d = Math.min(d1, d2);
    if (d < threshold) return e.id;
  }
  return null;
}

function render() {
  renderer.draw(nodes, edges, viewX, viewY, pendingEdgeSource, mousePos, selectedNodeId);
  syncPanels();
}

function syncPanels() {
  const tbody = document.getElementById('edges-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    edges.forEach((e, idx) => {
      const from = nodes.find(n => n.id === e.source);
      const to = nodes.find(n => n.id === e.target);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${from ? from.label : '?'}</td>
        <td>${to ? to.label : '?'}</td>
        <td>
          <select class="form-select form-select-sm edge-type" data-id="${e.id}">
            <option value="directed" ${e.type === 'directed' ? 'selected' : ''}>Dirigida</option>
            <option value="undirected" ${e.type === 'undirected' ? 'selected' : ''}>No dirigida</option>
            <option value="bidirectional" ${e.type === 'bidirectional' ? 'selected' : ''}>Bidireccional</option>
          </select>
        </td>
        <td><input type="number" step="any" min="0" class="form-control form-control-sm edge-weight" data-id="${e.id}" value="${e.weight ?? ''}" style="width:85px" placeholder="peso"></td>
        <td>${e.slack !== undefined ? Math.round(e.slack) : ''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger edge-del" data-id="${e.id}" title="Eliminar" style="color: #2F0C33"><i class="bi bi-trash"></i></button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edge-type').forEach(sel => {
      sel.onchange = (ev) => {
        const id = ev.target.dataset.id;
        const e = edges.find(x => x.id === id);
        if (e) { e.type = ev.target.value; render(); }
      };
    });
    
    tbody.querySelectorAll('.edge-weight').forEach(inp => {
      inp.onchange = (ev) => {
        const id = ev.target.dataset.id;
        const e = edges.find(x => x.id === id);
        if (e) {
          if (validateWeight(ev.target.value)) {
            e.weight = ev.target.value === '' ? null : parseFloat(ev.target.value);
            render();
          } else {
            ev.target.value = e.weight ?? '';
          }
        }
      };
    });
    
    tbody.querySelectorAll('.edge-del').forEach(btn => {
      btn.onclick = (ev) => {
        const id = ev.currentTarget.dataset.id;
        edges = edges.filter(x => x.id !== id);
        render();
      };
    });
  }
}

// Toolbar buttons
document.getElementById('btn-select')?.addEventListener('click', () => { currentTool = 'select'; render(); });
document.getElementById('btn-move')?.addEventListener('click', () => { currentTool = 'move'; render(); });
document.getElementById('btn-add-node')?.addEventListener('click', () => { currentTool = 'addNode'; render(); });
document.getElementById('btn-add-edge')?.addEventListener('click', () => { currentTool = 'addEdge'; render(); });
document.getElementById('btn-delete')?.addEventListener('click', () => { currentTool = 'delete'; render(); });
document.getElementById('btn-clear')?.addEventListener('click', () => {
  nodes = [];
  edges = [];
  selectedNodeId = null;
  pendingEdgeSource = null;
  const resultDiv = document.getElementById('critical-path-result');
  if (resultDiv) resultDiv.innerHTML = '';
  render();
});

// Canvas events
canvas.addEventListener('mousemove', (ev) => {
  mousePos = getMousePos(ev);
  const worldPos = getWorldPos(mousePos);
  if (dragging) {
    if (currentTool === 'select' && selectedNodeId) {
      const n = nodes.find(x => x.id === selectedNodeId);
      n.x = Math.max(viewX + 10, Math.min(viewX + canvas.clientWidth - 10, worldPos.x - dragOffset.x));
      n.y = Math.max(viewY + 10, Math.min(viewY + canvas.clientHeight - 10, worldPos.y - dragOffset.y));
      render();
    } else if (currentTool === 'move') {
      viewX = oldViewX - (mousePos.x - dragOffset.x);
      viewY = oldViewY - (mousePos.y - dragOffset.y);
      render();
    }
  } else {
    if (pendingEdgeSource) render();
  }
});

canvas.addEventListener('mousedown', async (ev) => {
  const pos = getMousePos(ev);
  const worldPos = getWorldPos(pos);
  const nid = hitNode(worldPos);
  const eid = hitEdge(worldPos);

  if (currentTool === 'addNode') {
    const newNode = { id: genId(), label: nextLabel(), x: worldPos.x, y: worldPos.y, color: '#FBBD40', size: 22 };
    nodes.push(newNode);
    selectedNodeId = newNode.id;
    render();
    return;
  }

  if (currentTool === 'addEdge') {
    if (nid) {
      if (!pendingEdgeSource) {
        pendingEdgeSource = nid;
        render();
      } else {
        const srcId = pendingEdgeSource;
        const dstId = nid;
        
        if (srcId === dstId) {
          await showWarning('No se permiten aristas-loop (una arista no puede conectar un nodo consigo mismo).');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const existsOpposite = edges.some(e => e.source === dstId && e.target === srcId);
        if (existsOpposite) {
          await showWarning('Ya existe una arista en la dirección contraria. No se permite crear la arista opuesta.');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const weightStr = await customPrompt('Peso de la arista', '1', 'number');
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
          await showWarning('Ya existe una arista entre esos nodos en el mismo sentido. No se crean duplicados.');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const type = document.getElementById('edgeUndirected')?.checked ? 'undirected' : 
                     (document.getElementById('edgeBidirectional')?.checked ? 'bidirectional' : 'directed');
        
        edges.push({ id: genId(), source: srcId, target: dstId, type, weight });
        pendingEdgeSource = null;
        render();
      }
    }
    return;
  }

  if (currentTool === 'delete') {
    if (nid) {
      nodes = nodes.filter(x => x.id !== nid);
      edges = edges.filter(e => e.source !== nid && e.target !== nid);
      if (selectedNodeId === nid) selectedNodeId = null;
      render();
      return;
    }
    if (eid) {
      edges = edges.filter(e => e.id !== eid);
      render();
      return;
    }
    return;
  }

  if (currentTool === 'move') {
    dragging = true;
    dragOffset = { x: ev.clientX, y: ev.clientY };
    oldViewX = viewX;
    oldViewY = viewY;
    return;
  }

  if (currentTool === 'select') {
    if (nid) {
      selectedNodeId = nid;
      const n = nodes.find(x => x.id === nid);
      dragging = true;
      dragOffset = { x: worldPos.x - n.x, y: worldPos.y - n.y };
    } else {
      selectedNodeId = null;
    }
    render();
  }
});

window.addEventListener('mouseup', () => { dragging = false; });

// Compute critical path con modal de optimización
document.getElementById('btn-compute-critical')?.addEventListener('click', async () => {
  if (nodes.length === 0 || edges.length === 0) {
    await showWarning('Agrega nodos y aristas primero.');
    return;
  }
  
  const mode = await showOptimizationDialog();
  if (mode === null) return;
  
  const res = computeCriticalPath(nodes, edges, mode === 'min' ? 'min' : 'max');
  
  if (res.error) {
    await showWarning(res.error);
    return;
  }
  
  const etById = new Map((res.nodes || []).map(n => [n.id, n.et]));
  const ltById = new Map((res.nodes || []).map(n => [n.id, n.lt]));
  nodes = nodes.map(n => ({ ...n, et: etById.get(n.id), lt: ltById.get(n.id) }));
  
  edges = edges.map(e => {
    const fromRes = (res.edges || []).find(re => re.id === e.id);
    if (fromRes) return { ...e, isCritical: !!fromRes.isCritical, slack: fromRes.slack };
    return { ...e, isCritical: false, slack: e.slack };
  });

  const resultDiv = document.getElementById('critical-path-result');
  if (resultDiv && res.resultHTML) resultDiv.innerHTML = res.resultHTML;
  
  render();
});

// Export / Import
document.getElementById('btn-export')?.addEventListener('click', () => {
  const payload = { nodes, edges, viewX, viewY, currentTool, selectedNodeId, pendingEdgeSource };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (document.getElementById('filename')?.value || 'grafo') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('importFile')?.addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
        await showWarning('JSON inválido: debe contener arrays de nodes y edges');
        return;
      }
      nodes = obj.nodes;
      edges = obj.edges;
      viewX = obj.viewX || 0;
      viewY = obj.viewY || 0;
      render();
    } catch (err) {
      await showWarning('Error al importar JSON: ' + err.message);
    }
  };
  reader.readAsText(f);
  ev.target.value = '';
});

// Inicializar
render();
window.__G_MOD = { nodes, edges, render };