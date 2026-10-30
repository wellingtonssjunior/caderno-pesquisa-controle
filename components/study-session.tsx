'use client';
import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ArrowLeft, BookOpen, Check, Clock, Copy, Download, ExternalLink, PencilLine } from 'lucide-react';
import { lessons, refs } from '@/lib/content';
import { studyNotebooks } from '@/lib/study-notebooks';

type Props = {
  lesson:typeof lessons[number];
  entry:Record<string,string>;
  onEdit:(value:Record<string,string>)=>void;
  onBack:()=>void;
  onDay:(day:number)=>void;
};

function Formula({tex}:{tex:string}) {
  // Only authored equations enter this renderer; KaTeX's trusted commands stay off.
  return <div className="studyMath" dangerouslySetInnerHTML={{__html:katex.renderToString(tex,{displayMode:true,throwOnError:false,trust:false,output:'htmlAndMathml'})}}/>;
}

export default function StudySession({lesson,entry,onEdit,onBack,onDay}:Props) {
  const notebook = studyNotebooks[lesson.day];
  const [copyStatus,setCopyStatus] = useState('');
  const sources = [...new Set([...lesson.read,...notebook.reading.map(item=>item.ref)])];
  function downloadCode() {
    if (!notebook.code) return;
    const blob = new Blob([`% Sessao ${lesson.day}: ${lesson.title}\n% Exemplo didatico do caderno; nao representa a planta experimental.\n${notebook.code}\n`],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `sessao_${String(lesson.day).padStart(2,'0')}.m`; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(notebook.code || '');setCopyStatus('Código copiado.'); }
    catch { setCopyStatus('Não foi possível copiar. Use Baixar script ou selecione o código.'); }
  }
  return <article className="studyNotebook">
    <button className="textButton" onClick={onBack}><ArrowLeft size={16}/>Voltar às sessões</button>
    <div className="eyebrow spaced">NOTEBOOK EM PORTUGUÊS · SESSÃO {String(lesson.day).padStart(2,'0')}</div>
    <h1>{lesson.title}</h1><p className="lead">{lesson.goal}</p>
    <div className="properties"><span><Clock size={16}/>{lesson.time}</span><span>{lesson.topic}</span><label className="checkLabel"><input type="checkbox" checked={entry.done==='yes'} onChange={event=>onEdit({done:event.target.checked?'yes':'no'})}/>Sessão concluída</label></div>
    <div className="studyGuide"><BookOpen size={20}/><p>Leia a explicação, acompanhe o exemplo e faça a prática. Registre suas respostas e use <strong>Salvar</strong> no topo. As fontes originais estão ao final.</p></div>
    <div className="studyContents" aria-label="Partes da sessão">{[['concepts','Entender'],['example','Exemplo'],['practice','Praticar'],['reflection','Registrar'],['sources','Fontes']].map(([id,label])=><a key={id} href={`#session-${lesson.day}-${id}`}>{label}</a>)}</div>

    <section className="studyCell" id={`session-${lesson.day}-concepts`}>
      <div className="studyCellLabel">01 · EXPLICAÇÃO</div><h2>O que você precisa entender</h2>
      {lesson.day===1&&<div className="studyFlow" aria-label="Referência menos medição forma o erro, que passa pelo controlador e pelo processo; a saída retorna pelo sensor."><span>Referência r</span><b>→</b><span>Erro r − yₘ</span><b>→</b><span>Controlador C</span><b>→</b><span>Processo G</span><b>→</b><span>Saída y</span><small>A saída retorna pelo sensor H: yₘ = Hy. O sinal medido é subtraído da referência.</small></div>}
      {notebook.concepts.map(concept=><div className="studyConcept" key={concept.title}><h3>{concept.title}</h3><p>{concept.text}</p></div>)}
      <h3 className="studyFormulaHeading">Equações e condições de uso</h3>
      {notebook.formulas.map(formula=><div className="studyFormula" key={formula.label}><h4>{formula.label}</h4><Formula tex={formula.tex}/><p>{formula.meaning}</p></div>)}
    </section>

    <section className="studyCell studyWorked" id={`session-${lesson.day}-example`}>
      <div className="studyCellLabel">02 · EXEMPLO RESOLVIDO</div><h2>{notebook.example.title}</h2>
      <ol>{notebook.example.steps.map(step=><li key={step}>{step}</li>)}</ol>
      <div className="studyTakeaway"><Check size={18}/><p>{notebook.example.conclusion}</p></div>
    </section>

    <section className="studyCell" id={`session-${lesson.day}-practice`}>
      <div className="studyCellLabel">03 · PRÁTICA GUIADA</div><h2>{notebook.code?'Da conta para o MATLAB':'Agora faça você'}</h2>
      <label className="studyResponse"><span><PencilLine size={16}/>Antes de começar: qual resultado você espera?</span><textarea rows={3} value={entry.prediction||''} onChange={event=>onEdit({prediction:event.target.value})} placeholder="Escreva sua previsão e a razão para ela…"/></label>
      {notebook.code&&<><p className="meta">Copie ou baixe o script e execute no MATLAB. As simulações de funções de transferência requerem Control System Toolbox. O código não é executado pelo navegador.</p><div className="studyCode"><div className="studyCodeHeader"><span>MATLAB · sessão {String(lesson.day).padStart(2,'0')}</span><div><button onClick={copyCode}><Copy size={14}/>Copiar</button><button onClick={downloadCode}><Download size={14}/>Baixar .m</button></div></div><pre tabIndex={0} aria-label={`Código MATLAB da sessão ${lesson.day}`}><code>{notebook.code}</code></pre></div><p className="meta" role="status">{copyStatus}</p></>}
      <h3>O que conferir</h3><ul className="studyChecklist">{notebook.expected.map(item=><li key={item}>{item}</li>)}</ul>
      <div className="studyChallenge"><strong>Experimente e compare</strong><p>{notebook.experiment}</p></div>
      <label className="studyResponse"><span>Resultados observados e interpretação</span><textarea rows={5} value={entry.results||''} onChange={event=>onEdit({results:event.target.value})} placeholder="Registre valores, diferenças em relação à previsão, arquivos produzidos e limitações…"/></label>
      <details className="studyOriginal"><summary>Enunciado e entrega do plano original</summary><p>{lesson.exercise}</p><strong>Entrega</strong><p>{lesson.deliver}</p></details>
    </section>

    <section className="studyCell" id={`session-${lesson.day}-reflection`}>
      <div className="studyCellLabel">04 · VERIFICAR E REGISTRAR</div><h2>Explique com suas palavras</h2><p className="studyQuestion">{lesson.check}</p>
      <label className="studyResponse"><span>Sua resposta, anotações e dúvidas</span><textarea rows={7} value={entry.notes||''} onChange={event=>onEdit({notes:event.target.value})} placeholder="Responda sem consultar. Depois compare com o comentário e registre o que corrigiu…"/></label>
      <details><summary>Conferir o raciocínio após responder</summary><p>{notebook.answer}</p></details>
      <p className="meta">As anotações que você já tinha nesta sessão continuam neste campo.</p>
    </section>

    <section className="studyCell studySources" id={`session-${lesson.day}-sources`}>
      <div className="studyCellLabel">05 · REFERÊNCIAS ORIGINAIS</div><h2>Para conferir e aprofundar</h2>
      <p>Explicações e exemplos próprios deste caderno, organizados em torno das referências da trilha. Não são transcrições dos capítulos. Consulte a fonte para aprofundar as demonstrações e antes de citá-la em um trabalho.</p>
      {sources.map(id=>{const reference=refs.find(item=>item.id===id)!;return <div className="studySource" key={id}><a href={reference.url} target="_blank" rel="noreferrer"><BookOpen size={17}/>{reference.title}<ExternalLink size={14}/></a><small>{reference.author}</small><ul>{notebook.reading.filter(item=>item.ref===id).map(item=><li key={item.section}>{item.url?<a href={item.url} target="_blank" rel="noreferrer">{item.section}<ExternalLink size={12}/></a>:item.section}</li>)}</ul></div>;})}
      <p className="meta">Os links abrem as fontes na internet. O conteúdo guiado e as fórmulas desta sessão ficam disponíveis no caderno local.</p>
    </section>
    <div className="studyEnd"><span>Entrega: {lesson.deliver}</span><div className="actions"><button disabled={lesson.day===1} onClick={()=>onDay(lesson.day-1)}>Sessão anterior</button><button disabled={lesson.day===14} onClick={()=>onDay(lesson.day+1)}>Próxima sessão</button></div></div>
  </article>;
}
