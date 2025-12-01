/**
 * TransportProblem.js
 * Clase para manejar el problema de transporte
 */

export class TransportProblem {
  constructor(m, n) {
    this.m = m;
    this.n = n;
    this.cost = Array.from({ length: m }, () => Array(n).fill(0));
    this.supply = Array(m).fill(0);
    this.demand = Array(n).fill(0);
    this.mode = 'minimization'; // 'minimization' o 'maximization'
  }
  
  /**
   * Verificar si el problema está balanceado
   */
  isBalanced() {
    const totalSupply = this.supply.reduce((a, b) => a + b, 0);
    const totalDemand = this.demand.reduce((a, b) => a + b, 0);
    return totalSupply === totalDemand;
  }
  
  /**
   * Balancear el problema añadiendo filas/columnas dummy
   */
  balance() {
    const totalSupply = this.supply.reduce((a, b) => a + b, 0);
    const totalDemand = this.demand.reduce((a, b) => a + b, 0);
    
    if (totalSupply === totalDemand) return false;
    
    if (totalSupply > totalDemand) {
      // Añadir columna dummy
      this.demand.push(totalSupply - totalDemand);
      for (let i = 0; i < this.m; i++) {
        this.cost[i].push(0);
      }
      this.n += 1;
      return { type: 'demand', value: totalSupply - totalDemand };
    } else {
      // Añadir fila dummy
      this.supply.push(totalDemand - totalSupply);
      this.m += 1;
      this.cost.push(Array(this.n).fill(0));
      return { type: 'supply', value: totalDemand - totalSupply };
    }
  }
  
  /**
   * Generar datos aleatorios balanceados
   */
  randomFill() {
    // Asegurar que los valores sean razonables y el problema esté balanceado
    const totalSupply = Math.floor(Math.random() * 100 + 50);
    
    // Distribuir oferta
    let remainingSupply = totalSupply;
    for (let i = 0; i < this.m; i++) {
      if (i === this.m - 1) {
        this.supply[i] = remainingSupply;
      } else {
        this.supply[i] = Math.floor(Math.random() * (remainingSupply / 2)) + 1;
        remainingSupply -= this.supply[i];
      }
    }
    
    // Distribuir demanda (igual a oferta para estar balanceado)
    let remainingDemand = totalSupply;
    for (let j = 0; j < this.n; j++) {
      if (j === this.n - 1) {
        this.demand[j] = remainingDemand;
      } else {
        this.demand[j] = Math.floor(Math.random() * (remainingDemand / 2)) + 1;
        remainingDemand -= this.demand[j];
      }
    }
    
    // Costos aleatorios
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        this.cost[i][j] = Math.floor(Math.random() * 20 + 1);
      }
    }
    
    return true;
  }
}