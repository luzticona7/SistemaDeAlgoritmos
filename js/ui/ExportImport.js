// js/ui/ExportImport.js
export class ExportImport {
  constructor(app) {
    this.app = app;
    this.bind();
  }

  bind() {
    document.getElementById('btn-image').onclick = () => this.downloadPNG();
    document.getElementById('btn-export').onclick = () => this.exportJSON();
    document.getElementById('importFile').onchange = (e) => this.importJSON(e);
  }

  async downloadPNG() {
    const name = await this.app.modals.customPrompt('Nombre del grafo', 'grafos');
    if (!name) return;
    const dataUrl = this.app.engine.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name + '.png';
    a.click();
  }

  async exportJSON() {
    const name = await this.app.modals.customPrompt('Nombre del archivo', 'grafos');
    if (!name) return;
const data = {
  nodes: this.app.model.nodes,
  edges: this.app.model.edges,
  viewX: this.app.model.viewX,
  viewY: this.app.model.viewY,
  kruskalResult: this.app.model.kruskalResult || ''
};
    
const resultDiv = document.getElementById('critical-path-result');
if (resultDiv) {
  resultDiv.innerHTML = data.kruskalResult || 
    'Presiona <strong>Minimizar</strong> o <strong>Maximizar</strong> para calcular el árbol de expansión.';
}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      this.app.model.nodes = data.nodes || [];
      this.app.model.edges = data.edges || [];
      this.app.model.viewX = data.viewX || 0;
      this.app.model.viewY = data.viewY || 0;
      this.app.engine.render();
this.app.model.kruskalResult = data.kruskalResult || '';
const resultDiv = document.getElementById('critical-path-result');
if (resultDiv) resultDiv.innerHTML = this.app.model.kruskalResult;
      if (resultDiv) {
        resultDiv.innerHTML = data.kruskalResult ||
          'Presiona <strong>Minimizar</strong> o <strong>Maximizar</strong> para calcular el árbol de expansión.';
      }

    } catch (err) {
      this.app.modals.showWarning('JSON inválido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
}