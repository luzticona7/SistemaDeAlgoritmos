// js/ui/Toolbar.js
export class Toolbar {
  constructor(app) {
    this.app = app;
    this.bind();
  }

  bind() {
    const tools = ['select', 'move', 'add-node', 'add-edge', 'delete'];
    tools.forEach(tool => {
      const btn = document.getElementById(`btn-${tool}`);
      if (btn) {
        btn.onclick = () => {
          // Convertir 'add-node' → 'addNode'
          const toolName = tool.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          this.setTool(toolName);
        };
      }
    });

    // Botón Limpiar
    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.app.model.clear();
      };
    }

    // Botón Asignación (solo si existe el solver)
    const assignmentBtn = document.getElementById('btn-assignment');
    if (assignmentBtn && this.app.solver) {
      assignmentBtn.onclick = () => {
        if (this.app.solver.showDialog) {
          this.app.solver.showDialog();
        } else {
          console.warn('AssignmentSolver.showDialog() no está implementado');
        }
      };
    }
  }

  setTool(tool) {
    // Normalizar el nombre de la herramienta
    this.app.model.currentTool = tool;
    
    // Quitar la clase 'on' de todos los botones
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('on'));
    
    // Convertir 'addNode' → 'add-node' para buscar el botón
    const btnId = tool.replace(/([A-Z])/g, '-$1').toLowerCase();
    const btn = document.getElementById(`btn-${btnId}`);
    if (btn) btn.classList.add('on');

    // Si no es la herramienta de arista, cancelar arista pendiente
    if (tool !== 'addEdge') {
      this.app.model.pendingEdgeSource = null;
    }
    
    this.app.engine.render();
  }
}