// js/script.js
// Cambios: se eliminó Demo y su código; export .fis, footer eliminado

// ------------------ Parser / MF / Evaluador ------------------
function parseFIS(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0 && !l.startsWith('%'));
  let pos=0; const sections=[];
  while(pos<lines.length){
    const L = lines[pos];
    if(L.startsWith('[')){
      const sec = L.replace(/\[|\]/g,'').trim();
      pos++;
      const block = [];
      while(pos<lines.length && !lines[pos].startsWith('[')){
        block.push(lines[pos]); pos++;
      }
      sections.push({sec, block});
    } else pos++;
  }
  const fis = {System:{}, Inputs:[], Outputs:[], Rules:[]};
  for(const s of sections){
    if(s.sec.toLowerCase()==='system'){
      for(const ln of s.block){
        const m=ln.match(/^(\w+)\s*=\s*(.+)$/);
        if(m){ let k=m[1]; let v=m[2]; v = v.replace(/^'|'$/g,'').trim();
          fis.System[k]=v;
        }
      }
    } else if(/^input/i.test(s.sec)){
      const input={Name:'input', Range:[0,1], MFs:[]};
      for(const ln of s.block){
        if(/^Name\s*=/.test(ln)) input.Name = ln.split('=')[1].replace(/'/g,'').trim();
        if(/^Range\s*=/.test(ln)) input.Range = ln.split('=')[1].replace(/[\[\]]/g,'').trim().split(/\s+/).map(Number);
        const mf = ln.match(/^MF\d+\s*=\s*'([^']+)'\s*:\s*'([^']+)'\s*,\s*\[([^\]]+)\]/i);
        if(mf){ input.MFs.push({name:mf[1], type:mf[2], params: mf[3].trim().split(/[ ,]+/).map(Number)}); }
      }
      fis.Inputs.push(input);
    } else if(/^output/i.test(s.sec)){
      const output={Name:'output', Range:[0,1], MFs:[]};
      for(const ln of s.block){
        if(/^Name\s*=/.test(ln)) output.Name = ln.split('=')[1].replace(/'/g,'').trim();
        if(/^Range\s*=/.test(ln)) output.Range = ln.split('=')[1].replace(/[\[\]]/g,'').trim().split(/\s+/).map(Number);
        const mf = ln.match(/^MF\d+\s*=\s*'([^']+)'\s*:\s*'([^']+)'\s*,\s*\[([^\]]+)\]/i);
        if(mf){ output.MFs.push({name:mf[1], type:mf[2], params: mf[3].trim().split(/[ ,]+/).map(Number)}); }
      }
      fis.Outputs.push(output);
    } else if(s.sec.toLowerCase()==='rules'){
      for(const ln of s.block){
        if(ln.trim().length) fis.Rules.push(ln.trim());
      }
    }
  }
  return fis;
}

function evalMF(type, params, x){
  type = (type||'').toLowerCase();
  if(type==='trimf'){
    const [a,b,c]=params; if(x<=a || x>=c) return 0; if(x===b) return 1; if(x>a && x<b) return (x-a)/(b-a); return (c-x)/(c-b);
  }
  if(type==='trapmf'){
    const [a,b,c,d]=params; if(x<=a||x>=d) return 0; if(x>=b && x<=c) return 1; if(x>a && x<b) return (x-a)/(b-a); return (d-x)/(d-c);
  }
  if(type==='gaussmf'){
    const [sigma,c]=params; if(sigma===0) return 0; return Math.exp(-Math.pow((x-c),2)/(2*sigma*sigma));
  }
  if(type==='gauss2mf' || type==='gauss2'){
    const [sigma1,c1,sigma2,c2]=params; return Math.max(Math.exp(-Math.pow((x-c1),2)/(2*sigma1*sigma1)), Math.exp(-Math.pow((x-c2),2)/(2*sigma2*sigma2)));
  }
  if(type==='sigmf'){
    const [a,c]=params; return 1/(1+Math.exp(-a*(x-c)));
  }
  return 0;
}

function extractNumbers(s){ const nums = s.match(/-?\d+(\.\d+)?/g) || []; return nums.map(Number); }
function parseRule(ruleStr){
  const parts = ruleStr.split(',');
  if(parts.length<2){ const m=ruleStr.split(':'); if(m.length<2) return null; parts[1]=m[1]; parts[0]=m[0]; }
  const antPart = parts[0], consPart = parts[1] || '';
  const antNums = extractNumbers(antPart); const consNums = extractNumbers(consPart);
  return {antecedent:antNums, consequent:consNums};
}

function evaluateFIS(fis, inputValues){
  const numInputs = fis.Inputs.length; const numOutputs = fis.Outputs.length;
  const inputDegrees = [];
  for(let i=0;i<numInputs;i++){
    const inp = fis.Inputs[i];
    const vals = inp.MFs.map(mf=>evalMF(mf.type,mf.params,inputValues[i]));
    inputDegrees.push(vals);
  }
  const parsedRules = fis.Rules.map(rstr=>{ const p = parseRule(rstr); return {raw:rstr, parsed:p}; }).filter(r=>r.parsed);
  const ruleStrengths=[]; const ruleConsequents=[];
  parsedRules.forEach(r=>{
    const ants = r.parsed.antecedent;
    let strength = 1;
    for(let i=0;i<numInputs;i++){
      const idx = ants[i] !== undefined ? ants[i] : 0;
      if(idx===0){ strength = Math.min(strength,1); continue; }
      const mfIndex = Math.abs(idx) - 1;
      const deg = inputDegrees[i] && inputDegrees[i][mfIndex]!==undefined ? inputDegrees[i][mfIndex] : 0;
      strength = Math.min(strength, deg);
    }
    ruleStrengths.push(strength);
    ruleConsequents.push(r.parsed.consequent);
  });

  const crispOutputs = [];
  for(let outIdx=0; outIdx<numOutputs; outIdx++){
    const out = fis.Outputs[outIdx];
    const samples = 300; const xmin = out.Range[0], xmax = out.Range[1];
    const xs = []; const agg = new Array(samples).fill(0);
    for(let s=0;s<samples;s++) xs.push(xmin + (xmax-xmin)*s/(samples-1));
    parsedRules.forEach((r,ri)=>{
      const cons = ruleConsequents[ri];
      if(!cons || cons.length===0) return;
      const mfIndex1based = Math.abs(cons[0]);
      if(mfIndex1based===0) return;
      const mfIndex = mfIndex1based - 1;
      const strength = ruleStrengths[ri];
      for(let s=0;s<samples;s++){
        const mval = evalMF(out.MFs[mfIndex].type, out.MFs[mfIndex].params, xs[s]);
        const clipped = Math.min(mval, strength);
        agg[s] = Math.max(agg[s], clipped);
      }
    });
    let num=0, den=0;
    for(let s=0;s<xs.length;s++){ num += xs[s]*agg[s]; den += agg[s]; }
    const crisp = den>0 ? num/den : (xmin + xmax)/2;
    crispOutputs.push({value:crisp, xs, agg, out});
  }
  return crispOutputs;
}

function getOutputCategory(outputData){
  const crisp = outputData.value;
  let bestName = null; let bestDeg = -1;
  outputData.out.MFs.forEach(mf=>{
    const deg = evalMF(mf.type, mf.params, crisp);
    if(deg > bestDeg){ bestDeg = deg; bestName = mf.name; }
  });
  return {name: bestName, degree: bestDeg};
}

// ------------------ Serialize to .fis (export) ------------------
function serializeFIS(fis){
  const sys = Object.assign({}, fis.System);
  sys.NumInputs = String(fis.Inputs.length);
  sys.NumOutputs = String(fis.Outputs.length);
  sys.NumRules = String(fis.Rules ? fis.Rules.length : 0);
  if(!sys.AndMethod) sys.AndMethod = 'min';
  if(!sys.OrMethod) sys.OrMethod = 'max';
  if(!sys.ImpMethod) sys.ImpMethod = 'min';
  if(!sys.AggMethod) sys.AggMethod = 'max';
  if(!sys.DefuzzMethod) sys.DefuzzMethod = 'centroid';

  let out = '[System]\n';
  const keysOrder = ['Name','Type','NumInputs','NumOutputs','NumRules','AndMethod','OrMethod','ImpMethod','AggMethod','DefuzzMethod'];
  keysOrder.forEach(k=>{
    if(sys[k] !== undefined) out += `${k}='${sys[k]}'\n`;
  });

  Object.keys(sys).forEach(k=>{
    if(!keysOrder.includes(k)) out += `${k}='${sys[k]}'\n`;
  });

  // Inputs
  fis.Inputs.forEach((inp, i)=>{
    out += `\n[Input${i+1}]\n`;
    out += `Name='${inp.Name}'\n`;
    out += `Range=[${inp.Range.join(' ')}]\n`;
    out += `NumMFs=${inp.MFs.length}\n`;
    inp.MFs.forEach((mf, m)=>{ out += `MF${m+1}='${mf.name}':'${mf.type}',[${mf.params.join(' ')}]\n`; });
  });

  // Outputs
  fis.Outputs.forEach((outp, i)=>{
    out += `\n[Output${i+1}]\n`;
    out += `Name='${outp.Name}'\n`;
    out += `Range=[${outp.Range.join(' ')}]\n`;
    out += `NumMFs=${outp.MFs.length}\n`;
    outp.MFs.forEach((mf, m)=>{ out += `MF${m+1}='${mf.name}':'${mf.type}',[${mf.params.join(' ')}]\n`; });
  });

  // ✅ Exportamos reglas exactamente como las guardamos
  out += `\n[Rules]\n`;
  fis.Rules.forEach(r => out += `${r}\n`);

  return out;
}

// ------------------ Plot helpers ------------------
function buildXs(range, n){ const xs=[]; for(let i=0;i<n;i++) xs.push(range[0] + (range[1]-range[0])*i/(n-1)); return xs; }

function plotOutputMFs(container, outputData){
  const gd = document.createElement('div');
  gd.className = 'output-plot';
  gd.style.height = '520px';
  container.appendChild(gd);
  const traces = [];
  outputData.out.MFs.forEach(mf=>{
    const y = outputData.xs.map(x=>evalMF(mf.type,mf.params,x));
    traces.push({x: outputData.xs, y, name: mf.name, mode:'lines'});
  });
  traces.push({x: outputData.xs, y: outputData.agg, name:'Agregado (clipped)', mode:'lines', line:{width:3}});
  Plotly.newPlot(gd, traces, {margin:{t:30,b:40,l:50,r:20}}, {displayModeBar:false});
}

// 3D plotting (on demand)
function plot3D(containerEl, fis, thirdFixedVal=null){
  const plotContainer = (typeof containerEl === 'string') ? document.getElementById(containerEl) : containerEl;
  if(!plotContainer) return;
  plotContainer.innerHTML = ''; // clear

  if(!fis || !fis.Inputs || fis.Inputs.length < 2 || fis.Outputs.length < 1){
    plotContainer.innerHTML = '<div class="small-muted p-3">Carga un FIS con 2 o 3 entradas y al menos 1 salida para ver la 3D.</div>';
    return;
  }

  const out = fis.Outputs[0];

  if(fis.Inputs.length === 2){
    const in0 = fis.Inputs[0], in1 = fis.Inputs[1];
    const nx = 80, ny = 80;
    const xs = [], ys = [];
    for(let i=0;i<nx;i++) xs.push(in0.Range[0] + (in0.Range[1]-in0.Range[0])*i/(nx-1));
    for(let j=0;j<ny;j++) ys.push(in1.Range[0] + (in1.Range[1]-in1.Range[0])*j/(ny-1));
    const z = [];
    for(let j=0;j<ny;j++){
      const row = [];
      for(let i=0;i<nx;i++){
        const val = evaluateFIS(fis, [xs[i], ys[j]]);
        row.push(val[0].value);
      }
      z.push(row);
    }
    const gd = document.createElement('div');
    gd.style.height = '100%';
    plotContainer.appendChild(gd);
    Plotly.newPlot(gd, [{z:z, x: xs, y: ys, type:'surface', contours:{z:{show:true}}}], {title:`Superficie: ${out.Name}`, scene:{xaxis:{title:in0.Name}, yaxis:{title:in1.Name}, zaxis:{title:out.Name}}});
    return;
  }

  if(fis.Inputs.length === 3){
    const in0 = fis.Inputs[0], in1 = fis.Inputs[1], in2 = fis.Inputs[2];
    const nx = 80, ny = 80;
    const xs = [], ys = [];
    for(let i=0;i<nx;i++) xs.push(in0.Range[0] + (in0.Range[1]-in0.Range[0])*i/(nx-1));
    for(let j=0;j<ny;j++) ys.push(in1.Range[0] + (in1.Range[1]-in1.Range[0])*j/(ny-1));
    const zFix = (thirdFixedVal !== null) ? thirdFixedVal : (in2.Range[0] + in2.Range[1]) / 2;
    const z = [];
    for(let j=0;j<ny;j++){
      const row = [];
      for(let i=0;i<nx;i++){
        const xv = xs[i], yv = ys[j];
        const val = evaluateFIS(fis, [xv, yv, zFix]);
        row.push(val[0].value);
      }
      z.push(row);
    }
    const gd = document.createElement('div');
    gd.style.height = '100%';
    plotContainer.appendChild(gd);
    Plotly.newPlot(gd, [{z:z, x: xs, y: ys, type:'surface', contours:{z:{show:true}}}], {title:`Salida (3ª entrada fija en ${zFix}) — Superficie`, scene:{xaxis:{title:in0.Name}, yaxis:{title:in1.Name}, zaxis:{title:out.Name}}});
    return;
  }

  plotContainer.innerHTML = '<div class="small-muted p-3">La visualización 3D está disponible solo cuando el FIS tiene exactamente 2 o 3 entradas.</div>';
}

// ------------------ UI wiring ------------------
const fisFileInput = document.getElementById('fisFile');
const systemInfo = document.getElementById('systemInfo');
const inputsDiv = document.getElementById('sidePlots');
const outputsDiv = document.getElementById('outputs');
const rulesTbodyFriendly = document.getElementById('rulesTbodyFriendly');
const plotsDiv = document.getElementById('plots');
const inputValuesDiv = document.getElementById('inputValues');
const evalResult = document.getElementById('evalResult');
const statusText = document.getElementById('statusText');
const plot3dArea = document.getElementById('plot3dArea');
const evalBtn = document.getElementById('evalBtn');
const exportFisBtn = document.getElementById('exportFisBtn');
const thirdInputCard = document.getElementById('thirdInputCard');
const thirdInputSlider = document.getElementById('thirdInputSlider');
const thirdInputVal = document.getElementById('thirdInputVal');
const thirdInputMin = document.getElementById('thirdInputMin');
const thirdInputMax = document.getElementById('thirdInputMax');
const show3DBtn = document.getElementById('show3DBtn');
const hide3DBtn = document.getElementById('hide3DBtn');
const addRuleBtnFriendly = document.getElementById('addRuleBtn');
const saveRulesBtnFriendly = document.getElementById('saveRulesBtnFriendly');
const removeRuleBtn = document.getElementById('removeRuleBtn');

let currentFIS = null;
let currentInputValues = [];

// file import
fisFileInput.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return; const txt = await f.text(); renderFIS(txt);
});

// renderFIS: builds UI and friendly rules table
function renderFIS(text){
  const fis = parseFIS(text);
  currentFIS = fis;
  currentInputValues = [];
  inputsDiv.innerHTML=''; plotsDiv.innerHTML=''; outputsDiv.innerHTML=''; if(systemInfo) systemInfo.innerHTML=''; if(rulesTbodyFriendly) rulesTbodyFriendly.innerHTML=''; if(inputValuesDiv) inputValuesDiv.innerHTML=''; evalResult.innerHTML=''; statusText.textContent=''; plot3dArea.innerHTML='';

  // System info
  if(systemInfo){
    const sTitle = document.createElement('div'); sTitle.innerHTML = `<strong>System</strong>`; systemInfo.appendChild(sTitle);
    const si = document.createElement('div');
    for(const k in fis.System){ const d = document.createElement('div'); d.innerHTML = `<small class="small-muted"><strong>${k}:</strong> ${fis.System[k]}</small>`; si.appendChild(d); }
    systemInfo.appendChild(si);
  }

  // Outputs summary
  outputsDiv.innerHTML = '';
  if(fis.Outputs.length){
    fis.Outputs.forEach((o, idx)=>{
      const d = document.createElement('div');
      d.innerHTML = `<small class="small-muted"><strong>${o.Name}</strong> — Range: [${o.Range.join(', ')}] — MFs: ${o.MFs.length}</small>`;
      outputsDiv.appendChild(d);
    });
  }

  // Rules -> friendly table
  buildRulesTableFriendly();

  // Inputs: plots + controls
  if(fis.Inputs && fis.Inputs.length){
    fis.Inputs.forEach((inp, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-3';
      wrapper.innerHTML = `<div class="d-flex justify-content-between"><strong>${inp.Name}</strong><small class="small-muted">Range: [${inp.Range.join(', ')}]</small></div>`;
      const plotDiv = document.createElement('div');
      plotDiv.style.height='240px';
      plotDiv.style.marginTop='6px';
      plotDiv.className = 'input-plot';
      wrapper.appendChild(plotDiv);

      const ctrl = document.createElement('div'); ctrl.className='d-flex align-items-center gap-2 mt-2';
      const range = document.createElement('input'); range.type='range'; range.min=inp.Range[0]; range.max=inp.Range[1]; range.step=(inp.Range[1]-inp.Range[0])/200; range.value = (inp.Range[0]+inp.Range[1])/2; range.style.flex='1';
      const num = document.createElement('input'); num.type='number'; num.step='any'; num.value = (inp.Range[0]+inp.Range[1])/2; num.style.width='90px';
      ctrl.appendChild(range); ctrl.appendChild(num);
      wrapper.appendChild(ctrl);

      inputsDiv.appendChild(wrapper);

      currentInputValues[idx] = parseFloat(num.value);

      const xs = buildXs(inp.Range, 240);
      const traces = inp.MFs.map(mf=>({x: xs, y: xs.map(x=>evalMF(mf.type,mf.params,x)), name: mf.name, mode:'lines'}));
      const layout = {margin:{t:6,b:26}, title: inp.Name, shapes: [{type:'line', x0: num.value, x1:num.value, y0:0, y1:1.15, xref:'x', yref:'paper', line:{color:'red', width:2}}]};
      Plotly.newPlot(plotDiv, traces, layout, {displayModeBar:false});

      function setPointer(v, trigger=true){
        v = Number(v);
        if(isNaN(v)) return;
        if(v < inp.Range[0]) v = inp.Range[0];
        if(v > inp.Range[1]) v = inp.Range[1];
        currentInputValues[idx] = v;
        range.value = v; num.value = Number(v).toFixed(4);
        const relayout = {}; relayout['shapes[0].x0'] = v; relayout['shapes[0].x1'] = v;
        Plotly.relayout(plotDiv, relayout);
        if(trigger){
          evaluateAndRender();
        }
      }

      plotDiv.on('plotly_click', (ev)=> { if(ev && ev.points && ev.points.length){ setPointer(ev.points[0].x, true); } });
      range.addEventListener('input', (e)=> setPointer(e.target.value, true));
      num.addEventListener('change', (e)=> setPointer(e.target.value, true));
    });
  }

  // initial evaluate (without showing 3D)
  evaluateAndRender();

  // third input slider
  if(fis.Inputs.length === 3){
    thirdInputCard.classList.remove('d-none');
    const in3 = fis.Inputs[2];
    thirdInputSlider.min = in3.Range[0];
    thirdInputSlider.max = in3.Range[1];
    thirdInputSlider.step = (in3.Range[1]-in3.Range[0])/1000;
    const mid = (in3.Range[0]+in3.Range[1])/2;
    thirdInputSlider.value = mid;
    thirdInputVal.innerText = mid.toFixed(3);
    thirdInputMin.innerText = in3.Range[0];
    thirdInputMax.innerText = in3.Range[1];
    thirdInputSlider.oninput = ()=> {
      thirdInputVal.innerText = Number(thirdInputSlider.value).toFixed(3);
      statusText.textContent = 'Valor 3ª entrada cambiado — pulsa Mostrar 3D';
    };
  } else {
    thirdInputCard.classList.add('d-none');
  }
}

// evaluate and render MFs & outputs (but do not auto-show 3D)
function evaluateAndRender(){
  if(!currentFIS) return;
  for(let i=0;i<currentFIS.Inputs.length;i++){
    if(currentInputValues[i] === undefined) currentInputValues[i] = (currentFIS.Inputs[i].Range[0] + currentFIS.Inputs[i].Range[1]) / 2;
  }

  const outs = evaluateFIS(currentFIS, currentInputValues);
  plotsDiv.innerHTML=''; evalResult.innerHTML='';

  outs.forEach(o=> plotOutputMFs(plotsDiv, o));
  outs.forEach((o,i)=> {
    const cat = getOutputCategory(o);
    const d = document.createElement('div'); d.className = 'mb-1';
    d.innerHTML = `<strong>${currentFIS.Outputs[i].Name}:</strong> ${o.value.toFixed(4)} — Categoría: <em>${cat.name}</em> (grado ${cat.degree.toFixed(3)})`;
    evalResult.appendChild(d);
  });

  statusText.textContent = 'Evaluado';
}

// evaluate button
evalBtn.addEventListener('click', ()=>{
  const numInputs = Array.from(document.querySelectorAll('#sidePlots input[type=number]'));
  if(numInputs.length === currentFIS.Inputs.length){
    currentInputValues = numInputs.map(i=>parseFloat(i.value));
  }
  evaluateAndRender();
});

// --- RULES: tabla "friendly" ---
function buildRulesTableFriendly(){
  if(!rulesTbodyFriendly) return;
  rulesTbodyFriendly.innerHTML = '';
  if(!currentFIS) return;

  if(!currentFIS.Rules || currentFIS.Rules.length === 0){
    addRuleRowFriendly(1, null);
    return;
  }

  currentFIS.Rules.forEach((rStr, idx) => {
    const parsed = parseRule(rStr);
    addRuleRowFriendly(idx+1, parsed);
  });
}

function addRuleRowFriendly(rowIndex, parsed){
  if(!rulesTbodyFriendly) return;
  const tr = document.createElement('tr');

  const antecedentCell = document.createElement('td');
  antecedentCell.style.minWidth = '220px';
  antecedentCell.className = 'align-middle';

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '6px';
  container.style.flexWrap = 'wrap';

  for(let i=0;i<currentFIS.Inputs.length;i++){
    const sel = document.createElement('select');
    sel.className = 'form-select form-select-sm';
    sel.style.minWidth = '120px';
    const optAny = document.createElement('option'); optAny.value = '0'; optAny.textContent = '0 • any'; sel.appendChild(optAny);
    currentFIS.Inputs[i].MFs.forEach((mf, mi)=>{
      const opt = document.createElement('option'); opt.value = String(mi+1); opt.textContent = `${mi+1} • ${mf.name}`; sel.appendChild(opt);
    });
    if(parsed && parsed.antecedent && parsed.antecedent[i] !== undefined){
      sel.value = String(parsed.antecedent[i] || 0);
    } else sel.value = '0';
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '4px';
    const lbl = document.createElement('small'); lbl.className = 'small-muted'; lbl.textContent = currentFIS.Inputs[i].Name || `In${i+1}`;
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  }
  antecedentCell.appendChild(container);

  // Consequent select
  const consTd = document.createElement('td'); consTd.className = 'align-middle';
  const consSel = document.createElement('select'); consSel.className = 'form-select form-select-sm'; consSel.style.minWidth='160px';
  if(currentFIS.Outputs && currentFIS.Outputs[0] && currentFIS.Outputs[0].MFs){
    currentFIS.Outputs[0].MFs.forEach((mf, mi)=>{
      const opt = document.createElement('option'); opt.value = String(mi+1); opt.textContent = `${mi+1} • ${mf.name}`; consSel.appendChild(opt);
    });
  }
  if(parsed && parsed.consequent && parsed.consequent.length){
    consSel.value = String(Math.abs(parsed.consequent[0] || 0));
  }
  consTd.appendChild(consSel);

  // Actions
  const actionsTd = document.createElement('td'); actionsTd.className = 'align-middle';
  const delBtn = document.createElement('button'); delBtn.className = 'btn btn-sm btn-outline-danger'; delBtn.textContent = 'Eliminar';
  delBtn.addEventListener('click', (e)=>{ e.stopPropagation(); tr.remove(); reindexRules(); });
  actionsTd.appendChild(delBtn);

  // index cell
  const idxCell = document.createElement('td'); idxCell.textContent = rowIndex; idxCell.className = 'align-middle';

  tr.appendChild(idxCell);
  tr.appendChild(antecedentCell);
  tr.appendChild(consTd);
  tr.appendChild(actionsTd);

  tr.addEventListener('click', ()=>{ Array.from(rulesTbodyFriendly.querySelectorAll('tr')).forEach(rr=> rr.classList.remove('table-active')); tr.classList.add('table-active'); });

  rulesTbodyFriendly.appendChild(tr);
}

function addEmptyRuleFriendly(){
  const next = rulesTbodyFriendly.querySelectorAll('tr').length + 1;
  addRuleRowFriendly(next, null);
}

function reindexRules(){
  const rows = 
  Array.from(rulesTbodyFriendly.querySelectorAll('tr'));
  rows.forEach((r, i)=> { 
    const td = r.querySelector('td'); 
    if(td) td.innerText = i+1; 
  });
}

function saveRulesFromTableFriendly(){
  if(!currentFIS) return;
  const newRules = [];
  const rows = Array.from(rulesTbodyFriendly.querySelectorAll('tr'));
  
  rows.forEach((r)=>{
    const antecedentCell = r.children[1];
    const selects = Array.from(antecedentCell.querySelectorAll('select'));
    const ants = selects.map(s => Number(s.value || 0));
    
    const consSel = r.children[2].querySelector('select');
    const consIdx = Number(consSel.value || 0);

    // ✅ Formato corregido sin 1 (1) :
    const ruleStr = `${ants.join(' ')}, ${consIdx}`;
    newRules.push(ruleStr);
  });

  if(newRules.length === 0){
    alert('No hay reglas para guardar.');
    return;
  }

  // ✅ Guardamos directo el array de reglas limpio
  currentFIS.Rules = newRules;
  statusText.textContent = 'Reglas guardadas';
  evaluateAndRender();
}

// add / save / remove rule buttons
if(addRuleBtnFriendly) addRuleBtnFriendly.addEventListener('click', ()=> addEmptyRuleFriendly());
if(saveRulesBtnFriendly) saveRulesBtnFriendly.addEventListener('click', ()=> saveRulesFromTableFriendly());
if(removeRuleBtn) removeRuleBtn.addEventListener('click', ()=> {
  const sel = rulesTbodyFriendly.querySelector('tr.table-active');
  if(!sel){ alert('Selecciona primero la regla que quieres quitar.'); return; }
  sel.remove();
  reindexRules();
});

// EXPORT .fis
if(exportFisBtn) exportFisBtn.addEventListener('click', ()=>{
  if(!currentFIS){
    alert('Primero carga un .fis');
    return;
  }

  // ✅ Actualizamos counts sin alterar formato de reglas
  currentFIS.System = currentFIS.System || {};
  currentFIS.System.NumInputs = String(currentFIS.Inputs.length);
  currentFIS.System.NumOutputs = String(currentFIS.Outputs.length);
  currentFIS.System.NumRules = String(currentFIS.Rules ? currentFIS.Rules.length : 0);

  const fisText = serializeFIS(currentFIS);
  const filename = (document.getElementById('filename').value || 'fis-export') + '.fis';
  const blob = new Blob([fisText], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
});

// Mostrar / ocultar 3D
if(show3DBtn) show3DBtn.addEventListener('click', ()=>{
  if(!currentFIS){ alert('Carga primero un .fis'); return; }
  plot3dArea.style.display = 'block';
  show3DBtn.classList.add('d-none');
  hide3DBtn.classList.remove('d-none');
  let thirdVal = null;
  if(currentFIS.Inputs.length === 3 && thirdInputSlider){
    thirdVal = Number(thirdInputSlider.value);
  }
  plot3D(plot3dArea, currentFIS, thirdVal);
  plot3dArea.scrollIntoView({behavior:'smooth', block:'center'});
});
if(hide3DBtn) hide3DBtn.addEventListener('click', ()=>{
  plot3dArea.style.display = 'none';
  hide3DBtn.classList.add('d-none');
  show3DBtn.classList.remove('d-none');
});

// init: nothing loaded
