// js/app.js
import { GraphModel } from './core/GraphModel.js';
import { GraphEngine } from './core/GraphEngine.js';
import { Toolbar } from './ui/Toolbar.js';
import { Panels } from './ui/Panels.js';
import { Modals } from './ui/Modals.js';
import { ExportImport } from './ui/ExportImport.js';
import { AssignmentSolver } from './algorithms/AssignmentSolver.js';
import { EdgeTypeSelector } from './ui/EdgeTypeSelector.js'; // ✅ NUEVO IMPORT

class App {
  constructor() {
    this.model = new GraphModel();
    
    // IMPORTANTE: Inicializar componentes de UI ANTES del engine
    // porque engine.render() llama a this.app.panels?.sync()
    this.modals = new Modals(this);
    this.panels = new Panels(this);
    this.toolbar = new Toolbar(this);
    this.exportImport = new ExportImport(this);
    this.solver = new AssignmentSolver(this);
    
    // ✅ NUEVO: Inicializar selector de tipo de arista
    this.edgeTypeSelector = new EdgeTypeSelector(this.model);
    
    // Engine se inicializa AL FINAL
    this.engine = new GraphEngine(this.model, this);
    this.engine.render();
    this.toolbar.setTool('select');
  }
}

window.addEventListener('load', () => {
  window.GraphApp = new App();
  console.log('%c✓ GraphApp inicializado correctamente', 
    'color: #00ff88; background: #000; font-size: 16px; font-weight: bold; padding: 8px;');
  
  // 🧽 --- BLOQUE DE LIMPIEZA ---
  // Cuando se presiona "Limpiar", vaciamos nodos/aristas y también el resultado Kruskal
  const btnClear = document.getElementById('btn-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const app = window.GraphApp;
      if (!app) return;
      
      // Vaciar modelo
      app.model.nodes = [];
      app.model.edges = [];
      app.model.kruskalResult = '';
      
      // ✅ OPCIONAL: Resetear tipo de arista al limpiar (descomenta si lo deseas)
      // app.model.edgeType = 'directed';
      // document.getElementById('edgeDirected').checked = true;
      
      // Re-renderizar
      app.engine.render();
      
      // Limpiar el texto del resultado Kruskal
      const resultDiv = document.getElementById('critical-path-result');
      if (resultDiv) {
        resultDiv.innerHTML = 
          '<span class="small-muted">Presiona <strong>Minimizar</strong> o <strong>Maximizar</strong> para calcular el árbol de expansión.</span>';
      }
    });
  }
  // 🧽 --- FIN BLOQUE DE LIMPIEZA ---
});