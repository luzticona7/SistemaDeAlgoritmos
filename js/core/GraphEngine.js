// js/core/GraphEngine.js
import { GraphRenderer } from './GraphRenderer.js';
import { clamp, pointToSegmentDistance } from '../utils/math.js';

export class GraphEngine {
  constructor(model, app) {
    this.model = model;
    this.app = app;
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new GraphRenderer(this.canvas, this.model);

    this.mousePos = { x: 0, y: 0 };
    this.dragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.oldViewX = 0;
    this.oldViewY = 0;

    this.setupCanvas();
    this.bindEvents();
  }

  setupCanvas() {
    const resize = () => {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const w = Math.max(400, Math.floor(rect.width));
      const h = Math.max(300, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      console.log(`Canvas resized: ${w}x${h} (DPR: ${dpr}, Actual: ${this.canvas.width}x${this.canvas.height})`);
      this.render();
    };

    window.addEventListener('resize', resize);
    resize();
  }

  getMousePos(evt) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  getWorldPos(screenPos) {
    return {
      x: screenPos.x + this.model.viewX,
      y: screenPos.y + this.model.viewY
    };
  }

  hitNode(pos) {
    for (let i = this.model.nodes.length - 1; i >= 0; i--) {
      const n = this.model.nodes[i];
      const r = n.size || 22;
      if (Math.hypot(pos.x - n.x, pos.y - n.y) <= r + 4) return n.id;
    }
    return null;
  }

  hitEdge(pos) {
    const threshold = 6;
    for (const e of this.model.edges) {
      const a = this.model.nodes.find(n => n.id === e.source);
      const b = this.model.nodes.find(n => n.id === e.target);
      if (!a || !b) continue;

      const A = this.renderer.projectEdgePoint(a, b);
      const B = this.renderer.projectEdgePoint(b, a);

      if (a.id === b.id) {
        const r = (a.size || 22) + 14;
        const cx = a.x + r, cy = a.y - r;
        const d = Math.hypot(pos.x - cx, pos.y - cy);
        if (Math.abs(d - r) < threshold) return e.id;
        continue;
      }

      const dx = B.x - A.x, dy = B.y - A.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;

      const perpX = -dy / dist * 30;
      const perpY = dx / dist * 30;
      const control = { x: (A.x + B.x) / 2 + perpX, y: (A.y + B.y) / 2 + perpY };

      const d1 = pointToSegmentDistance(pos, A, control);
      const d2 = pointToSegmentDistance(pos, control, B);
      if (Math.min(d1, d2) < threshold) return e.id;
    }
    return null;
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (ev) => {
      this.mousePos = this.getMousePos(ev);
      const worldPos = this.getWorldPos(this.mousePos);

      if (this.dragging) {
        if (this.model.currentTool === 'select' && this.model.selectedNodeId) {
          const n = this.model.nodes.find(x => x.id === this.model.selectedNodeId);
          if (n) {
            n.x = clamp(worldPos.x - this.dragOffset.x, this.model.viewX + 10, this.model.viewX + this.canvas.clientWidth - 10);
            n.y = clamp(worldPos.y - this.dragOffset.y, this.model.viewY + 10, this.model.viewY + this.canvas.clientHeight - 10);
            this.render();
          }
        } else if (this.model.currentTool === 'move') {
          this.model.viewX = this.oldViewX - (this.mousePos.x - this.dragOffset.x);
          this.model.viewY = this.oldViewY - (this.mousePos.y - this.dragOffset.y);
          this.render();
        }
      } else if (this.model.pendingEdgeSource) {
        this.render();
      }
    });

    this.canvas.addEventListener('mousedown', (ev) => {
      const pos = this.getMousePos(ev);
      const worldPos = this.getWorldPos(pos);
      const nid = this.hitNode(worldPos);
      const eid = this.hitEdge(worldPos);

      if (this.model.currentTool === 'addNode') {
        const node = this.model.addNode(worldPos.x, worldPos.y);
        this.model.selectedNodeId = node.id;
        this.render();
        return;
      }

      if (this.model.currentTool === 'addEdge') {
        if (nid) {
          if (!this.model.pendingEdgeSource) {
            this.model.pendingEdgeSource = nid;
            this.render();
          } else if (this.model.pendingEdgeSource !== nid) {
            this.app.modals.customPrompt('Peso de la arista', '1', 'number').then(weightStr => {
              if (weightStr === null) return;
              const weight = weightStr === '' ? null : parseFloat(weightStr);
              if (isNaN(weight) && weightStr !== '') {
                this.app.modals.showWarning('Peso inválido');
                return;
              }

              // ✅ CORREGIDO: Obtener tipo del modelo
              const edgeType = this.model.getEdgeType();
              
              // ✅ CORREGIDO: Crear aristas según el tipo
              if (edgeType === 'bidirectional') {
                // Crear dos aristas: A → B y B → A
                this.model.edges.push({
                  id: this.generateId(),
                  source: this.model.pendingEdgeSource,
                  target: nid,
                  type: 'directed', // Visualmente es dirigida
                  weight
                });
                this.model.edges.push({
                  id: this.generateId(),
                  source: nid,
                  target: this.model.pendingEdgeSource,
                  type: 'directed', // Visualmente es dirigida
                  weight
                });
              } else {
                // Crear una sola arista (directed o undirected)
                this.model.edges.push({
                  id: this.generateId(),
                  source: this.model.pendingEdgeSource,
                  target: nid,
                  type: edgeType,
                  weight
                });
              }

              this.model.pendingEdgeSource = null;
              this.render();
            });
          }
        }
        return;
      }

      if (this.model.currentTool === 'delete') {
        if (nid) {
          this.model.deleteNode(nid);
          if (this.model.selectedNodeId === nid) this.model.selectedNodeId = null;
        }
        if (eid) {
          this.model.edges = this.model.edges.filter(e => e.id !== eid);
        }
        this.render();
        return;
      }

      if (this.model.currentTool === 'move') {
        this.dragging = true;
        this.dragOffset = { x: pos.x, y: pos.y };
        this.oldViewX = this.model.viewX;
        this.oldViewY = this.model.viewY;
        return;
      }

      if (this.model.currentTool === 'select') {
        if (nid) {
          this.model.selectedNodeId = nid;
          const n = this.model.nodes.find(x => x.id === nid);
          this.dragging = true;
          this.dragOffset = { x: worldPos.x - n.x, y: worldPos.y - n.y };
        } else {
          this.model.selectedNodeId = null;
        }
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
  }

  generateId() {
    return 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  render() {
    this.renderer.draw(
      this.model.nodes,
      this.model.edges,
      this.model.viewX,
      this.model.viewY,
      this.model.pendingEdgeSource,
      this.mousePos,
      this.model.selectedNodeId
    );
    
    // Sincronizar panels solo si existe
    if (this.app && this.app.panels) {
      this.app.panels.sync();
    }
  }
}