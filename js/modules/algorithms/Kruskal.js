// js/algorithms/Kruskal.js
export function kruskal(nodes, edges, mode = 'min') {
  // Union-Find
  const parent = new Map();
  const rank = new Map();

  const find = (x) => {
    if (!parent.has(x)) {
      parent.set(x, x);
      rank.set(x, 0);
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)));
    }
    return parent.get(x);
  };

  const union = (x, y) => {
    const px = find(x);
    const py = find(y);
    if (px === py) return false;
    if (rank.get(px) < rank.get(py)) {
      parent.set(px, py);
    } else if (rank.get(px) > rank.get(py)) {
      parent.set(py, px);
    } else {
      parent.set(py, px);
      rank.set(px, rank.get(px) + 1);
    }
    return true;
  };

  // Solo aristas con peso (ignoramos sin peso)
  const validEdges = edges
    .filter(e => e.weight !== null && e.weight !== undefined && !isNaN(e.weight))
    .map(e => ({ ...e, weight: Number(e.weight) }));

  // Ordenar según el modo: min (ascendente) o max (descendente)
  if (mode === 'max') {
    // Para MAXIMIZAR: ordenar de MAYOR a MENOR peso
    validEdges.sort((a, b) => b.weight - a.weight);
  } else {
    // Para MINIMIZAR: ordenar de MENOR a MAYOR peso (default)
    validEdges.sort((a, b) => a.weight - b.weight);
  }

  const mstEdges = [];
  let totalWeight = 0;

  for (const edge of validEdges) {
    if (union(edge.source, edge.target)) {
      mstEdges.push(edge.id);
      totalWeight += edge.weight;
    }
  }

  return { 
    mstEdges, 
    totalWeight,
    mode // Retornamos el modo para mostrar en la UI
  };
}