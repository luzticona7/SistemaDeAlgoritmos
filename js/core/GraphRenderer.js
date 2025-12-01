// js/core/GraphRenderer.js
export class GraphRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.curveAmount = 30;
  }

  projectEdgePoint(from, to) {
    const r = from.size || 22;
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    return { x: from.x + Math.cos(ang) * r, y: from.y + Math.sin(ang) * r };
  }

  midpointOnEdge(a, b) {
    if (a.id === b.id) {
      const r = (a.size || 22) + 14;
      return { x: a.x + r, y: a.y - r * 1.5 };
    }
    const A = this.projectEdgePoint(a, b), B = this.projectEdgePoint(b, a);
    const dx = B.x - A.x, dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const perpX = -dy / dist * this.curveAmount;
    const perpY = dx / dist * this.curveAmount;
    const control = { x: (A.x + B.x) / 2 + perpX, y: (A.y + B.y) / 2 + perpY };
    const t = 0.5;
    const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * control.x + t * t * B.x;
    const y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * control.y + t * t * B.y;
    return { x, y };
  }

  draw(nodes, edges, viewX = 0, viewY = 0, pendingEdgeSource = null, mousePos = null, selectedNodeId = null) {
    const ctx = this.ctx;
    const curveAmount = this.curveAmount;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // fondo rosado (mantener apariencia anterior)
    ctx.fillStyle = '#e496ecff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // grid
    const step = 28;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    const clientW = this.canvas.clientWidth || this.canvas.width;
    const clientH = this.canvas.clientHeight || this.canvas.height;
    const startX = (Math.floor(viewX / step) * step - viewX);
    for (let sx = startX; sx < clientW; sx += step) { ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, clientH); ctx.stroke(); }
    const startY = (Math.floor(viewY / step) * step - viewY);
    for (let sy = startY; sy < clientH; sy += step) { ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(clientW, sy); ctx.stroke(); }
    ctx.restore();

    ctx.save();
    ctx.translate(-viewX, -viewY);

    // edges (curvas + flechas)
    edges.forEach(e => {
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) return;

      ctx.save();
      const isCritical = (e.isCritical === true);
      ctx.strokeStyle = isCritical ? 'red' : 'rgba(11, 11, 11, 0.85)';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = isCritical ? 4 : 2;

      const A = this.projectEdgePoint(a, b);
      const B = this.projectEdgePoint(b, a);
      if (a.id === b.id) {
        const r = (a.size || 22) + 14;
        const cx = a.x + r, cy = a.y - r;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        if (e.type !== 'undirected') this._drawArrowhead(ctx, { x: cx, y: cy + r }, { x: cx, y: cy - r }, ctx.fillStyle);
      } else {
        const dx = B.x - A.x, dy = B.y - A.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) { ctx.restore(); return; }
        const perpX = -dy / dist * curveAmount;
        const perpY = dx / dist * curveAmount;
        const control = { x: (A.x + B.x) / 2 + perpX, y: (A.y + B.y) / 2 + perpY };
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(control.x, control.y, B.x, B.y); ctx.stroke();

        if (e.type === 'directed' || e.type === 'bidirectional') {
          const angle = Math.atan2(B.y - control.y, B.x - control.x);
          const prev = { x: B.x - Math.cos(angle) * 1, y: B.y - Math.sin(angle) * 1 };
          this._drawArrowhead(ctx, prev, B, ctx.fillStyle);
        }
        if (e.type === 'bidirectional') {
          const angle = Math.atan2(A.y - control.y, A.x - control.x);
          const prev = { x: A.x - Math.cos(angle) * 1, y: A.y - Math.sin(angle) * 1 };
          this._drawArrowhead(ctx, prev, A, ctx.fillStyle);
        }
      }

      // 🔧 FIX: Renderizado mejorado del peso - evitar redondeos innecesarios
      const mid = this.midpointOnEdge(a, b);
      if (e.weight != null && e.weight !== '') {
        ctx.fillStyle = '#0f0007ff';
        ctx.font = '600 14px sans-serif';
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'bottom';
        
        // 🔧 FIX: Mostrar el peso exacto sin redondear
        // Si es entero, mostrar sin decimales; si tiene decimales, mostrar hasta 2 decimales
        const weightValue = Number(e.weight);
        const displayWeight = Number.isInteger(weightValue) 
          ? weightValue.toString() 
          : weightValue.toFixed(2);
        

        
        // Dibujar el texto del peso
        ctx.fillStyle = '#0f0007ff';
        ctx.fillText(displayWeight, mid.x, mid.y - 4);
      }
      
      // Mostrar slack si existe (usado en otros algoritmos)
      if (e.slack !== undefined) {
        ctx.fillStyle = '#0f0007ff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'top';
        ctx.fillText(`h=${Math.round(e.slack)}`, mid.x, mid.y + 10);
      }

      ctx.restore();
    });

    // nodes
    nodes.forEach(n => {
      ctx.save();
      const r = n.size || 22;
      if (n.id === selectedNodeId) { 
        ctx.beginPath(); 
        ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2); 
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; 
        ctx.fill(); 
      }
      ctx.beginPath(); 
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2); 
      ctx.fillStyle = n.color || '#FBBD40'; 
      ctx.fill();
      ctx.lineWidth = 2; 
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; 
      ctx.stroke();
      ctx.fillStyle = '#071021';
      ctx.font = '700 12px Poppins, sans-serif'; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillText(n.label, n.x, n.y);

      // Mostrar tiempos tempranos y tardíos si existen (usado en otros algoritmos)
      if (n.et !== undefined && n.lt !== undefined) {
        ctx.fillStyle = '#000'; 
        ctx.font = '12px sans-serif'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'top'; 
        ctx.fillText(`${Math.round(n.et)} | ${Math.round(n.lt)}`, n.x, n.y + r + 5);
      }
      ctx.restore();
    });

    // pending edge preview
    if (pendingEdgeSource) {
      const src = nodes.find(n => n.id === pendingEdgeSource);
      if (src && mousePos) {
        const worldMouse = { x: mousePos.x + viewX, y: mousePos.y + viewY };
        ctx.save(); 
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; 
        ctx.lineWidth = 2;
        const A = this.projectEdgePoint(src, worldMouse);
        ctx.beginPath(); 
        ctx.moveTo(A.x, A.y); 
        ctx.lineTo(worldMouse.x, worldMouse.y); 
        ctx.stroke(); 
        ctx.restore();
      }
    }

    ctx.restore();
  }

  _drawArrowhead(ctx, from, to, fillStyle) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 8;
    ctx.fillStyle = fillStyle || ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
}

// Exponer para scripts legacy
if (typeof window !== 'undefined') window.GraphRenderer = GraphRenderer;