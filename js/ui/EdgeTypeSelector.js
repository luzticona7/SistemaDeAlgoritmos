// js/ui/EdgeTypeSelector.js

export class EdgeTypeSelector {
  constructor(graphModel) {
    this.graphModel = graphModel;
    this.init();
  }

  init() {
    this.bindRadioButtons();
    this.setInitialState();
  }

  bindRadioButtons() {
    const radios = document.querySelectorAll('input[name="edgeType"]');
    
    if (radios.length === 0) {
      console.warn('⚠️ No se encontraron radio buttons con name="edgeType"');
      return;
    }
    
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          const type = this.parseEdgeType(e.target.id);
          this.graphModel.setEdgeType(type);
        }
      });
    });
    
    console.log(`✓ EdgeTypeSelector: ${radios.length} radio buttons vinculados`);
  }

  parseEdgeType(radioId) {
    const typeMap = {
      'edgeDirected': 'directed',
      'edgeUndirected': 'undirected',
      'edgeBidirectional': 'bidirectional'
    };
    
    return typeMap[radioId] || 'directed';
  }

  setInitialState() {
    const currentType = this.graphModel.getEdgeType();
    const radioId = this.getRadioIdFromType(currentType);
    const radio = document.getElementById(radioId);
    
    if (radio) {
      radio.checked = true;
      console.log(`✓ EdgeTypeSelector: Estado inicial configurado a "${currentType}"`);
    } else {
      console.warn(`⚠️ No se encontró el radio button con id="${radioId}"`);
    }
  }

  getRadioIdFromType(type) {
    const idMap = {
      'directed': 'edgeDirected',
      'undirected': 'edgeUndirected',
      'bidirectional': 'edgeBidirectional'
    };
    
    return idMap[type] || 'edgeDirected';
  }
}