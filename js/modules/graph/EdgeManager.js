// js/modules/graph/EdgeManager.js

export class EdgeManager {
  constructor(graphModel) {
    this.model = graphModel;
  }

  addEdge(sourceId, targetId, weight = 1) {
    const edgeType = this.model.getEdgeType(); // ✅ OBTENER TIPO
    
    switch (edgeType) {
      case 'directed':
        // Crear solo una arista: A → B
        this.createSingleEdge(sourceId, targetId, weight);
        break;
        
      case 'undirected':
        // Crear una arista sin dirección (visualmente sin flecha)
        this.createUndirectedEdge(sourceId, targetId, weight);
        break;
        
      case 'bidirectional':
        // Crear dos aristas: A → B y B → A
        this.createSingleEdge(sourceId, targetId, weight);
        this.createSingleEdge(targetId, sourceId, weight);
        break;
    }
  }

  createSingleEdge(source, target, weight) {
    const edge = {
      id: genId(),
      source,
      target,
      weight,
      directed: true // ← Para renderizado
    };
    this.model.edges.push(edge);
    return edge;
  }

  createUndirectedEdge(source, target, weight) {
    const edge = {
      id: genId(),
      source,
      target,
      weight,
      directed: false // ← Sin flecha
    };
    this.model.edges.push(edge);
    return edge;
  }
}