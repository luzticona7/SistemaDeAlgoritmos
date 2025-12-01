// js/core/GraphModel.js
import { genId } from '../utils/id.js';

export class GraphModel {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.viewX = 0;
    this.viewY = 0;
    this.currentTool = 'select';
    this.selectedNodeId = null;
    this.pendingEdgeSource = null;
    this.kruskalResult = '';
    
    // ✅ Estado del tipo de arista
    this.edgeType = 'directed'; // 'directed' | 'undirected' | 'bidirectional'
  }

  nextLabel() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let n = this.nodes.length;
    let label = '';
    do {
      label = letters[n % 26] + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
  }

  addNode(x, y) {
    const node = {
      id: genId(),
      label: this.nextLabel(),
      x, y,
      color: '#FBBD40',
      size: 22
    };
    this.nodes.push(node);
    return node;
  }

  deleteNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
  }

  // ✅ Método para cambiar el tipo de arista
  setEdgeType(type) {
    const validTypes = ['directed', 'undirected', 'bidirectional'];
    if (validTypes.includes(type)) {
      this.edgeType = type;
      console.log(`Tipo de arista cambiado a: ${type}`);
      
      // Re-renderizar si hay un engine disponible
      if (window.GraphApp?.engine) {
        window.GraphApp.engine.render();
      }
    } else {
      console.error(`Tipo de arista inválido: ${type}. Tipos válidos: ${validTypes.join(', ')}`);
    }
  }

  // ✅ Método para obtener el tipo de arista actual
  getEdgeType() {
    return this.edgeType;
  }

  clear() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el grafo?')) {
      this.nodes = [];
      this.edges = [];
      this.selectedNodeId = null;
      this.pendingEdgeSource = null;
      this.viewX = 0;
      this.viewY = 0;
      this.kruskalResult = '';
      
      // Opcional: Resetear tipo de arista al limpiar (descomenta si lo deseas)
      // this.edgeType = 'directed';
      
      // Notificar que se limpió
      if (window.GraphApp?.engine) {
        window.GraphApp.engine.render();
      }
    }
  }
}