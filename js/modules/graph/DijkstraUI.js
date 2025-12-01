// js/modules/graph/DijkstraUI.js
import { GraphRenderer } from '../../core/GraphRenderer.js';
import { computeDijkstra } from '../algorithms/Dijkstra.js';

const canvas = document.getElementById('canvas');
const renderer = new GraphRenderer(canvas);

// Estado local
let nodes = [];
let edges = [];
let viewX = 0;
let viewY = 0;
let currentTool = 'select';
let selectedNodeId = null;
let pendingEdgeSource = null;
let mousePos = { x: 0, y: 0 };
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let oldViewX = 0, oldViewY = 0;

// 🔧 FIX: Flag para prevenir renders recursivos
let isUpdatingPanels = false;

function genId() { return Math.random().toString(36).slice(2, 9); }

// Modal de advertencia personalizado
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

// Diálogo de optimización personalizado (igual que Johnson)
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
                Maximizar (Ruta Más Larga)
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
                Dijkstra adaptado para max/min
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

// Diálogo para seleccionar nodo de inicio y fin
function showNodeSelectionDialog(nodes, title) {
  return new Promise((resolve) => {
    const modalId = 'nodeSelectionModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) {
      existingModal.remove();
    }

    const selectionModal = document.createElement('div');
    selectionModal.className = 'modal fade';
    selectionModal.id = modalId;
    selectionModal.setAttribute('tabindex', '-1');
    selectionModal.setAttribute('aria-hidden', 'true');
    selectionModal.setAttribute('data-bs-backdrop', 'static');
    selectionModal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="
          background: linear-gradient(135deg, var(--dark-purple, #2F0C33), var(--violet-red, #8C144E));
          border: 2px solid var(--carrot-orange, #EE9029);
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(47, 12, 51, 0.7);
        ">
          <div class="modal-header border-0 pb-2">
            <h5 class="modal-title w-100 text-center" style="
              font-family: 'Poppins', sans-serif;
              font-weight: 700;
              color: var(--pastel-orange, #FBBD40);
              text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
              font-size: 1.3rem;
            ">
              <i class="bi bi-signpost-2-fill me-2"></i>${title}
            </h5>
          </div>
          
          <div class="modal-body p-4">
            <p class="text-white text-center mb-3" style="font-size: 1rem;">
              Selecciona un nodo:
            </p>
            
            <div class="d-flex flex-column gap-2" id="nodeButtonsContainer"></div>
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

    document.body.appendChild(selectionModal);

    const container = selectionModal.querySelector('#nodeButtonsContainer');
    nodes.forEach(node => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-node-select animate__animated animate__fadeInUp';
      btn.style.cssText = `
        background: linear-gradient(45deg, #8C144E, #C2185B);
        border: 2px solid #FBBD40;
        color: white;
        font-weight: 600;
        padding: 10px 15px;
        border-radius: 10px;
        transition: all 0.3s ease;
        font-family: 'Poppins', sans-serif;
      `;
      btn.innerHTML = `<i class="bi bi-circle-fill me-2" style="color: ${node.color || '#FBBD40'}"></i>${node.label}`;
      
      btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 5px 15px rgba(251, 189, 64, 0.4)';
      });
      
      btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
      
      btn.addEventListener('click', function() {
        this.style.background = 'linear-gradient(45deg, #00C853, #64DD17)';
        this.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Seleccionado';
        
        setTimeout(() => {
          modal.hide();
          resolve(node.id);
        }, 500);
      });
      
      container.appendChild(btn);
    });

    const modal = new bootstrap.Modal(selectionModal);
    modal.show();

    selectionModal.querySelector('.btn-cancel').addEventListener('click', () => {
      resolve(null);
    });

    selectionModal.addEventListener('hidden.bs.modal', () => {
      if (selectionModal.parentNode) {
        selectionModal.parentNode.removeChild(selectionModal);
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
    if (a.id === b.id) continue;
    
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
  // 🔧 FIX: Solo sincronizar si no estamos ya actualizando
  if (!isUpdatingPanels) {
    syncPanels();
  }
}

function syncPanels() {
  // 🔧 FIX: Activar flag para prevenir renders recursivos
  isUpdatingPanels = true;
  
  // Sincronizar panel de propiedades del nodo
  const noSelection = document.getElementById('no-selection');
  const nodeForm = document.getElementById('node-form');
  
  if (selectedNodeId) {
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      noSelection.classList.add('d-none');
      nodeForm.classList.remove('d-none');
      
      document.getElementById('node-label').value = node.label || '';
      document.getElementById('node-color').value = node.color || '#FBBD40';
      document.getElementById('node-size').value = node.size || 22;
    }
  } else {
    noSelection.classList.remove('d-none');
    nodeForm.classList.add('d-none');
  }
  
  // Sincronizar tabla de aristas
  const tbody = document.getElementById('edges-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    edges.forEach((e, idx) => {
      const from = nodes.find(n => n.id === e.source);
      const to = nodes.find(n => n.id === e.target);
      const tr = document.createElement('tr');
      
      // 🔧 FIX: Asegurar que el peso se muestre correctamente sin redondeo innecesario
      const displayWeight = e.weight != null ? e.weight : '';
      
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
        <td><input type="number" step="any" min="0" class="form-control form-control-sm edge-weight" data-id="${e.id}" value="${displayWeight}" style="width:85px" placeholder="peso"></td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger edge-del" data-id="${e.id}" title="Eliminar" style="color: #2F0C33"><i class="bi bi-trash"></i></button></td>
      `;
      tbody.appendChild(tr);
    });

    // 🔧 FIX: Cambiar a 'input' event para actualización en tiempo real
    tbody.querySelectorAll('.edge-type').forEach(sel => {
      sel.addEventListener('change', (ev) => {
        const id = ev.target.dataset.id;
        const e = edges.find(x => x.id === id);
        if (e) { 
          e.type = ev.target.value; 
          isUpdatingPanels = false;
          render(); 
        }
      });
    });
    
    // 🔧 FIX: Usar 'blur' en lugar de 'change' para evitar triggers múltiples
    tbody.querySelectorAll('.edge-weight').forEach(inp => {
      inp.addEventListener('blur', (ev) => {
        const id = ev.target.dataset.id;
        const e = edges.find(x => x.id === id);
        if (e) {
          const newValue = ev.target.value.trim();
          
          if (newValue === '') {
            e.weight = null;
            isUpdatingPanels = false;
            render();
          } else if (validateWeight(newValue)) {
            // 🔧 FIX: Convertir a número de forma explícita
            const parsedWeight = parseFloat(newValue);
            if (!isNaN(parsedWeight)) {
              e.weight = parsedWeight;
              isUpdatingPanels = false;
              render();
            }
          } else {
            // Restaurar valor anterior si es inválido
            ev.target.value = e.weight ?? '';
          }
        }
      });
      
      // 🔧 FIX: Permitir Enter para confirmar sin duplicar eventos
      inp.addEventListener('keypress', (ev) => {
        if (ev.key === 'Enter') {
          ev.target.blur(); // Dispara el evento blur que ya maneja la actualización
        }
      });
    });
    
    tbody.querySelectorAll('.edge-del').forEach(btn => {
      btn.onclick = (ev) => {
        const id = ev.currentTarget.dataset.id;
        edges = edges.filter(x => x.id !== id);
        isUpdatingPanels = false;
        render();
      };
    });
  }
  
  // 🔧 FIX: Desactivar flag al final
  isUpdatingPanels = false;
}

// Event listeners para propiedades del nodo
document.getElementById('node-save')?.addEventListener('click', () => {
  if (!selectedNodeId) return;
  const node = nodes.find(n => n.id === selectedNodeId);
  if (node) {
    node.label = document.getElementById('node-label').value || node.label;
    node.color = document.getElementById('node-color').value;
    node.size = parseInt(document.getElementById('node-size').value);
    render();
  }
});

document.getElementById('node-delete')?.addEventListener('click', () => {
  if (!selectedNodeId) return;
  nodes = nodes.filter(n => n.id !== selectedNodeId);
  edges = edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId);
  selectedNodeId = null;
  render();
});

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
  const resultDiv = document.getElementById('dijkstra-result');
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
          await showWarning('No se permiten loops en Dijkstra.');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const existsOpposite = edges.some(e => e.source === dstId && e.target === srcId);
        if (existsOpposite) {
          await showWarning('Ya existe una arista en la dirección contraria.');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const weightStr = await customPrompt('Peso de la arista (debe ser ≥ 0)', '1', 'number');
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
        
        // 🔧 FIX: Asegurar conversión explícita a número
        const weight = (weightStr === '' || weightStr === null) ? 1 : parseFloat(weightStr);
        
        if (weight < 0) {
          await showWarning('Dijkstra requiere pesos no negativos (≥ 0).');
          pendingEdgeSource = null;
          render();
          return;
        }
        
        const existsSame = edges.some(e => e.source === srcId && e.target === dstId);
        if (existsSame) {
          await showWarning('Ya existe una arista entre esos nodos.');
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

// Variable para almacenar el último resultado del algoritmo
let lastAlgorithmResult = null;

// Compute Dijkstra con modal de optimización
document.getElementById('btn-compute-dijkstra')?.addEventListener('click', async () => {
  if (nodes.length === 0 || edges.length === 0) {
    await showWarning('Agrega nodos y aristas primero.');
    return;
  }
  
  // Verificar que todos los pesos sean no negativos
  for (const e of edges) {
    if (e.weight == null || e.weight < 0) {
      await showWarning('Todas las aristas deben tener peso no negativo (≥ 0) para Dijkstra.');
      return;
    }
  }
  
  // Mostrar modal de optimización
  const mode = await showOptimizationDialog();
  if (mode === null) return;
  
  // Seleccionar nodo de inicio
  const startNodeId = await showNodeSelectionDialog(nodes, 'Selecciona el nodo de INICIO');
  if (startNodeId === null) return;
  
  // Seleccionar nodo de destino
  const endNodeId = await showNodeSelectionDialog(nodes, 'Selecciona el nodo de DESTINO');
  if (endNodeId === null) return;
  
  if (startNodeId === endNodeId) {
    await showWarning('El nodo de inicio y destino deben ser diferentes.');
    return;
  }
  
  const res = computeDijkstra(nodes, edges, startNodeId, endNodeId, mode);
  
  if (res.error) {
    await showWarning(res.error);
    return;
  }
  
  // **GUARDAR EL RESULTADO DEL ALGORITMO**
  lastAlgorithmResult = {
    mode: mode,
    startNodeId: startNodeId,
    endNodeId: endNodeId,
    resultHTML: res.resultHTML,
    distance: res.distance,
    path: res.path
  };
  
  // Actualizar nodos con distancias
  const distById = new Map((res.nodes || []).map(n => [n.id, n.distance]));
  nodes = nodes.map(n => ({ ...n, distance: distById.get(n.id) }));
  
  // Marcar aristas críticas (en el camino más corto/largo)
  edges = edges.map(e => {
    const fromRes = (res.edges || []).find(re => re.id === e.id);
    if (fromRes) return { ...e, isCritical: !!fromRes.isCritical };
    return { ...e, isCritical: false };
  });

  const resultDiv = document.getElementById('dijkstra-result');
  if (resultDiv && res.resultHTML) resultDiv.innerHTML = res.resultHTML;
  
  render();
});

// Export mejorado
document.getElementById('btn-export')?.addEventListener('click', () => {
  // Preparar datos completos para exportar
  const payload = {
    // Datos del grafo
    nodes: nodes.map(n => ({
      id: n.id,
      label: n.label,
      x: n.x,
      y: n.y,
      color: n.color,
      size: n.size,
      distance: n.distance
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
      isCritical: e.isCritical
    })),
    
    // Estado de la vista
    viewX: viewX,
    viewY: viewY,
    currentTool: currentTool,
    selectedNodeId: selectedNodeId,
    pendingEdgeSource: pendingEdgeSource,
    
    // Resultado del algoritmo
    algorithmResult: lastAlgorithmResult,
    
    // Metadatos
    exportDate: new Date().toISOString(),
    version: '1.0',
    algorithm: 'Dijkstra'
  };
  
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = document.getElementById('filename')?.value || 'dijkstra';
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Import mejorado
document.getElementById('importFile')?.addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      
      // Validar estructura
      if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
        await showWarning('JSON inválido: debe contener arrays de nodes y edges');
        return;
      }
      
      // Restaurar nodos (con distancias si existen)
      nodes = obj.nodes.map(n => ({
        id: n.id,
        label: n.label || '',
        x: n.x || 0,
        y: n.y || 0,
        color: n.color || '#FBBD40',
        size: n.size || 22,
        distance: n.distance
      }));
      
      // 🔧 FIX: Restaurar aristas con conversión explícita de pesos
      edges = obj.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || 'directed',
        weight: e.weight != null ? parseFloat(e.weight) : null,
        isCritical: e.isCritical || false
      }));
      
      // Restaurar estado de vista
      viewX = obj.viewX || 0;
      viewY = obj.viewY || 0;
      currentTool = obj.currentTool || 'select';
      selectedNodeId = obj.selectedNodeId || null;
      pendingEdgeSource = obj.pendingEdgeSource || null;
      
      // Restaurar resultado del algoritmo si existe
      if (obj.algorithmResult) {
        lastAlgorithmResult = obj.algorithmResult;
        
        // Mostrar resultado en la UI
        const resultDiv = document.getElementById('dijkstra-result');
        if (resultDiv && lastAlgorithmResult.resultHTML) {
          resultDiv.innerHTML = lastAlgorithmResult.resultHTML;
        }
      } else {
        // Limpiar resultado si no hay
        const resultDiv = document.getElementById('dijkstra-result');
        if (resultDiv) resultDiv.innerHTML = '';
        lastAlgorithmResult = null;
      }
      
      render();
      
      // Mensaje de éxito
      await showWarning(`Archivo importado exitosamente.<br><br>
        <strong>Nodos:</strong> ${nodes.length}<br>
        <strong>Aristas:</strong> ${edges.length}<br>
        <strong>Resultado guardado:</strong> ${obj.algorithmResult ? 'Sí' : 'No'}`);
      
    } catch (err) {
      await showWarning('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(f);
  ev.target.value = '';
});
window.addEventListener('load', () => {
  
  // ✅ Verificar que GraphApp existe
  if (!window.GraphApp) {
    console.error('❌ GraphApp no está inicializado. Asegúrate de cargar app.js primero.');
    return;
  }
  
  const app = window.GraphApp;
  console.log('%c✓ DijkstraUI: Módulo cargado correctamente', 
    'color: #00ff88; background: #000; font-size: 14px; padding: 4px;');
  
  // ===== BOTÓN CALCULAR DIJKSTRA =====
  const btnDijkstra = document.getElementById('btn-compute-dijkstra');
  if (btnDijkstra) {
    btnDijkstra.addEventListener('click', async () => {
      await computeDijkstra(app);
    });
  }
  
  // ===== FUNCIÓN PRINCIPAL DE DIJKSTRA =====
  async function computeDijkstra(app) {
    const { model, modals } = app;
    
    // Validar que hay nodos
    if (model.nodes.length === 0) {
      modals.showWarning('No hay nodos en el grafo. Crea al menos 2 nodos.');
      return;
    }
    
    if (model.nodes.length < 2) {
      modals.showWarning('Necesitas al menos 2 nodos para ejecutar Dijkstra.');
      return;
    }
    
    // Validar que hay aristas
    if (model.edges.length === 0) {
      modals.showWarning('No hay aristas en el grafo. Crea al menos una arista.');
      return;
    }
    
    // Validar pesos no negativos
    const hasNegativeWeight = model.edges.some(e => e.weight < 0);
    if (hasNegativeWeight) {
      modals.showWarning('Dijkstra requiere pesos no negativos (≥ 0). Ajusta los pesos de las aristas.');
      return;
    }
    
    // Solicitar nodo de inicio
    const startLabel = await modals.customPrompt(
      '¿Desde qué nodo quieres iniciar?', 
      model.nodes[0].label, 
      'text'
    );
    if (!startLabel) return;
    
    const startNode = model.nodes.find(n => n.label === startLabel);
    if (!startNode) {
      modals.showWarning(`No se encontró el nodo "${startLabel}"`);
      return;
    }
    
    // Solicitar nodo de destino
    const endLabel = await modals.customPrompt(
      '¿Hasta qué nodo quieres llegar?', 
      model.nodes[model.nodes.length - 1].label, 
      'text'
    );
    if (!endLabel) return;
    
    const endNode = model.nodes.find(n => n.label === endLabel);
    if (!endNode) {
      modals.showWarning(`No se encontró el nodo "${endLabel}"`);
      return;
    }
    
    if (startNode.id === endNode.id) {
      modals.showWarning('El nodo de inicio y destino deben ser diferentes.');
      return;
    }
    
    // ✅ Ejecutar algoritmo de Dijkstra
    const result = dijkstra(model.nodes, model.edges, startNode.id, endNode.id);
    
    if (!result.found) {
      modals.showWarning(`No hay camino desde "${startLabel}" hasta "${endLabel}"`);
      displayResult('No se encontró camino', []);
      return;
    }
    
    // ✅ Mostrar resultado
    displayResult(
      `Distancia más corta: ${result.distance.toFixed(2)}`,
      result.path
    );
    
    // ✅ Resaltar camino en el grafo
    highlightPath(app, result.pathEdges);
  }
  
  // ===== ALGORITMO DE DIJKSTRA =====
  function dijkstra(nodes, edges, startId, endId) {
    const distances = {};
    const previous = {};
    const visited = new Set();
    const unvisited = new Set();
    
    // Inicializar distancias
    nodes.forEach(n => {
      distances[n.id] = Infinity;
      previous[n.id] = null;
      unvisited.add(n.id);
    });
    distances[startId] = 0;
    
    // Construir grafo de adyacencia (considerando tipo de arista)
    const adjacency = {};
    nodes.forEach(n => adjacency[n.id] = []);
    
    edges.forEach(e => {
      if (e.type === 'undirected') {
        // No dirigida: agregar en ambas direcciones
        adjacency[e.source].push({ target: e.target, weight: e.weight });
        adjacency[e.target].push({ target: e.source, weight: e.weight });
      } else {
        // Dirigida o bidireccional (ya tiene 2 aristas separadas)
        adjacency[e.source].push({ target: e.target, weight: e.weight });
      }
    });
    
    // Algoritmo de Dijkstra
    while (unvisited.size > 0) {
      // Encontrar nodo no visitado con menor distancia
      let currentId = null;
      let minDist = Infinity;
      
      for (const id of unvisited) {
        if (distances[id] < minDist) {
          minDist = distances[id];
          currentId = id;
        }
      }
      
      if (currentId === null || distances[currentId] === Infinity) {
        break; // No hay más nodos alcanzables
      }
      
      unvisited.delete(currentId);
      visited.add(currentId);
      
      // Si llegamos al destino, podemos terminar
      if (currentId === endId) {
        break;
      }
      
      // Actualizar distancias de vecinos
      const neighbors = adjacency[currentId] || [];
      neighbors.forEach(({ target, weight }) => {
        if (!visited.has(target)) {
          const newDist = distances[currentId] + weight;
          if (newDist < distances[target]) {
            distances[target] = newDist;
            previous[target] = currentId;
          }
        }
      });
    }
    
    // Reconstruir camino
    if (distances[endId] === Infinity) {
      return { found: false, distance: Infinity, path: [], pathEdges: [] };
    }
    
    const path = [];
    let current = endId;
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    
    // Encontrar aristas del camino
    const pathEdges = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = edges.find(e => 
        e.source === path[i] && e.target === path[i + 1]
      );
      if (edge) pathEdges.push(edge.id);
    }
    
    return {
      found: true,
      distance: distances[endId],
      path: path,
      pathEdges: pathEdges,
      distances: distances
    };
  }
  
  // ===== MOSTRAR RESULTADO =====
  function displayResult(message, path) {
    const resultDiv = document.getElementById('dijkstra-result');
    if (!resultDiv) return;
    
    const pathLabels = path.map(id => {
      const node = app.model.nodes.find(n => n.id === id);
      return node ? node.label : id;
    }).join(' → ');
    
    resultDiv.innerHTML = `
      <div class="alert alert-success mb-0" role="alert">
        <strong><i class="bi bi-check-circle me-2"></i>${message}</strong>
        ${pathLabels ? `<br><small>Camino: ${pathLabels}</small>` : ''}
      </div>
    `;
  }
  
  // ===== RESALTAR CAMINO EN EL GRAFO =====
  function highlightPath(app, pathEdgeIds) {
    // Limpiar resaltados previos
    app.model.edges.forEach(e => {
      e.isCritical = false;
    });
    
    // Marcar aristas del camino
    pathEdgeIds.forEach(edgeId => {
      const edge = app.model.edges.find(e => e.id === edgeId);
      if (edge) {
        edge.isCritical = true;
      }
    });
    
    // Re-renderizar
    app.engine.render();
  }
  
});

// Inicializar
render();