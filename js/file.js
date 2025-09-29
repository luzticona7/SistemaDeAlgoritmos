(function(){
  // Download graph PNG
  window.downloadGraphPng = function(graphName) {
    render(); // ensure up to date
    const url = canvas.toDataURL('image/png');
    downloadUrl(url, graphName + '.png');
  }

  // Image download handler
  document.getElementById('btn-image').onclick = () => {
    const defaultGraph = document.getElementById('filename').value.trim() || 'grafos';
    const graphNamePrompt = prompt('Nombre del grafo:', defaultGraph);
    if (graphNamePrompt === null) return;
    const graphName = graphNamePrompt.trim() || defaultGraph;
    downloadGraphPng(graphName);
  };

  // Export JSON
  document.getElementById('btn-export').onclick = ()=>{
    const defaultName = document.getElementById('filename').value.trim() || 'grafos';
    const name = prompt('Nombre del archivo JSON:', defaultName);
    if (name === null) return; // Cancelled
    const safeName = name.trim() || defaultName;
    const payload = { nodes, edges, viewX, viewY };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.getElementById('btn-export');
    a.href = url; a.download = safeName + '.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };

  // Import JSON
  document.getElementById('importFile').onchange = (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = e=>{
      try{
        const obj = JSON.parse(e.target.result);
        if(!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) throw new Error('JSON inválido: debe contener arrays nodes y edges');
        nodes = obj.nodes.map(n=>({ id:n.id, label:n.label, x: Number(n.x), y: Number(n.y), color:n.color||'#FBBD40', size: Number(n.size)||22 }));
        edges = obj.edges.map(e=>({ id:e.id, source:e.source, target:e.target, type:e.type||'directed', weight:(e.weight==null?null:Number(e.weight)) }));
        viewX = obj.viewX || 0;
        viewY = obj.viewY || 0;
        selectedNodeId = null; pendingEdgeSource = null;
        render();
        alert('Importado OK');
      }catch(err){
        alert('Error al importar JSON: ' + err.message);
      }
    };
    reader.readAsText(f);
    ev.target.value = '';
  };

  // refresh matrix
  document.getElementById('refresh-matrix').onclick = ()=> buildAdjacencyMatrix();
  document.getElementById('show-matrix-modal').onclick = ()=> buildAdjacencyMatrix();

  // Initial UI state
  setTool('select');
  render();

  // Expose for debugging (opcional)
  window.__G = { nodes, edges, render, setTool };
})();