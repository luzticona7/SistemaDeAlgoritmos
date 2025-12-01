/**
 * TransportUI.js
 * Controlador principal de la interfaz de usuario
 */

import { TransportProblem } from './TransportProblem.js';
import { TransportVisualizer } from './TransportVisualizer.js';
import { NorthwestAlgorithm, MaximizationAlgorithm } from '../../modules/algorithms/NorthwestAlgorithm.js';

export class TransportUI {
  constructor() {
    console.log('TransportUI: Inicializando...');
    
    this.problem = new TransportProblem(3, 3);
    this.visualizer = new TransportVisualizer('svgBox');
    this.algorithm = null;
    this.stepMode = false;
    this.iterationsToShow = null;
    this.pendingAction = null;
    
    console.log('TransportUI: Problema creado:', this.problem);
    console.log('TransportUI: Visualizador creado:', this.visualizer);
    
    this.initializeUI();
    this.updateAlgorithm();
    
    console.log('TransportUI: Inicialización completa');
  }
  
  /**
   * Inicializar la interfaz de usuario
   */
  initializeUI() {
    console.log('TransportUI: Inicializando UI...');
    
    this.renderMatrixEditor();
    this.renderTotals();
    this.visualizer.render(this.problem);
    this.updateProgressBar();
    this.updateStatus("Listo para comenzar. Ingresa los datos del problema.", "info");
    this.renderIterations();
    
    this.setupEventListeners();
    
    console.log('TransportUI: UI inicializada');
  }
  
  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    console.log('TransportUI: Configurando event listeners...');
    
    // Botón: Generar matriz
    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) {
      btnGenerate.onclick = () => {
        console.log('Botón Generar matriz clickeado');
        const m = Math.max(1, Number(document.getElementById('nSources').value || 1));
        const n = Math.max(1, Number(document.getElementById('nTargets').value || 1));
        this.problem = new TransportProblem(m, n);
        this.updateAlgorithm();
        this.renderMatrixEditor();
        this.renderTotals();
        this.visualizer.render(this.problem);
        this.updateProgressBar();
        this.updateStatus("Matriz generada. Ingresa los datos del problema.", "info");
        this.renderIterations();
      };
      console.log('✓ btnGenerate conectado');
    } else {
      console.error('✗ btnGenerate NO encontrado');
    }
    
    // Botón: Llenar aleatorio
    const btnRandom = document.getElementById('btnRandom');
    if (btnRandom) {
      btnRandom.onclick = () => {
        console.log('Botón Llenar aleatorio clickeado');
        this.problem.randomFill();
        this.renderMatrixEditor();
        this.renderTotals();
        this.visualizer.render(this.problem);
        this.checkBalance();
        this.updateStatus("Matriz generada aleatoriamente. El problema está balanceado.", "success");
      };
      console.log('✓ btnRandom conectado');
    } else {
      console.error('✗ btnRandom NO encontrado');
    }
    
    // Botón: Equilibrar
    const btnBalance = document.getElementById('btnBalance');
    if (btnBalance) {
      btnBalance.onclick = () => {
        console.log('Botón Equilibrar clickeado');
        const result = this.problem.balance();
        if (result) {
          this.updateAlgorithm();
          this.renderMatrixEditor();
          this.renderTotals();
          this.visualizer.render(this.problem);
          this.checkBalance();
          this.updateStatus(
            `Se añadió un ${result.type === 'supply' ? 'origen' : 'destino'} dummy con ${result.type === 'supply' ? 'oferta' : 'demanda'} ${result.value}.`,
            "info"
          );
        } else {
          this.updateStatus("El problema ya está balanceado.", "info");
        }
      };
      console.log('✓ btnBalance conectado');
    } else {
      console.error('✗ btnBalance NO encontrado');
    }
    
    // Botón: Ejecutar algoritmo
    const btnRun = document.getElementById('btnRun');
    if (btnRun) {
      btnRun.onclick = () => {
        console.log('Botón Ejecutar algoritmo clickeado');
        this.stepMode = false;
        this.runAlgorithm();
      };
      console.log('✓ btnRun conectado');
    } else {
      console.error('✗ btnRun NO encontrado');
    }
    
    // Botón: Paso a paso
    const btnStep = document.getElementById('btnStep');
    if (btnStep) {
      btnStep.onclick = () => {
        console.log('Botón Paso a paso clickeado');
        if (!this.stepMode) {
          this.stepMode = true;
          this.updateAlgorithm();
          btnStep.innerHTML = `
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            Siguiente paso
          `;
          this.updateProgressBar();
          this.visualizer.render(this.problem, this.algorithm, this.stepMode);
          this.updateStatus("Modo paso a paso iniciado. Usa 'Siguiente paso' para avanzar.", "info");
        } else {
          const result = this.algorithm.step();
          if (result) {
            this.renderStep();
          } else {
            this.finalizeResult();
            btnStep.innerHTML = `
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              Paso a paso
            `;
            this.stepMode = false;
          }
        }
      };
      console.log('✓ btnStep conectado');
    } else {
      console.error('✗ btnStep NO encontrado');
    }
    
    // Botón: Reset
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
      btnReset.onclick = () => {
        console.log('Botón Reset clickeado');
        this.problem = new TransportProblem(3, 3);
        this.stepMode = false;
        this.updateAlgorithm();
        this.renderMatrixEditor();
        this.renderTotals();
        this.visualizer.render(this.problem);
        this.updateProgressBar();
        const btnStep = document.getElementById('btnStep');
        if (btnStep) {
          btnStep.innerHTML = `
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            Paso a paso
          `;
        }
        document.getElementById('assignOutput').textContent = '—';
        document.getElementById('totalCost').textContent = '—';
        this.updateStatus("Sistema reiniciado. Listo para comenzar.", "info");
        this.renderIterations();
      };
      console.log('✓ btnReset conectado');
    } else {
      console.error('✗ btnReset NO encontrado');
    }
    
    // Botones de modo
    const modeMinimize = document.getElementById('modeMinimize');
    const modeMaximize = document.getElementById('modeMaximize');
    
    if (modeMinimize) {
      modeMinimize.onclick = () => this.setMode('minimization');
      console.log('✓ modeMinimize conectado');
    }
    
    if (modeMaximize) {
      modeMaximize.onclick = () => this.setMode('maximization');
      console.log('✓ modeMaximize conectado');
    }
    
    // Botón: Actualizar iteraciones
    const btnUpdateIterations = document.getElementById('btnUpdateIterations');
    if (btnUpdateIterations) {
      btnUpdateIterations.onclick = () => this.updateIterationsToShow();
      console.log('✓ btnUpdateIterations conectado');
    }
    
    // Botones de utilidad
        const btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.onclick = () => this.exportProblem();
      console.log('✓ btnExport conectado');
    }
    
    const btnImport = document.getElementById('btnImport');
    if (btnImport) {
      btnImport.onclick = () => this.importProblem();
      console.log('✓ btnImport conectado');
    }
    
    const btnScreenshot = document.getElementById('btnScreenshot');
    if (btnScreenshot) {
      btnScreenshot.onclick = () => this.takeScreenshot();
      console.log('✓ btnScreenshot conectado');
    }
    
    const btnHelp = document.getElementById('btnHelp');
    if (btnHelp) {
      btnHelp.onclick = () => this.showHelp();
      console.log('✓ btnHelp conectado');
    }
    
    const closeHelp = document.getElementById('closeHelp');
    if (closeHelp) {
      closeHelp.onclick = () => this.hideHelp();
      console.log('✓ closeHelp conectado');
    }
    
    const closeFilename = document.getElementById('closeFilename');
    if (closeFilename) {
      closeFilename.onclick = () => this.hideFilenameModal();
      console.log('✓ closeFilename conectado');
    }
    
    const cancelFilename = document.getElementById('cancelFilename');
    if (cancelFilename) {
      cancelFilename.onclick = () => this.hideFilenameModal();
      console.log('✓ cancelFilename conectado');
    }
    
    const confirmFilename = document.getElementById('confirmFilename');
    if (confirmFilename) {
      confirmFilename.onclick = () => this.confirmFilename();
      console.log('✓ confirmFilename conectado');
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileImport(e));
      console.log('✓ fileInput conectado');
    }
    
    // Cerrar modales al hacer clic fuera
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          this.hideHelp();
        }
      });
      console.log('✓ helpModal conectado');
    }
    
    const filenameModal = document.getElementById('filenameModal');
    if (filenameModal) {
      filenameModal.addEventListener('click', (e) => {
        if (e.target === filenameModal) {
          this.hideFilenameModal();
        }
      });
      console.log('✓ filenameModal conectado');
    }
    
    // Enter para confirmar nombre
    const filenameInput = document.getElementById('filenameInput');
    if (filenameInput) {
      filenameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.confirmFilename();
        }
      });
      console.log('✓ filenameInput conectado');
    }
    
    console.log('TransportUI: Todos los event listeners configurados');
  }
  
  /**
   * Actualizar el algoritmo según el modo
   */
  updateAlgorithm() {
    if (this.problem.mode === 'minimization') {
      this.algorithm = new NorthwestAlgorithm(this.problem);
    } else {
      this.algorithm = new MaximizationAlgorithm(this.problem);
    }
    console.log('TransportUI: Algoritmo actualizado:', this.algorithm);
  }
  
  /**
   * Cambiar modo (minimización/maximización)
   */
  setMode(mode) {
    console.log('TransportUI: Cambiando modo a', mode);
    this.problem.mode = mode;
    document.getElementById('modeMinimize').classList.toggle('active', mode === 'minimization');
    document.getElementById('modeMaximize').classList.toggle('active', mode === 'maximization');
    document.getElementById('modeLabel').textContent = mode === 'minimization' ? 'Minimización' : 'Maximización';
    document.getElementById('totalLabel').textContent = mode === 'minimization' ? 'Costo total' : 'Beneficio total';
    this.updateAlgorithm();
  }
  
  /**
   * Renderizar editor de matriz
   */
  renderMatrixEditor() {
    const container = document.getElementById('matrixArea');
    container.innerHTML = '';
    
    const tbl = document.createElement('table');
    tbl.classList.add('table-dark');
    
    // Encabezado
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    
    for (let j = 0; j < this.problem.n; j++) {
      const th = document.createElement('th');
      th.textContent = 'D' + (j + 1);
      headRow.appendChild(th);
    }
    
    const thSupply = document.createElement('th');
    thSupply.textContent = 'Oferta';
    headRow.appendChild(thSupply);
    thead.appendChild(headRow);
    tbl.appendChild(thead);
    
    // Cuerpo
    const tbody = document.createElement('tbody');
    
    for (let i = 0; i < this.problem.m; i++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = 'F' + (i + 1);
      tr.appendChild(th);
      
      for (let j = 0; j < this.problem.n; j++) {
        const td = document.createElement('td');
        
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = this.problem.cost[i][j];
        inp.min = 0;
        inp.step = 1;
        inp.style.width = '70px';
        inp.style.background = 'rgba(11, 19, 38, 0.7)';
        inp.style.border = '1px solid rgba(255,255,255,0.1)';
        inp.style.color = 'var(--ink)';
        inp.style.borderRadius = '4px';
        inp.style.padding = '4px';
        inp.onchange = () => {
          this.problem.cost[i][j] = Number(inp.value || 0);
          this.visualizer.render(this.problem, this.algorithm, this.stepMode);
          this.checkBalance();
        };
        td.appendChild(inp);
        tr.appendChild(td);
      }
      
      const tdSupply = document.createElement('td');
      const inpS = document.createElement('input');
      inpS.type = 'number';
      inpS.value = this.problem.supply[i];
      inpS.min = 0;
      inpS.step = 1;
      inpS.style.width = '70px';
      inpS.style.background = 'rgba(11, 19, 38, 0.7)';
      inpS.style.border = '1px solid rgba(255,255,255,0.1)';
      inpS.style.color = 'var(--ink)';
      inpS.style.borderRadius = '4px';
      inpS.style.padding = '4px';
      inpS.onchange = () => {
        this.problem.supply[i] = Number(inpS.value || 0);
        this.renderTotals();
        this.checkBalance();
      };
      tdSupply.appendChild(inpS);
      tr.appendChild(tdSupply);
      tbody.appendChild(tr);
    }
    
    // Pie de tabla
    const foot = document.createElement('tr');
    const th0 = document.createElement('th');
    th0.textContent = 'Demanda';
    foot.appendChild(th0);
    
    for (let j = 0; j < this.problem.n; j++) {
      const td = document.createElement('td');
      const inpD = document.createElement('input');
      inpD.type = 'number';
      inpD.value = this.problem.demand[j];
      inpD.min = 0;
      inpD.step = 1;
      inpD.style.width = '70px';
      inpD.style.background = 'rgba(11, 19, 38, 0.7)';
      inpD.style.border = '1px solid rgba(255,255,255,0.1)';
      inpD.style.color = 'var(--ink)';
      inpD.style.borderRadius = '4px';
      inpD.style.padding = '4px';
      inpD.onchange = () => {
        this.problem.demand[j] = Number(inpD.value || 0);
        this.renderTotals();
        this.checkBalance();
      };
      td.appendChild(inpD);
      foot.appendChild(td);
    }
    
    const last = document.createElement('td');
    last.textContent = '';
    foot.appendChild(last);
    tbody.appendChild(foot);
    
    tbl.appendChild(tbody);
    container.appendChild(tbl);
  }
  
  /**
   * Renderizar totales
   */
  renderTotals() {
    const s = this.problem.supply.reduce((a, b) => a + b, 0);
    const d = this.problem.demand.reduce((a, b) => a + b, 0);
    document.getElementById('totals').textContent = `Oferta total = ${s}    |    Demanda total = ${d}`;
  }
  
  /**
   * Verificar balance
   */
  checkBalance() {
    const isBalanced = this.problem.isBalanced();
    
    if (isBalanced) {
      this.updateStatus("El problema está balanceado. Puedes ejecutar el algoritmo.", "success");
    } else {
      const s = this.problem.supply.reduce((a, b) => a + b, 0);
      const d = this.problem.demand.reduce((a, b) => a + b, 0);
      
      if (s > d) {
        this.updateStatus(`El problema NO está balanceado. Oferta (${s}) > Demanda (${d}). Usa el botón "Equilibrar".`, "warning");
      } else {
        this.updateStatus(`El problema NO está balanceado. Oferta (${s}) < Demanda (${d}). Usa el botón "Equilibrar".`, "warning");
      }
    }
    
    return isBalanced;
  }
  
  /**
   * Actualizar barra de progreso
   */
  updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    if (this.algorithm && this.algorithm.totalSteps > 0) {
      const progress = (this.algorithm.currentStep / this.algorithm.totalSteps) * 100;
      progressFill.style.width = `${progress}%`;
    } else {
      progressFill.style.width = '0%';
    }
  }
  
  /**
   * Actualizar estado
   */
  updateStatus(message, type) {
    const statusArea = document.getElementById('statusArea');
    statusArea.innerHTML = '';
    
    const statusDiv = document.createElement('div');
    statusDiv.classList.add('status', type);
    statusDiv.textContent = message;
    statusArea.appendChild(statusDiv);
  }
  
  /**
   * Ejecutar algoritmo completo
   */
  runAlgorithm() {
    console.log('TransportUI: Ejecutando algoritmo...');
    
    if (!this.checkBalance()) {
      this.updateStatus("No se puede ejecutar el algoritmo: el problema no está balanceado.", "error");
      return;
    }
    
    this.updateAlgorithm();
    const result = this.algorithm.run();
    console.log('TransportUI: Resultado del algoritmo:', result);
    this.finalizeResult();
  }
  
  /**
   * Renderizar paso actual
   */
  renderStep() {
    this.renderMatrixEditor();
    this.visualizer.render(this.problem, this.algorithm, this.stepMode);
    document.getElementById('assignOutput').textContent = this.matrixToText(this.algorithm.X);
    const total = this.algorithm.calculateTotal();
    document.getElementById('totalCost').textContent = "(parcial) " + total;
    this.updateProgressBar();
    this.renderIterations();
  }
  
  /**
   * Finalizar resultado
   */
  finalizeResult() {
    console.log('TransportUI: Finalizando resultado...');
    
    this.renderMatrixEditor();
    this.visualizer.render(this.problem, this.algorithm, this.stepMode);
    document.getElementById('assignOutput').textContent = this.matrixToText(this.algorithm.X);
    const total = this.algorithm.calculateTotal();
    document.getElementById('totalCost').textContent = total;
    
    const modeText = this.problem.mode === 'minimization' ? 'Costo' : 'Beneficio';
    this.updateStatus(`Solución completada. ${modeText} total: ${total}.`, "success");
    
    if (this.algorithm.totalSteps) {
      this.algorithm.currentStep = this.algorithm.totalSteps;
    }
    this.updateProgressBar();
    this.renderIterations();
  }
  
  /**
   * Convertir matriz a texto
   */
  matrixToText(M) {
    return M.map(r => r.map(v => String(v).padStart(3, ' ')).join(' | ')).join('\n');
  }
  
  /**
   * Renderizar iteraciones
   */
  renderIterations() {
    const container = document.getElementById('iterationsOutput');
    container.innerHTML = '';
    
    if (!this.algorithm || this.algorithm.iterations.length === 0) {
      container.textContent = "No hay iteraciones para mostrar. Ejecuta el algoritmo para ver las iteraciones.";
      return;
    }
    
    let iterationsToShow = this.algorithm.iterations;
    if (this.iterationsToShow && this.iterationsToShow > 0) {
      iterationsToShow = this.algorithm.iterations.slice(0, this.iterationsToShow);
    }
    
    iterationsToShow.forEach(iteration => {
      const iterationDiv = document.createElement('div');
      iterationDiv.className = 'iteration';
      
      let headerText = `Iteración ${iteration.step}: Asignar ${iteration.allocation} unidades de F${iteration.i+1} a D${iteration.j+1}`;
      if (iteration.value !== undefined) {
        headerText += ` (valor: ${iteration.value})`;
      }
      
      const header = document.createElement('div');
      header.className = 'iteration-header';
      header.textContent = headerText;
      iterationDiv.appendChild(header);
      
      const table = document.createElement('table');
      table.className = 'iteration-table';
      
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      headRow.appendChild(document.createElement('th'));
      
      for (let j = 0; j < this.problem.n; j++) {
        const th = document.createElement('th');
        th.textContent = 'D' + (j + 1);
        headRow.appendChild(th);
      }
      
      thead.appendChild(headRow);
      table.appendChild(thead);
      
      const tbody = document.createElement('tbody');
      
      for (let i = 0; i < this.problem.m; i++) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = 'F' + (i + 1);
        tr.appendChild(th);
        
        for (let j = 0; j < this.problem.n; j++) {
          const td = document.createElement('td');
          if (i === iteration.i && j === iteration.j) {
            td.classList.add('current-cell');
          }
          
          const value = iteration.currentX[i][j];
          td.textContent = value > 0 ? value : '';
          tr.appendChild(td);
        }
        
        tbody.appendChild(tr);
      }
      
      table.appendChild(tbody);
      iterationDiv.appendChild(table);
      
      const infoDiv = document.createElement('div');
      infoDiv.style.marginTop = '8px';
      infoDiv.style.fontSize = '11px';
      infoDiv.style.color = 'rgba(255,255,255,0.7)';
      infoDiv.innerHTML = `
        Oferta restante: [${iteration.supplyRemaining.join(', ')}]<br>
        Demanda restante: [${iteration.demandRemaining.join(', ')}]
      `;
      iterationDiv.appendChild(infoDiv);
      
      container.appendChild(iterationDiv);
    });
    
    if (this.iterationsToShow && this.iterationsToShow > 0 && 
        this.iterationsToShow < this.algorithm.iterations.length) {
      const messageDiv = document.createElement('div');
      messageDiv.style.marginTop = '10px';
      messageDiv.style.fontSize = '12px';
      messageDiv.style.color = 'var(--carrot-orange)';
      messageDiv.textContent = `Mostrando ${this.iterationsToShow} de ${this.algorithm.iterations.length} iteraciones.`;
      container.appendChild(messageDiv);
    }
  }
  
  /**
   * Actualizar número de iteraciones a mostrar
   */
  updateIterationsToShow() {
    const inputValue = document.getElementById('iterationsCount').value;
    if (inputValue === '') {
      this.iterationsToShow = null;
    } else {
      const count = parseInt(inputValue);
      if (!isNaN(count) && count > 0) {
        this.iterationsToShow = count;
      }
    }
    this.renderIterations();
  }
  
  /**
   * Exportar problema
   */
  exportProblem() {
    this.pendingAction = 'export';
    this.showFilenameModal('export');
  }
  
  /**
   * Importar problema
   */
  importProblem() {
    this.pendingAction = 'import';
    document.getElementById('fileInput').click();
  }
  
  /**
   * Mostrar modal de nombre de archivo
   */
  showFilenameModal(action) {
    this.pendingAction = action;
    
    const modal = document.getElementById('filenameModal');
    const title = document.getElementById('filenameModalTitle');
    const description = document.getElementById('filenameModalDescription');
    const input = document.getElementById('filenameInput');
    
    if (action === 'export') {
      title.textContent = 'Personalizar nombre de archivo de exportación';
      description.textContent = 'Ingresa el nombre para el archivo de exportación (sin extensión):';
      input.value = `transporte_${new Date().toISOString().slice(0, 10)}`;
      input.style.display = 'block';
    }
    
    modal.style.display = 'flex';
    if (action === 'export') {
      input.focus();
      input.select();
    }
  }
  
  /**
   * Ocultar modal de nombre de archivo
   */
  hideFilenameModal() {
    document.getElementById('filenameModal').style.display = 'none';
    document.getElementById('filenameInput').style.display = 'block';
    document.getElementById('filenameError').style.display = 'none';
    this.pendingAction = null;
  }
  
  /**
   * Validar nombre de archivo
   */
  validateFilename(filename) {
    if (!filename || filename.trim() === '') {
      return false;
    }
    
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (invalidChars.test(filename)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Confirmar nombre de archivo
   */
  confirmFilename() {
    const action = this.pendingAction;
    const input = document.getElementById('filenameInput');
    const error = document.getElementById('filenameError');
    
    if (action === 'export') {
      const filename = input.value.trim();
      
      if (!this.validateFilename(filename)) {
        error.style.display = 'block';
        return;
      }
      
      error.style.display = 'none';
      this.hideFilenameModal();
      this.performExport(filename);
    }
  }
  
  /**
   * Realizar exportación
   */
  performExport(filename) {
    const data = {
      m: this.problem.m,
      n: this.problem.n,
      cost: this.problem.cost,
      supply: this.problem.supply,
      demand: this.problem.demand,
      mode: this.problem.mode,
      X: this.algorithm ? this.algorithm.X : [],
      iterations: this.algorithm ? this.algorithm.iterations : [],
      total: this.algorithm ? this.algorithm.calculateTotal() : 0
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.updateStatus(`Problema exportado como "${filename}.json"`, "success");
  }
  
  /**
   * Manejar importación de archivo
   */
  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.m || !data.n || !data.cost || !data.supply || !data.demand) {
          throw new Error("Formato de archivo inválido");
        }
        
        this.problem = new TransportProblem(data.m, data.n);
        this.problem.cost = data.cost;
        this.problem.supply = data.supply;
        this.problem.demand = data.demand;
        this.problem.mode = data.mode || 'minimization';
        
        document.getElementById('nSources').value = this.problem.m;
        document.getElementById('nTargets').value = this.problem.n;
        
        this.setMode(this.problem.mode);
        this.updateAlgorithm();
        
        if (data.X && data.X.length > 0) {
          this.algorithm.X = data.X;
          this.algorithm.iterations = data.iterations || [];
        }
        
        this.renderMatrixEditor();
        this.renderTotals();
        this.visualizer.render(this.problem, this.algorithm, this.stepMode);
        this.renderIterations();
        
        if (data.total) {
          document.getElementById('totalCost').textContent = data.total;
        }
        
        this.updateStatus(`Problema importado desde "${file.name}"`, "success");
      } catch (error) {
        this.updateStatus("Error al importar el archivo: " + error.message, "error");
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  }
  
  /**
   * Tomar captura de pantalla
   */
  takeScreenshot() {
    if (typeof html2canvas === 'undefined') {
      this.updateStatus("Error: html2canvas no está cargado.", "error");
      return;
    }
    
    const element = document.body;
    
    html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `solucion_transporte_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      this.updateStatus("Captura guardada correctamente.", "success");
    }).catch(error => {
      this.updateStatus("Error al generar la captura: " + error.message, "error");
    });
  }
  
  /**
   * Mostrar ayuda
   */
  showHelp() {
    document.getElementById('helpModal').style.display = 'flex';
  }
  
  /**
   * Ocultar ayuda
   */
  hideHelp() {
    document.getElementById('helpModal').style.display = 'none';
  }
}