/**
 * AssignmentUI.js
 * Controlador de UI para el algoritmo de asignación
 */

import { 
  solveAssignment, 
  matrixToHtml, 
  markCriticalEdges,
  clearPreviousCalculation 
} from './AssignmentSolver.js';

/**
 * Muestra diálogo de optimización mejorado
 * @returns {Promise<string|null>} 'max', 'min' o null si cancela
 */
export function showOptimizationDialog() {
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

/**
 * Ejecuta el cálculo del algoritmo de asignación y actualiza la UI
 * @param {Array} nodes - Nodos del grafo
 * @param {Array} edges - Aristas del grafo
 * @param {Function} buildAdjacencyMatrix - Función para construir matriz de adyacencia
 * @param {Function} render - Función para renderizar el grafo
 * @param {string} mode - 'max' o 'min'
 */
export function computeAssignment(nodes, edges, buildAdjacencyMatrix, render, mode = 'max') {
  if (nodes.length === 0) {
    showWarning('Agrega nodos primero.');
    return;
  }

  // Limpiar marcas críticas anteriores
  edges.forEach(e => delete e.isCritical);

  const { matrix: adjMatrix, ordered } = buildAdjacencyMatrix();
  const n = ordered.length;
  
  if (n === 0) { 
    showWarning('No hay nodos.'); 
    return; 
  }

  // Resolver asignación
  const result = solveAssignment(adjMatrix, ordered, mode);
  
  // Marcar aristas críticas
  markCriticalEdges(edges, ordered, result.pairs);
  
  // Limpiar ET/LT y slack anteriores
  clearPreviousCalculation(ordered, edges);

  // Actualizar UI con resultados
  displayResults(result, ordered);
  
  // Re-renderizar grafo
  render();
}

/**
 * Muestra los resultados en el panel
 * @param {Object} result - Resultado de la asignación
 * @param {Array} ordered - Nodos ordenados
 */
function displayResults(result, ordered) {
  const resultDiv = document.getElementById('critical-path-result');
  if (!resultDiv) return;
  
  const sign = (result.mode === 'max') ? 'Maximizar' : 'Minimizar';
  const labels = ordered.map(x => x.label);
  
  const costHtml = matrixToHtml(result.displayMatrix, labels);
  const resultHtml = matrixToHtml(result.resultMatrix, labels);
  
  const pairsStr = result.pairs.length 
    ? result.pairs.map(p => `${p.from} → ${p.to}`).join(', ') 
    : '(ninguno)';

  resultDiv.innerHTML = `
    <div><strong>Asignación (${sign}):</strong></div>
    <div class="mt-2"><strong>Pares asignados:</strong> ${pairsStr}</div>
    <div class="mt-2"><strong>Total real:</strong> ${result.realTotal.toFixed(2)}</div>
    <hr style="border-color: rgba(255,255,255,0.08)" />
    <details class="mt-2">
      <summary class="text-muted" style="cursor:pointer">Ver matrices</summary>
      <div><strong>Matriz de pesos originales:</strong></div>
      ${costHtml}
      <div class="mt-3"><strong>Matriz de asignación (1 = asignado):</strong></div>
      ${resultHtml}
    </details>
  `;
}

/**
 * Muestra advertencia al usuario
 * @param {string} message - Mensaje de advertencia
 */
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