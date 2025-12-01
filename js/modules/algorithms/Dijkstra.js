// js/modules/algorithms/Dijkstra.js

/**
 * Implementación del algoritmo de Dijkstra con soporte para Maximizar y Minimizar
 * - Minimizar: Encuentra el camino más corto (Dijkstra clásico)
 * - Maximizar: Encuentra el camino más largo (Dijkstra invertido)
 */

export function computeDijkstra(nodesIn, edgesIn, startNodeId, endNodeId, mode = 'min') {
  const nodes = nodesIn.map(n => Object.assign({}, n));
  const edges = edgesIn.map(e => Object.assign({}, e));

  if (nodes.length === 0 || edges.length === 0) {
    return { error: 'No hay nodos o aristas.' };
  }

  // Verificar pesos no negativos
  for (let e of edges) {
    if (e.weight == null || e.weight < 0) {
      return { error: 'Todas las aristas deben tener peso no negativo (≥ 0) para Dijkstra.' };
    }
  }

  const orderedNodes = [...nodes].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  const n = orderedNodes.length;
  const nodeIndex = new Map(orderedNodes.map((nd, i) => [nd.id, i]));
  
  const startIdx = nodeIndex.get(startNodeId);
  const endIdx = nodeIndex.get(endNodeId);
  
  if (startIdx == null || endIdx == null) {
    return { error: 'Nodo de inicio o destino no encontrado.' };
  }

  // Construir lista de adyacencia
  const adj = Array.from({ length: n }, () => []);
  
  edges.forEach(e => {
    const u = nodeIndex.get(e.source);
    const v = nodeIndex.get(e.target);
    if (u == null || v == null) return;
    const w = (e.weight == null || isNaN(e.weight)) ? 1 : Number(e.weight);
    
    if (e.type === 'undirected' || e.type === 'bidirectional') {
      adj[u].push({ v: v, w: w, edgeId: e.id });
      adj[v].push({ v: u, w: w, edgeId: e.id });
    } else {
      adj[u].push({ v: v, w: w, edgeId: e.id });
    }
  });

  // Variables para el algoritmo
  let dist, parent, parentEdgeId, visited;
  
  if (mode === 'min') {
    // ========== MINIMIZAR (Dijkstra Clásico) ==========
    dist = Array(n).fill(Infinity);
    parent = Array(n).fill(-1);
    parentEdgeId = Array(n).fill(null);
    visited = Array(n).fill(false);
    
    dist[startIdx] = 0;
    
    for (let i = 0; i < n; i++) {
      let u = -1;
      let bestDist = Infinity;
      
      for (let v = 0; v < n; v++) {
        if (!visited[v] && dist[v] < bestDist) {
          bestDist = dist[v];
          u = v;
        }
      }
      
      if (u === -1) break;
      visited[u] = true;
      
      for (const edge of adj[u]) {
        const v = edge.v;
        const w = edge.w;
        
        if (dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          parent[v] = u;
          parentEdgeId[v] = edge.edgeId;
        }
      }
    }
    
  } else {
    // ========== MAXIMIZAR (Dijkstra Invertido para Camino Más Largo) ==========
    // Usamos distancias negativas para encontrar el camino más largo
    dist = Array(n).fill(-Infinity);
    parent = Array(n).fill(-1);
    parentEdgeId = Array(n).fill(null);
    visited = Array(n).fill(false);
    
    dist[startIdx] = 0;
    
    for (let i = 0; i < n; i++) {
      let u = -1;
      let bestDist = -Infinity;
      
      for (let v = 0; v < n; v++) {
        if (!visited[v] && dist[v] > bestDist) {
          bestDist = dist[v];
          u = v;
        }
      }
      
      if (u === -1) break;
      visited[u] = true;
      
      for (const edge of adj[u]) {
        const v = edge.v;
        const w = edge.w;
        
        if (dist[u] + w > dist[v]) {
          dist[v] = dist[u] + w;
          parent[v] = u;
          parentEdgeId[v] = edge.edgeId;
        }
      }
    }
  }

  // Verificar si hay camino
  if (mode === 'min' && dist[endIdx] === Infinity) {
    return { error: 'No hay camino entre el nodo de inicio y destino.' };
  }
  
  if (mode === 'max' && dist[endIdx] === -Infinity) {
    return { error: 'No hay camino entre el nodo de inicio y destino.' };
  }

  // Reconstruir el camino
  const path = [];
  const pathEdgeIds = [];
  let curr = endIdx;
  
  while (curr !== -1) {
    path.push(curr);
    if (parentEdgeId[curr] !== null) {
      pathEdgeIds.push(parentEdgeId[curr]);
    }
    curr = parent[curr];
  }
  
  path.reverse();
  pathEdgeIds.reverse();

  // Actualizar nodos con distancias
  for (let i = 0; i < n; i++) {
    if (mode === 'min') {
      orderedNodes[i].distance = dist[i] === Infinity ? null : dist[i];
    } else {
      orderedNodes[i].distance = dist[i] === -Infinity ? null : dist[i];
    }
  }

  // Marcar aristas críticas (en el camino óptimo)
  edges.forEach(e => {
    e.isCritical = pathEdgeIds.includes(e.id);
  });

  // Construir resultado HTML
  const pathLabels = path.map(i => orderedNodes[i].label).join(' → ');
  const totalDistance = Math.abs(dist[endIdx]).toFixed(2);
  
  const modeText = mode === 'min' ? 'más corto' : 'más largo';
  const distanceLabel = mode === 'min' ? 'Distancia' : 'Longitud';
  
  const resultHTML = `
    <strong>Camino ${modeText} (Dijkstra ${mode === 'min' ? 'Minimizar' : 'Maximizar'}):</strong><br>
    <span style="color: var(--pastel-orange, #FBBD40); font-weight: 600;">${pathLabels}</span><br>
    <strong>${distanceLabel} total:</strong> <span style="color: var(--hot-pink, #E75CB4); font-size: 1.2rem; font-weight: 700;">${totalDistance}</span><br>
    <br>
    <strong>Distancias desde ${orderedNodes[startIdx].label}:</strong><br>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 8px;">
      ${orderedNodes.map(n => {
        const d = n.distance;
        const displayDist = d === null ? '∞' : d.toFixed(2);
        const isInPath = path.includes(nodeIndex.get(n.id));
        const color = isInPath ? 'var(--hot-pink, #E75CB4)' : 'var(--ink, #eaf6ff)';
        return `<div style="background: rgba(11, 19, 38, 0.5); padding: 6px; border-radius: 6px; text-align: center; border: 1px solid ${isInPath ? 'var(--hot-pink, #E75CB4)' : 'rgba(255,255,255,0.1)'};">
          <strong style="color: ${color};">${n.label}:</strong><br>
          <span style="color: ${color}; font-size: 0.9rem;">${displayDist}</span>
        </div>`;
      }).join('')}
    </div>
  `;

  return { 
    nodes: orderedNodes, 
    edges, 
    resultHTML, 
    path,
    distance: Math.abs(dist[endIdx]),
    mode
  };
}

/**
 * Construir matriz de adyacencia (reutilizado de Johnson)
 */
export function buildAdjacencyMatrix(nodes, edges) {
  const ordered = [...nodes].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  if (ordered.length === 0) return { matrix: [], ordered, indexById: new Map() };
  const indexById = new Map(ordered.map((n, i) => [n.id, i]));
  const n = ordered.length;
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  edges.forEach(e => {
    const i = indexById.get(e.source), j = indexById.get(e.target);
    if (i == null || j == null) return;
    const w = (e.weight == null || isNaN(e.weight)) ? 1 : Number(e.weight);
    if (e.type === 'directed') M[i][j] += w;
    else { M[i][j] += w; M[j][i] += w; }
  });
  return { matrix: M, ordered, indexById };
}