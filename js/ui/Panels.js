// js/ui/Panels.js
export class Panels {
  constructor(app) {
    this.app = app;
    this.bind();
  }

  bind() {
    document.getElementById('node-save').onclick = () => this.saveNode();
    document.getElementById('node-delete').onclick = () => this.deleteSelectedNode();
    document.getElementById('refresh-matrix').onclick = () => this.buildMatrix();
    document.getElementById('show-matrix-modal').onclick = () => this.buildMatrix();
  }

  sync() {
    this.updateNodeForm();
    this.updateEdgesTable();
    this.buildMatrix();
  }

  updateNodeForm() {
    const form = document.getElementById('node-form');
    const noSel = document.getElementById('no-selection');
    const node = this.app.model.nodes.find(n => n.id === this.app.model.selectedNodeId);

    if (!node) {
      form.classList.add('d-none');
      noSel.classList.remove('d-none');
      return;
    }

    form.classList.remove('d-none');
    noSel.classList.add('d-none');
    document.getElementById('node-label').value = node.label;
    document.getElementById('node-color').value = node.color;
    document.getElementById('node-size').value = node.size || 22;
  }

  saveNode() {
    const node = this.app.model.nodes.find(n => n.id === this.app.model.selectedNodeId);
    if (!node) return;
    node.label = document.getElementById('node-label').value.trim() || node.label;
    node.color = document.getElementById('node-color').value;
    node.size = parseInt(document.getElementById('node-size').value) || 22;
    this.app.engine.render();
  }

  deleteSelectedNode() {
    if (this.app.model.selectedNodeId) {
      this.app.model.deleteNode(this.app.model.selectedNodeId);
      this.app.model.selectedNodeId = null;
      this.app.engine.render();
    }
  }

  updateEdgesTable() {
    const tbody = document.getElementById('edges-tbody');
    tbody.innerHTML = '';
    this.app.model.edges.forEach((e, i) => {
      const from = this.app.model.nodes.find(n => n.id === e.source);
      const to = this.app.model.nodes.find(n => n.id === e.target);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${from?.label || '?'}</td>
        <td>${to?.label || '?'}</td>
        <td><select class="form-select form-select-sm edge-type" data-id="${e.id}">
          <option value="directed" ${e.type==='directed'?'selected':''}>Dirigida</option>
          <option value="undirected" ${e.type==='undirected'?'selected':''}>No dirigida</option>
          <option value="bidirectional" ${e.type==='bidirectional'?'selected':''}>Bidireccional</option>
        </select></td>
        <td><input type="number" class="form-control form-control-sm edge-weight" data-id="${e.id}" value="${e.weight ?? ''}" style="width:85px"></td>
        <td>${e.slack !== undefined ? Math.round(e.slack) : ''}</td>
        <td><button class="btn btn-sm btn-outline-danger edge-del" data-id="${e.id}">X</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edge-type').forEach(s => s.onchange = (e) => {
      const edge = this.app.model.edges.find(ed => ed.id === e.target.dataset.id);
      if (edge) edge.type = e.target.value;
      this.app.engine.render();
    });

    tbody.querySelectorAll('.edge-weight').forEach(i => i.onchange = (e) => {
      const edge = this.app.model.edges.find(ed => ed.id === e.target.dataset.id);
      if (edge) edge.weight = e.target.value === '' ? null : parseFloat(e.target.value);
      this.app.engine.render();
    });

    tbody.querySelectorAll('.edge-del').forEach(b => b.onclick = (e) => {
      this.app.model.edges = this.app.model.edges.filter(ed => ed.id !== e.target.dataset.id);
      this.app.engine.render();
    });
  }

  buildMatrix() {
    const table = document.getElementById('matrix-table');
    const modalTable = document.getElementById('matrix-table-modal');
    [table, modalTable].forEach(t => t.innerHTML = '');

    const ordered = [...this.app.model.nodes].sort((a, b) => a.label.localeCompare(b.label));
    if (ordered.length === 0) return;

    const n = ordered.length;
    const indexById = new Map(ordered.map((n, i) => [n.id, i]));
    const M = Array(n).fill().map(() => Array(n).fill(0));

    this.app.model.edges.forEach(e => {
      const i = indexById.get(e.source);
      const j = indexById.get(e.target);
      if (i === undefined || j === undefined) return;
      const w = e.weight ?? 1;
      if (e.type === 'directed') M[i][j] += w;
      else { M[i][j] += w; M[j][i] += w; }
    });

    const createTable = (target) => {
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr>' + ordered.map(n => `<th>${n.label}</th>`).join('') + '</tr>';
      target.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let i = 0; i < n; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = M[i].map(v => `<td>${v}</td>`).join('');
        tbody.appendChild(tr);
      }
      target.appendChild(tbody);
    };

    createTable(table);
    createTable(modalTable);
  }
}