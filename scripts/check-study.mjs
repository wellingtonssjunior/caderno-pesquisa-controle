import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import katex from 'katex';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const directory = new URL('../.sites-runtime/study-check/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const compile = source=>ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for (const name of ['content','study-notebooks']) {
  fs.writeFileSync(new URL(`${name}.mjs`,directory),compile(fs.readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8')));
}
const component = fs.readFileSync(new URL('../components/study-session.tsx',import.meta.url),'utf8')
  .replace("import 'katex/dist/katex.min.css';",'')
  .replace('@/lib/content','./content.mjs').replace('@/lib/study-notebooks','./study-notebooks.mjs');
fs.writeFileSync(new URL('study-session.mjs',directory),compile(component));
const { default:Session } = await import(new URL('study-session.mjs',directory));
const { lessons,refs } = await import(new URL('content.mjs',directory));
const { studyNotebooks } = await import(new URL('study-notebooks.mjs',directory));
assert.deepEqual(Object.keys(studyNotebooks).map(Number),lessons.map(lesson=>lesson.day));
let formulas = 0;
for (const lesson of lessons) {
  const notebook = studyNotebooks[lesson.day];
  for (const formula of notebook.formulas) {
    katex.renderToString(formula.tex,{throwOnError:true,strict:'error',displayMode:true});formulas++;
  }
  for (const source of notebook.reading) assert.ok(refs.some(ref=>ref.id===source.ref));
  const entry = { notes:'Anotacao anterior preservada',prediction:'Previsao de teste',results:'Resultado de teste',done:'yes' };
  const html = renderToStaticMarkup(React.createElement(Session,{lesson,entry,onEdit:()=>{},onBack:()=>{},onDay:()=>{}}));
  assert.ok(!html.includes('katex-error'));
  for (const text of [entry.notes,entry.prediction,entry.results,'REFERÊNCIAS ORIGINAIS']) assert.ok(html.includes(text));
  for (const id of lesson.read) assert.ok(html.includes(refs.find(ref=>ref.id===id).url.replaceAll('&','&amp;')));
  fs.writeFileSync(new URL(`session-${lesson.day}.html`,directory),html);
  if (notebook.code) fs.writeFileSync(new URL(`day_${lesson.day}.m`,directory),notebook.code);
}
console.log(`PASS: ${lessons.length} sessões; ${formulas} fórmulas válidas; referências e anotações preservadas na renderização.`);
