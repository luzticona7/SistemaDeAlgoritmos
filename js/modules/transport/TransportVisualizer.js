/**
 * TransportVisualizer.js
 * Maneja la visualización SVG del problema de transporte
 */

export class TransportVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }
  
  /**
   * Renderizar el gráfico SVG
   */
  render(problem, algorithm = null, stepMode = false) {
    if (!this.container) {
      console.error('Container not found:', this.container);
      return;
    }
    
    this.container.innerHTML = '';
    
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    
    // Posiciones
    const leftX = 80;
    const rightX = w - 120;
    const usableH = h - 80;
    
    const ysLeft = [];
    const ysRight = [];
    
    // Calcular posiciones verticales
    for (let i = 0; i < problem.m; i++) {
      if (problem.m === 1) {
        ysLeft.push(h / 2);
      } else {
        ysLeft.push(60 + i * (usableH / (problem.m - 1)));
      }
    }
    
    for (let j = 0; j < problem.n; j++) {
      if (problem.n === 1) {
        ysRight.push(h / 2);
      } else {
        ysRight.push(60 + j * (usableH / (problem.n - 1)));
      }
    }
    
    // Dibujar aristas primero (para que queden detrás)
    this.drawEdges(svg, problem, algorithm, stepMode, leftX, rightX, ysLeft, ysRight);
    
    // Dibujar nodos izquierdos (orígenes)
    this.drawSourceNodes(svg, problem, leftX, ysLeft);
    
    // Dibujar nodos derechos (destinos)
    this.drawDestinationNodes(svg, problem, rightX, ysRight);
    
    this.container.appendChild(svg);
  }
  
  /**
   * Dibujar nodos de origen (izquierda)
   */
  drawSourceNodes(svg, problem, leftX, ysLeft) {
    for (let i = 0; i < problem.m; i++) {
      const g = document.createElementNS(svg.namespaceURI, 'g');
      const cy = ysLeft[i];
      
      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', leftX);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', 18);
      circle.setAttribute('fill', 'rgba(11, 19, 38, 0.8)');
      circle.setAttribute('stroke', 'var(--pastel-orange)');
      circle.setAttribute('stroke-width', '2');
      g.appendChild(circle);
      
      const txt = document.createElementNS(svg.namespaceURI, 'text');
      txt.setAttribute('x', leftX);
      txt.setAttribute('y', cy + 5);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('font-weight', 'bold');
      txt.setAttribute('fill', 'var(--pastel-orange)');
      txt.textContent = 'F' + (i + 1);
      g.appendChild(txt);
      
      const supplyTxt = document.createElementNS(svg.namespaceURI, 'text');
      supplyTxt.setAttribute('x', leftX - 30);
      supplyTxt.setAttribute('y', cy + 5);
      supplyTxt.setAttribute('text-anchor', 'end');
      supplyTxt.setAttribute('font-size', '11');
      supplyTxt.setAttribute('fill', 'var(--ink)');
      supplyTxt.textContent = `(${problem.supply[i]})`;
      g.appendChild(supplyTxt);
      
      svg.appendChild(g);
    }
  }
  
  /**
   * Dibujar nodos de destino (derecha)
   */
  drawDestinationNodes(svg, problem, rightX, ysRight) {
    for (let j = 0; j < problem.n; j++) {
      const g = document.createElementNS(svg.namespaceURI, 'g');
      const cy = ysRight[j];
      
      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', rightX);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', 18);
      circle.setAttribute('fill', 'rgba(11, 19, 38, 0.8)');
      circle.setAttribute('stroke', 'var(--pastel-orange)');
      circle.setAttribute('stroke-width', '2');
      g.appendChild(circle);
      
      const txt = document.createElementNS(svg.namespaceURI, 'text');
      txt.setAttribute('x', rightX);
      txt.setAttribute('y', cy + 5);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('font-weight', 'bold');
      txt.setAttribute('fill', 'var(--pastel-orange)');
      txt.textContent = 'D' + (j + 1);
      g.appendChild(txt);
      
      const demandTxt = document.createElementNS(svg.namespaceURI, 'text');
      demandTxt.setAttribute('x', rightX + 30);
      demandTxt.setAttribute('y', cy + 5);
      demandTxt.setAttribute('text-anchor', 'start');
      demandTxt.setAttribute('font-size', '11');
      demandTxt.setAttribute('fill', 'var(--ink)');
      demandTxt.textContent = `(${problem.demand[j]})`;
      g.appendChild(demandTxt);
      
      svg.appendChild(g);
    }
  }
  
  /**
   * Dibujar aristas con costos y flujos
   */
  drawEdges(svg, problem, algorithm, stepMode, leftX, rightX, ysLeft, ysRight) {
    for (let i = 0; i < problem.m; i++) {
      for (let j = 0; j < problem.n; j++) {
        const x1 = leftX + 18;
        const y1 = ysLeft[i];
        const x2 = rightX - 18;
        const y2 = ysRight[j];
        
        const path = document.createElementNS(svg.namespaceURI, 'path');
        const d = `M ${x1} ${y1} C ${x1 + 80} ${y1} ${x2 - 80} ${y2} ${x2} ${y2}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
        
        // Etiqueta de costo
        const midx = (x1 + x2) / 2;
        const midy = (y1 + y2) / 2;
        
        const t = document.createElementNS(svg.namespaceURI, 'text');
        t.setAttribute('x', midx - 10);
        t.setAttribute('y', midy - 6);
        t.setAttribute('font-size', '11');
        t.setAttribute('fill', 'var(--ink)');
        t.textContent = problem.cost[i][j];
        svg.appendChild(t);
        
        // Flujo si está asignado
        const flow = algorithm ? (algorithm.X[i] || [])[j] || 0 : 0;
        if (flow > 0) {
          const strokeW = Math.min(8, 1 + Math.log(flow + 1));
          const p2 = document.createElementNS(svg.namespaceURI, 'path');
          p2.setAttribute('d', d);
          
          // Color diferente para el paso actual
          if (stepMode && algorithm && algorithm.i === i && algorithm.j === j) {
            p2.setAttribute('stroke', 'var(--carrot-orange)');
          } else if (stepMode && algorithm && ((i < algorithm.i) || (i === algorithm.i && j < algorithm.j))) {
            p2.setAttribute('stroke', 'var(--success)');
          } else {
            p2.setAttribute('stroke', 'var(--pastel-orange)');
          }
          
          p2.setAttribute('stroke-width', strokeW);
          p2.setAttribute('fill', 'none');
          p2.setAttribute('opacity', '0.9');
          svg.appendChild(p2);
          
          const tf = document.createElementNS(svg.namespaceURI, 'text');
          tf.setAttribute('x', midx + 6);
          tf.setAttribute('y', midy + 14);
          tf.setAttribute('font-size', '12');
          tf.setAttribute('font-weight', 'bold');
          tf.setAttribute('fill', 'var(--ink)');
          tf.textContent = flow;
          svg.appendChild(tf);
        }
      }
    }
  }
}