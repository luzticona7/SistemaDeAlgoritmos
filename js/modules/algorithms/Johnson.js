// js/modules/algorithms/Johnson.js

// Compatibilidad: export opcional del algoritmo Johnson clÃ¡sico
export function johnson(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error('nodes y edges deben ser arrays');
  }
  if (nodes.length === 0) return { shortestPaths: {}, success: true };

  const nodeMap = new Map();
  nodes.forEach((n, i) => nodeMap.set(n.id, i));
  const n = nodes.length;
  const dist = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  for (const e of edges) {
    const u = nodeMap.get(e.source);
    const v = nodeMap.get(e.target);
    if (u != null && v != null) {
      const w = (e.weight == null ? 1 : Number(e.weight));
      dist[u][v] = Math.min(dist[u][v], w);
    }
  }

  const h = Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    for (const e of edges) {
      const u = nodeMap.get(e.source);
      const v = nodeMap.get(e.target);
      if (u != null && v != null) {
        const w = (e.weight == null ? 1 : Number(e.weight));
        if (h[u] + w < h[v]) h[v] = h[u] + w;
      }
    }
  }

  const result = {};
  for (let s = 0; s < n; s++) {
    const distances = _dijkstra_for_johnson(s, dist, h, n);
    const sourceId = nodes[s].id;
    result[sourceId] = {};
    for (let t = 0; t < n; t++) {
      const targetId = nodes[t].id;
      result[sourceId][targetId] = distances[t] === Infinity ? Infinity : distances[t];
    }
  }

  return { shortestPaths: result, success: true };
}

function _dijkstra_for_johnson(source, dist, h, n) {
  const d = Array(n).fill(Infinity);
  d[source] = 0;
  const visited = Array(n).fill(false);

  for (let i = 0; i < n; i++) {
    let u = -1;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && (u === -1 || d[j] < d[u])) u = j;
    }
    if (d[u] === Infinity) break;
    visited[u] = true;
    for (let v = 0; v < n; v++) {
      if (dist[u][v] !== Infinity) {
        const alt = d[u] + dist[u][v];
        if (alt < d[v]) d[v] = alt;
      }
    }
  }
  return d;
}

/* ---------------------------------------------------
   Funciones que usa la UI: buildAdjacencyMatrix y computeCriticalPath
   --------------------------------------------------- */

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

export function computeCriticalPath(nodesIn, edgesIn, mode = 'max') {
  const nodes = nodesIn.map(n => Object.assign({}, n));
  const edges = edgesIn.map(e => Object.assign({}, e));

  if (nodes.length === 0 || edges.length === 0) return { error: 'No hay nodos o aristas.' };

  for (let e of edges) {
    if (mode === 'max') {
      if (e.weight == null || e.weight <= 0) return { error: 'Todas las aristas deben tener duraciÃ³n positiva (> 0) para maximizar (CPM).' };
    } else {
      if (e.weight == null || e.weight < 0) return { error: 'Todas las aristas deben tener duraciÃ³n >= 0 para minimizar (ruta mÃ¡s corta).' };
    }
  }

  const orderedNodes = [...nodes].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  const n = orderedNodes.length;
  const nodeIndex = new Map(orderedNodes.map((nd, i) => [nd.id, i]));
  const start = 0;
  const end = n - 1;

  for (let nd of orderedNodes) { delete nd.et; delete nd.lt; }
  for (let e of edges) { delete e.slack; e.isCritical = false; }

  if (mode === 'max') {
    const negEdges = edges.map(e => ({ u: nodeIndex.get(e.source), v: nodeIndex.get(e.target), w: -e.weight }));
    const artificial = n;
    const allEdgesNeg = [...negEdges, ...Array.from({ length: n }, (_, i) => ({ u: artificial, v: i, w: 0 }))];

    const h = Array(n + 1).fill(Infinity);
    h[artificial] = 0;
    for (let i = 0; i < n; i++) {
      for (let ee of allEdgesNeg) {
        if (h[ee.u] !== Infinity && h[ee.u] + ee.w < h[ee.v]) {
          h[ee.v] = h[ee.u] + ee.w;
        }
      }
    }
    for (let ee of allEdgesNeg) {
      if (h[ee.u] !== Infinity && h[ee.u] + ee.w < h[ee.v]) return { error: 'El grafo tiene un ciclo; CPM requiere DAG.' };
    }

    const reweightedNegEdges = negEdges.map(e => ({ u: e.u, v: e.v, w: e.w + h[e.u] - h[e.v] }));

    const distMatrix = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const parentMatrix = Array.from({ length: n }, () => Array(n).fill(-1));

    for (let src = 0; src < n; src++) {
      const dist = Array(n).fill(Infinity);
      const visited = Array(n).fill(false);
      dist[src] = 0;
      for (let i = 0; i < n; i++) {
        let u = -1, best = Infinity;
        for (let v = 0; v < n; v++) {
          if (!visited[v] && dist[v] < best) { best = dist[v]; u = v; }
        }
        if (u === -1) break;
        visited[u] = true;
        for (let e of reweightedNegEdges.filter(x => x.u === u)) {
          if (dist[u] + e.w < dist[e.v]) {
            dist[e.v] = dist[u] + e.w;
            parentMatrix[src][e.v] = u;
          }
        }
      }
      for (let v = 0; v < n; v++) {
        if (dist[v] < Infinity) distMatrix[src][v] = dist[v] - h[src] + h[v];
      }
    }

    if (distMatrix[start][end] === Infinity) return { error: 'No hay ruta entre inicio y fin.' };

    const criticalDuration = -distMatrix[start][end];

    const ET = Array(n).fill(0).map((_, v) => {
      const d = distMatrix[start][v];
      return d === Infinity ? 0.0 : -d;
    });
    const LT = Array(n).fill(0).map((_, v) => {
      const d = distMatrix[v][end];
      return d === Infinity ? ET[v] : criticalDuration + d;
    });

    for (let i = 0; i < n; i++) {
      orderedNodes[i].et = ET[i];
      orderedNodes[i].lt = LT[i];
    }

    for (let e of edges) {
      const u = nodeIndex.get(e.source), v = nodeIndex.get(e.target);
      e.slack = LT[v] - ET[u] - e.weight;
      if (Math.abs(e.slack) < 1e-9) e.slack = 0;
    }

    const parent = parentMatrix[start];
    let path = []; let curr = end;
    while (curr !== -1) { path.push(curr); curr = parent[curr]; }
    path = path.reverse();

    if (path.length >= 2) {
      const pathIds = path.map(i => orderedNodes[i].id);
      for (let i = 0; i < pathIds.length - 1; i++) {
        const uId = pathIds[i], vId = pathIds[i + 1];
        edges.forEach(ed => {
          if (ed.source === uId && ed.target === vId) ed.isCritical = true;
          else if ((ed.type === 'undirected' || ed.type === 'bidirectional') && ((ed.source === uId && ed.target === vId) || (ed.source === vId && ed.target === uId))) ed.isCritical = true;
        });
      }
    }

    const pathLabels = path.map(i => orderedNodes[i].label).join(' -> ');
    const resultHTML = `Ruta crÃ­tica (Maximizar / Johnson): ${pathLabels}<br>DuraciÃ³n total: ${criticalDuration.toFixed(0)}`;
    return { nodes: orderedNodes, edges, resultHTML, criticalDuration };
  }

  // mode === 'min' (Dijkstra-based)
  const adj = Array.from({ length: n }, () => []);
  const adjRev = Array.from({ length: n }, () => []);
  edges.forEach(e => {
    const u = nodeIndex.get(e.source);
    const v = nodeIndex.get(e.target);
    if (u == null || v == null) return;
    const w = (e.weight == null || isNaN(e.weight)) ? 1 : Number(e.weight);
    if (e.type === 'undirected' || e.type === 'bidirectional') {
      adj[u].push({ v: v, w: w });
      adj[v].push({ v: u, w: w });
      adjRev[v].push({ v: u, w: w });
      adjRev[u].push({ v: v, w: w });
    } else {
      adj[u].push({ v: v, w: w });
      adjRev[v].push({ v: u, w: w });
    }
  });

  function dijkstraFrom(src, adjacency) {
    const dist = Array(n).fill(Infinity);
    const parent = Array(n).fill(-1);
    const visited = Array(n).fill(false);
    dist[src] = 0;
    for (let i = 0; i < n; i++) {
      let u = -1; let best = Infinity;
      for (let v = 0; v < n; v++) {
        if (!visited[v] && dist[v] < best) { best = dist[v]; u = v; }
      }
      if (u === -1) break;
      visited[u] = true;
      for (const edge of adjacency[u]) {
        if (dist[u] + edge.w < dist[edge.v]) {
          dist[edge.v] = dist[u] + edge.w;
          parent[edge.v] = u;
        }
      }
    }
    return { dist, parent };
  }

  if (mode === 'min') {
    const resStart = dijkstraFrom(start, adj);
    const resToEnd = dijkstraFrom(end, adjRev);
    const distStart = resStart.dist;
    const distToEnd = resToEnd.dist;
    if (distStart[end] === Infinity) return { error: 'No hay ruta entre inicio y fin.' };
    const criticalDuration = distStart[end];
    for (let i = 0; i < n; i++) {
      orderedNodes[i].et = (distStart[i] === Infinity ? 0 : distStart[i]);
      orderedNodes[i].lt = orderedNodes[i].et;
    }
    for (let e of edges) {
      const u = nodeIndex.get(e.source), v = nodeIndex.get(e.target);
      if (u == null || v == null) { e.slack = undefined; continue; }
      const w = (e.weight == null || isNaN(e.weight)) ? 1 : Number(e.weight);
      if (distStart[u] === Infinity || distStart[v] === Infinity) { e.slack = undefined; }
      else {
        e.slack = distStart[v] - distStart[u] - w;
        if (Math.abs(e.slack) < 1e-9) e.slack = 0;
      }
    }
    const parent = resStart.parent;
    let path = []; let cur = end;
    while (cur !== -1) { path.push(cur); cur = parent[cur]; }
    path = path.reverse();
    if (path[0] !== start) return { error: 'No fue posible reconstruir la ruta.' };
    if (path.length >= 2) {
      const pathIds = path.map(i => orderedNodes[i].id);
      for (let i = 0; i < pathIds.length - 1; i++) {
        const uId = pathIds[i], vId = pathIds[i + 1];
        edges.forEach(ed => {
          if (ed.source === uId && ed.target === vId) ed.isCritical = true;
          else if ((ed.type === 'undirected' || ed.type === 'bidirectional') && ((ed.source === uId && ed.target === vId) || (ed.source === vId && ed.target === uId))) ed.isCritical = true;
        });
      }
    }
    const pathLabels = path.map(i => orderedNodes[i].label).join(' -> ');
    const resultHTML = `Ruta mÃ­nima (Minimizar / Shortest): ${pathLabels}<br>DuraciÃ³n total: ${criticalDuration.toFixed(0)}`;
    return { nodes: orderedNodes, edges, resultHTML, criticalDuration };
  }

  return { error: 'Modo no soportado.' };
}