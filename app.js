const form=document.querySelector('#transferForm'),success=document.querySelector('#success'),errorBox=document.querySelector('#error'),sendButton=document.querySelector('#sendButton'); form.elements.fecha.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10); let installPrompt=null; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;}); document.querySelector('#installHelp').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else{document.querySelector('#helpBox').hidden=false;}}; document.querySelector('#closeHelp').onclick=()=>document.querySelector('#helpBox').hidden=true; const money=v=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(String(v).replace(/\./g,'').replace(',','.'))||0); form.addEventListener('submit',async e=>{e.preventDefault();success.hidden=true;errorBox.hidden=true;sendButton.disabled=true;sendButton.textContent='Preparando…';try{const d=new FormData(form),file=d.get('comprobante');const record={id:Date.now(),repartidor:d.get('repartidor'),vendedorZona:d.get('vendedorZona'),clienteNumero:d.get('clienteNumero'),clienteNombre:d.get('clienteNombre'),importe:d.get('importe'),fecha:d.get('fecha'),operacion:d.get('operacion'),observaciones:d.get('observaciones')};const saved=JSON.parse(localStorage.getItem('distrivan-transferencias')||'[]');saved.push(record);localStorage.setItem('distrivan-transferencias',JSON.stringify(saved));const text=`*TRANSFERENCIA RECIBIDA*\n\n*Cliente N.º:* ${record.clienteNumero}\n*Cliente:* ${record.clienteNombre}\n*Importe:* ${money(record.importe)}\n*Cobrador:* ${record.repartidor}\n*Vendedor de la zona:* ${record.vendedorZona}\n*Fecha:* ${record.fecha}${record.operacion?`\n*N.º operación:* ${record.operacion}`:''}${record.observaciones?`\n*Observaciones:* ${record.observaciones}`:''}`;if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Transferencia DistriVan',text,files:[file]});}else if(navigator.share){await navigator.share({title:'Transferencia DistriVan',text});}else{window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');}success.textContent='Transferencia guardada. Elegí el grupo de WhatsApp de DistriVan.';success.hidden=false;form.reset();form.elements.fecha.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);}catch(err){if(err.name!=='AbortError'){errorBox.textContent='No se pudo compartir. Intentá nuevamente.';errorBox.hidden=false;}}finally{sendButton.disabled=false;sendButton.textContent='Enviar transferencia por WhatsApp';}}); 
const comprobanteInput=form.elements.comprobante,operacionInput=document.querySelector('#operacion'),ocrStatus=document.querySelector('#ocrStatus');
function setOcrStatus(message,state='reading'){ocrStatus.textContent=message;ocrStatus.className='ocr-status '+state;ocrStatus.hidden=false;}
function extractOperationNumber(text){
  const clean=String(text||'').replace(/\r/g,'');
  const lines=clean.split('\n').map(line=>line.trim()).filter(Boolean);
  const labels=/(?:n[°ºo.]?\s*(?:de\s*)?(?:operaci[oó]n|comprobante)|nro\.?\s*(?:de\s*)?(?:operaci[oó]n|comprobante)|operaci[oó]n|referencia|id\s*(?:de\s*)?(?:operaci[oó]n|transacci[oó]n))/i;
  for(let i=0;i<lines.length;i++){
    if(!labels.test(lines[i]))continue;
    const same=lines[i].replace(labels,' ').match(/[A-Z0-9][A-Z0-9.-]{4,29}/i);
    if(same){const value=same[0].replace(/[^A-Z0-9]/gi,'');if(value.length>=5)return value;}
    const next=(lines[i+1]||'').match(/[A-Z0-9][A-Z0-9.-]{4,29}/i);
    if(next){const value=next[0].replace(/[^A-Z0-9]/gi,'');if(value.length>=5)return value;}
  }
  return '';
}
comprobanteInput.addEventListener('change',async()=>{
  const file=comprobanteInput.files&&comprobanteInput.files[0];
  if(!file)return;
  if(file.type==='application/pdf'){setOcrStatus('En archivos PDF, ingresá el número manualmente.','warning');return;}
  if(!file.type.startsWith('image/')){setOcrStatus('Este archivo no se puede leer automáticamente.','warning');return;}
  if(!window.Tesseract){setOcrStatus('No se pudo iniciar la lectura. Podés escribir el número manualmente.','warning');return;}
  let worker;
  try{
    setOcrStatus('Analizando comprobante… 0%');
    worker=await Tesseract.createWorker('spa',1,{logger:m=>{if(m.status==='recognizing text')setOcrStatus('Analizando comprobante… '+Math.round((m.progress||0)*100)+'%');}});
    const result=await worker.recognize(file);
    const detected=extractOperationNumber(result.data.text);
    if(detected){operacionInput.value=detected;setOcrStatus('Número detectado: '+detected+'. Revisalo antes de enviar.','success');}
    else setOcrStatus('No se identificó el número. Podés escribirlo manualmente.','warning');
  }catch(err){setOcrStatus('No se pudo leer la imagen. Podés escribir el número manualmente.','warning');}
  finally{if(worker)await worker.terminate().catch(()=>{});}
});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js'));