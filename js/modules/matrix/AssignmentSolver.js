/**
 * AssignmentSolver.js
 * Módulo para resolver problemas de asignación usando el algoritmo Húngaro
 */

import { hungarian } from '../algorithms/Hungarian.js';

/**
 * Construye matrices de costo para el algoritmo de asignación
 * @param {number[][]} M - Matriz de adyacencia
 * @param {Array} ordered - Nodos ordenados
 * @param {string} mode - 'max' o 'min'
 * @returns {{costMatrix: number[][], displayMatrix: number[][]}}
 */
export function buildCostMatrixForAssignment(M, ordered, mode = 'max') {
  const n = ordered.length;
  if (n === 0) return { costMatrix: [], displayMatrix: [] };

  // Paso 1: Crear matriz limpia de valores originales (0 = sin arista)
  const original = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const val = M?.[i]?.[j] ?? 0;
      return Number.isFinite(val) && val > 0 ? val : 0;
    })
  );

  // Paso 2: Determinar el valor máximo entre aristas reales (solo > 0)
  let maxWeight = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (original[i][j] > 0) {
        maxWeight = Math.max(maxWeight, original[i][j]);
      }
    }
  }

  // Si no hay ninguna arista con peso > 0, no hay asignación posible
  const hasEdges = maxWeight > 0;

  // Paso 3: Definir valor "infinito" grande
  const BIG = hasEdges ? (maxWeight + 1) * 1000 : 1e9;

  // Paso 4: Construir displayMatrix (para mostrar al usuario)
  const displayMatrix = original.map(row => [...row]);

  // Paso 5: Construir costMatrix para Hungarian
  const costMatrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      // No permitir auto-asignación
      if (i === j) return BIG;

      const hasEdge = original[i][j] > 0;
      if (!hasEdge) return BIG;

      if (mode === 'max') {
        // Convertir maximización en minimización
        return maxWeight - original[i][j];
      } else {
        // Minimización directa
        return original[i][j];
      }
    })
  );

  return { costMatrix, displayMatrix };
}

/**
 * Resuelve el problema de asignación
 * @param {number[][]} adjMatrix - Matriz de adyacencia
 * @param {Array} ordered - Nodos ordenados
 * @param {string} mode - 'max' o 'min'
 * @returns {Object} Resultado de la asignación
 */
export function solveAssignment(adjMatrix, ordered, mode = 'max') {
  const { costMatrix, displayMatrix } = buildCostMatrixForAssignment(
    adjMatrix, 
    ordered, 
    mode
  );
  
  const { assignment, totalCost } = hungarian(costMatrix);
  
  const n = ordered.length;
  const resultMatrix = Array.from({length: n}, () => Array(n).fill(0));
  const pairs = [];
  
  for (let i = 0; i < assignment.length; i++) {
    const j = assignment[i];
    if (j >= 0 && j < n) {
      // Solo marcar si hay una arista real (peso > 0 en displayMatrix)
      if (displayMatrix[i][j] > 0) {
        resultMatrix[i][j] = 1;
        pairs.push({
          fromIndex: i,
          toIndex: j,
          from: ordered[i].label,
          to: ordered[j].label,
          weight: displayMatrix[i][j]
        });
      }
    }
  }
  
  // Calcular total REAL (no el transformado)
  let realTotal = 0;
  for (let i = 0; i < assignment.length; i++) {
    const j = assignment[i];
    if (j >= 0 && j < n && displayMatrix[i][j] > 0) {
      realTotal += displayMatrix[i][j];
    }
  }
  
  return {
    assignment,
    resultMatrix,
    displayMatrix,
    pairs,
    realTotal,
    mode
  };
}

/**
 * Genera HTML de tabla de matriz
 * @param {number[][]} mat - Matriz
 * @param {Array<string>} labels - Etiquetas
 * @returns {string} HTML
 */
export function matrixToHtml(mat, labels) {
  let html = '<table class="table table-sm table-striped"><thead><tr>';
  html += labels.map(l => `<th>${l}</th>`).join('') + '</tr></thead><tbody>';
  
  for (let i = 0; i < mat.length; i++) {
    html += '<tr>';
    for (let j = 0; j < mat[i].length; j++) {
      const v = mat[i][j];
      const cell = (Number.isFinite(v) && Math.abs(v) < 1e6) ? v.toFixed(2) : '∞';
      html += `<td>${cell}</td>`;
    }
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  return html;
}

/**
 * Marca aristas críticas en el grafo
 * @param {Array} edges - Array de aristas
 * @param {Array} ordered - Nodos ordenados
 * @param {Array} pairs - Pares asignados
 */
export function markCriticalEdges(edges, ordered, pairs) {
  // Limpiar marcas críticas anteriores
  edges.forEach(e => delete e.isCritical);
  
  for (const pair of pairs) {
    const uId = ordered[pair.fromIndex].id;
    const vId = ordered[pair.toIndex].id;
    
    edges.forEach(e => {
      if (e.source === uId && e.target === vId) {
        e.isCritical = true;
      } else if ((e.type === 'undirected' || e.type === 'bidirectional') &&
                 ((e.source === uId && e.target === vId) || 
                  (e.source === vId && e.target === uId))) {
        e.isCritical = true;
      }
    });
  }
}

/**
 * Limpia datos de cálculo anterior (ET, LT, slack)
 * @param {Array} nodes - Nodos
 * @param {Array} edges - Aristas
 */
export function clearPreviousCalculation(nodes, edges) {
  nodes.forEach(nd => {
    delete nd.et;
    delete nd.lt;
  });
  
  edges.forEach(e => {
    delete e.slack;
  });
}