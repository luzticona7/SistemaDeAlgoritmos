/**
 * Hungarian Algorithm (O(n^3))
 * Resuelve el problema de asignación óptima
 * 
 * @param {number[][]} costMatrix - Matriz de costos cuadrada
 * @returns {{assignment: number[], totalCost: number}}
 */
export function hungarian(costMatrix) {
  let n = costMatrix.length;
  if (n === 0) return { assignment: [], totalCost: 0 };

  // Clonar matriz y asegurar valores numéricos
  const a = Array.from({length: n}, (_, i) => 
    Array.from({length: n}, (_, j) => Number(costMatrix[i][j]))
  );

  const u = Array(n + 1).fill(0); // potencial para filas
  const v = Array(n + 1).fill(0); // potencial para columnas
  const p = Array(n + 1).fill(0); // p[j] = i emparejado con j
  const way = Array(n + 1).fill(0);

  for (let i = 1; i <= n; ++i) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(Infinity);
    const used = Array(n + 1).fill(false);
    
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      
      for (let j = 1; j <= n; ++j) {
        if (used[j]) continue;
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { 
          minv[j] = cur; 
          way[j] = j0; 
        }
        if (minv[j] < delta) { 
          delta = minv[j]; 
          j1 = j; 
        }
      }
      
      for (let j = 0; j <= n; ++j) {
        if (used[j]) { 
          u[p[j]] += delta; 
          v[j] -= delta; 
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Construir array de asignación
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= n; ++j) {
    if (p[j] > 0 && p[j] <= n) {
      assignment[p[j] - 1] = j - 1;
    }
  }

  // Calcular costo total
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = assignment[i];
    if (j >= 0 && j < n && Number.isFinite(a[i][j])) {
      total += a[i][j];
    } else {
      total = Infinity;
    }
  }

  return { assignment, totalCost: total };
}

/**
 * Valida que la matriz sea cuadrada y contenga valores numéricos
 * @param {number[][]} matrix 
 * @returns {boolean}
 */
export function validateCostMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) return false;
  
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) return false;
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(matrix[i][j])) return false;
    }
  }
  
  return true;
}