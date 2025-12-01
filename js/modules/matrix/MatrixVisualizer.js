/**
 * Visualizador de matrices para mostrar matrices de adyacencia y resultados
 * Extraído de algorithm.js líneas ~700-800 (buildAdjacencyMatrix)
 */
export class MatrixVisualizer {
  /**
   * Renderiza una matriz en una tabla HTML
   * @param {number[][]} matrix - Matriz a renderizar
   * @param {Array} ordered - Nodos ordenados para labels
   * @param {string} containerId - ID del contenedor HTML
   * @param {boolean} showHeaders - Mostrar headers con labels
   */
  render(matrix, ordered, containerId, showHeaders = true) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Contenedor ${containerId} no encontrado`);
      return;
    }

    container.innerHTML = '';
    
    if (!matrix || matrix.length === 0 || !ordered || ordered.length === 0) {
      container.innerHTML = '<div class="text-muted">No hay datos para mostrar</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table-sm table-matrix table-dark mb-0';
    
    // Cabecera con labels
    if (showHeaders) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      // Celda vacía para esquina
      headerRow.appendChild(document.createElement('th'));
      
      // Headers de columnas
      ordered.forEach(node => {
        const th = document.createElement('th');
        th.textContent = node.label || '?';
        th.title = `Columna: ${node.label}`;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    // Cuerpo de la matriz
    const tbody = document.createElement('tbody');
    for (let i = 0; i < matrix.length; i++) {
      const row = document.createElement('tr');
      
      // Header de fila
      if (showHeaders) {
        const rowHeader = document.createElement('th');
        rowHeader.textContent = ordered[i]?.label || '?';
        rowHeader.title = `Fila: ${ordered[i]?.label || '?'}`;
        row.appendChild(rowHeader);
      }
      
      // Celdas de datos
      for (let j = 0; j < matrix[i].length; j++) {
        const cell = document.createElement('td');
        const value = matrix[i][j];
        
        if (value === 0) {
          cell.textContent = '0';
          cell.className = 'text-muted';
        } else if (Number.isInteger(value)) {
          cell.textContent = value.toString();
        } else if (Number.isFinite(value)) {
          cell.textContent = value.toFixed(2);
        } else {
          cell.textContent = '∞';
          cell.className = 'text-warning';
        }
        
        cell.title = `Fila: ${ordered[i]?.label || '?'}, Columna: ${ordered[j]?.label || '?'}, Valor: ${value}`;
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Resalta una celda específica en la matriz
   * @param {number} row - Fila a resaltar
   * @param {number} col - Columna a resaltar
   * @param {string} color - Color de resaltado (CSS value)
   * @param {string} containerId - ID del contenedor
   */
  highlightCell(row, col, color = 'var(--pastel-orange)', containerId = 'matrix-table') {
    const table = document.querySelector(`#${containerId} table`);
    if (!table) return;

    this.clearHighlights(containerId);
    
    // +1 para contar el header de fila
    const targetRow = table.rows[row + 1];
    if (targetRow && targetRow.cells[col + 1]) {
      targetRow.cells[col + 1].style.backgroundColor = color;
      targetRow.cells[col + 1].style.transition = 'background-color 0.3s ease';
    }
  }

  /**
   * Limpia todos los resaltados de la matriz
   * @param {string} containerId - ID del contenedor
   */
  clearHighlights(containerId = 'matrix-table') {
    const table = document.querySelector(`#${containerId} table`);
    if (!table) return;

    const cells = table.querySelectorAll('td');
    cells.forEach(cell => {
      cell.style.backgroundColor = '';
    });
  }

  /**
   * Renderiza matriz de resultados de asignación
   * @param {number[][]} matrix - Matriz de asignación
   * @param {Array} ordered - Nodos ordenados
   * @param {number[]} assignment - Asignación resultante
   * @param {string} containerId - ID del contenedor
   */
  renderAssignmentResult(matrix, ordered, assignment, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'table table-sm table-assignment table-dark mb-0';
    
    // Cabecera
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Esquina
    
    ordered.forEach(node => {
      const th = document.createElement('th');
      th.textContent = node.label;
      th.className = 'text-center';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Cuerpo con asignaciones resaltadas
    const tbody = document.createElement('tbody');
    for (let i = 0; i < matrix.length; i++) {
      const row = document.createElement('tr');
      
      // Header de fila
      const rowHeader = document.createElement('th');
      rowHeader.textContent = ordered[i].label;
      row.appendChild(rowHeader);
      
      for (let j = 0; j < matrix[i].length; j++) {
        const cell = document.createElement('td');
        cell.textContent = matrix[i][j] === 0 ? '0' : matrix[i][j].toFixed(2);
        cell.className = 'text-center';
        
        // Resaltar asignación
        if (assignment[i] === j && matrix[i][j] > 0) {
          cell.style.backgroundColor = 'var(--hot-pink)';
          cell.style.color = 'white';
          cell.style.fontWeight = 'bold';
          cell.innerHTML = `✓ ${cell.textContent}`;
        }
        
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
  }
}