'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, Download, ImageIcon, FileText, FileCode, X, RefreshCw } from 'lucide-react';

const categories = [
  { id:'photos', label:'Fotos experimentais', icon:ImageIcon, folder:'Fotos experimentais', accept:'.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif,.tif,.tiff', hint:'JPG, PNG, WEBP, GIF, AVIF, HEIC e TIFF' },
  { id:'references', label:'Referências do professor', icon:FileText, folder:'Referencias do professor', accept:'.pdf,.doc,.docx,.ppt,.pptx,.txt,.bib,.epub,.zip', hint:'PDF, Word, PowerPoint, TXT, BIB, EPUB e ZIP' },
  { id:'matlab', label:'Arquivos MATLAB', icon:FileCode, folder:'MATLAB', accept:'.m,.mlx,.mat,.slx,.mdl,.sldd,.mlapp,.fig,.prj,.csv,.txt,.zip', hint:'MATLAB, Simulink, MAT, CSV, TXT e ZIP' },
] as const;
type Category = typeof categories[number]['id'];
type SavedFile = { id:string; name:string; originalName:string; size:number; uploadedAt:string; description:string; subject:string; previewable:boolean };
const formatSize = (size:number) => size < 1024*1024 ? `${(size/1024).toFixed(1)} KB` : `${(size/1024/1024).toFixed(1)} MB`;
const fileUrl = (category:Category, id:string, preview = false) => `/api/uploads/${id}?category=${category}${preview ? '&preview=1' : ''}`;

export default function Uploads() {
  const [category,setCategory] = useState<Category>('photos');
  const [files,setFiles] = useState<SavedFile[]>([]), [queue,setQueue] = useState<File[]>([]);
  const [description,setDescription] = useState(''), [subject,setSubject] = useState('');
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [dragging,setDragging] = useState(false);
  const [message,setMessage] = useState(''), [error,setError] = useState('');
  const [preview,setPreview] = useState<SavedFile|null>(null);
  const input = useRef<HTMLInputElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const selected = categories.find(item=>item.id===category)!;
  async function load(signal?:AbortSignal) {
    setLoading(true);
    try {
      const response = await fetch(`/api/uploads?category=${category}`, { signal });
      const result = await response.json() as { files:SavedFile[]; error?:string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os arquivos.');
      if (!signal?.aborted) setFiles(result.files);
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os arquivos.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(()=>{ const controller = new AbortController(); void load(controller.signal); return ()=>controller.abort(); },[category]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{ if (preview) dialog.current?.showModal(); else dialog.current?.close(); },[preview]);
  useEffect(()=>{ const warn = (event:BeforeUnloadEvent)=>{ if (busy) { event.preventDefault(); event.returnValue=''; } }; window.addEventListener('beforeunload',warn); return ()=>window.removeEventListener('beforeunload',warn); },[busy]);
  function addFiles(incoming:FileList|File[]) {
    if (busy) return;
    const accepted:File[] = [], rejected:string[] = [];
    for (const file of Array.from(incoming)) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!(selected.accept as string).split(',').includes(extension) || file.size === 0 || file.size > 50*1024*1024) rejected.push(file.name);
      else accepted.push(file);
    }
    setQueue(current=>[...current,...accepted]); setMessage('');
    setError(rejected.length ? `Não adicionados (formato inválido, vazio ou acima de 50 MB): ${rejected.join(', ')}` : '');
  }
  async function send() {
    setBusy(true); setError(''); setMessage('');
    let completed = 0;
    try {
      for (const file of queue) {
        setMessage(`Enviando ${completed+1} de ${queue.length}: ${file.name}`);
        const form = new FormData(); form.append('file',file); form.append('description',description); form.append('subject',subject);
        const response = await fetch(`/api/uploads?category=${category}`, { method:'POST', body:form });
        const result = await response.json() as SavedFile & { error?:string };
        if (!response.ok) throw new Error(result.error || 'Falha no envio.');
        completed++; setFiles(current=>[result,...current]); setQueue(current=>current.slice(1));
      }
      setDescription(''); setSubject(''); setMessage(`${completed} arquivo(s) salvo(s) na pasta do projeto.`);
    } catch (cause) {
      setMessage(`${completed} arquivo(s) salvo(s). Os arquivos pendentes continuam na seleção.`);
      setError(cause instanceof Error ? cause.message : 'Falha no envio. Tente novamente.');
    } finally { setBusy(false); }
  }
  return <div className="uploadsPage">
    <div className="eyebrow">MATERIAIS DA PESQUISA</div><h1>Upload de arquivos</h1>
    <p className="lead">Reúna fotos, referências e códigos para consultar nos seus relatórios.</p>
    <div className="tabs uploadTabs" role="tablist" aria-label="Categorias de arquivos">{categories.map(({id,label,icon:Icon})=><button key={id} role="tab" aria-selected={category===id} aria-controls="upload-panel" id={`upload-tab-${id}`} disabled={busy} className={category===id?'selected':''} onClick={()=>{if (id===category) return; if (queue.length && !window.confirm('Trocar de categoria descarta a seleção ainda não enviada. Continuar?')) return; setCategory(id);setFiles([]);setQueue([]);setError('');setMessage('');setDescription('');setSubject('');}}><Icon size={17}/>{label}</button>)}</div>
    <div id="upload-panel" role="tabpanel" aria-labelledby={`upload-tab-${category}`}>
      <p className="meta uploadDestination">Destino no projeto: <strong>Uploads / {selected.folder}</strong></p>
      <div className={`uploadDrop ${dragging?'dragging':''}`} onDragOver={event=>{event.preventDefault(); if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);addFiles(event.dataTransfer.files);}}>
        <Upload size={30}/><h2>Arraste seus arquivos para cá</h2><p>Ou selecione no computador. Até 50 MB por arquivo.</p>
        <button disabled={busy} onClick={()=>input.current?.click()}>Selecionar arquivos</button>
        <input ref={input} type="file" multiple accept={selected.accept} aria-label="Selecionar arquivos para upload" hidden disabled={busy} onChange={event=>{if(event.target.files)addFiles(event.target.files);event.target.value='';}}/>
        <small>{selected.hint}</small>
      </div>
      {queue.length>0&&<div className="uploadEditor">
        <h2>Prontos para enviar · {queue.length}</h2><ul className="uploadQueue">{queue.map((file,index)=><li key={`${file.name}-${index}`}><span>{file.name}<small>{formatSize(file.size)}</small></span><button disabled={busy} aria-label={`Remover ${file.name} da seleção`} onClick={()=>setQueue(current=>current.filter((_,i)=>i!==index))}><X size={16}/></button></li>)}</ul>
        <label>Experimento ou assunto (opcional)<input maxLength={200} value={subject} disabled={busy} onChange={event=>setSubject(event.target.value)} placeholder="Ex.: Identificação da planta"/></label>
        <label>Descrição (opcional)<textarea rows={3} maxLength={2000} value={description} disabled={busy} onChange={event=>setDescription(event.target.value)} placeholder="Contexto do experimento, indicação do professor ou finalidade do código…"/></label>
        <p className="meta">A descrição e o assunto serão aplicados aos arquivos deste envio.</p>
        <button className="primary" disabled={busy} onClick={send}><Upload size={17}/>{busy?'Enviando…':'Enviar e salvar na pasta'}</button>
      </div>}
      {message&&<p className="uploadStatus" role="status">{message}</p>}{error&&<p className="loginError" role="alert">{error}</p>}
      <div className="sectionTitle uploadListTitle"><h2>Arquivos enviados · {files.length}</h2><button disabled={busy||loading} onClick={()=>{setError('');void load();}}><RefreshCw size={16}/>Atualizar</button></div>
      {loading?<p role="status">Carregando arquivos…</p>:files.length===0?<div className="empty"><selected.icon size={30}/><h3>Nenhum arquivo enviado nesta categoria.</h3><p>Os arquivos aparecerão aqui depois de salvos.</p></div>:<div className="uploadGrid">{files.map(file=><article className="uploadCard" key={file.id}>
        {file.previewable?<button className="uploadThumbnail" onClick={()=>setPreview(file)} aria-label={`Visualizar ${file.name}`}><img src={fileUrl(category,file.id,true)} alt={file.description||file.name} loading="lazy"/></button>:<div className="uploadFileIcon"><selected.icon size={35}/><span>{file.name.split('.').pop()?.toUpperCase()}</span></div>}
        <div className="uploadCardBody"><h3>{file.name}</h3><p className="meta">{formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleString('pt-BR')}</p>{file.subject&&<span className="tag blue">{file.subject}</span>}{file.description&&<p className="uploadDescription">{file.description}</p>}<a href={fileUrl(category,file.id)} download={file.name}><Download size={15}/> Baixar arquivo</a></div>
      </article>)}</div>}
    </div>
    <dialog ref={dialog} className="uploadPreview" onCancel={()=>setPreview(null)} onClose={()=>setPreview(null)}>{preview&&<><div><strong>{preview.name}</strong><button onClick={()=>setPreview(null)} aria-label="Fechar imagem"><X size={20}/></button></div><img src={fileUrl(category,preview.id,true)} alt={preview.description||preview.name}/>{preview.description&&<p>{preview.description}</p>}</>}</dialog>
  </div>;
}
