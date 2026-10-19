import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source=fs.readFileSync('src/components/student/LearningAnswer.jsx','utf8').replace(/^import ['"].*\.css['"];\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/from (["'])([^"']+)\1/g,(_match,_quote,name)=>`from ${JSON.stringify(import.meta.resolve(name))}`);
const {default:LearningAnswer}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const render=content=>renderToStaticMarkup(React.createElement(LearningAnswer,{content}));
test('learning answers render real headings, emphasis, lists and comparison tables',()=>{
 const html=render('## Female reproductive system\n\nThe **ovaries** produce ova.\n\n- Ovaries produce ova.\n- The uterus supports development.\n\n| Organ | Function |\n| --- | --- |\n| Ovary | Produces ova |');
 assert.match(html,/<h3[^>]*>Female reproductive system<\/h3>/);assert.match(html,/<strong[^>]*>ovaries<\/strong>/);assert.match(html,/<ul[^>]*>/);assert.match(html,/<table /);assert.match(html,/<th scope="col"/);assert.doesNotMatch(html,/\*\*ovaries\*\*|## Female|\| ---/);
});
test('maths renders with accessible notation instead of raw LaTeX',()=>{
 const html=render('Solve $x^2 = 4$.\n\n$$\nx = \\pm 2\n$$');
 assert.match(html,/class="katex"/);assert.match(html,/<math /);assert.doesNotMatch(html,/\$x\^2/);
});
test('AI HTML, remote images and script links cannot execute in the answer',()=>{
 const html=render('<script>alert(1)</script>\n\n![tracking](https://attacker.test/image)\n\n[unsafe](javascript:alert%281%29)');
 assert.doesNotMatch(html,/<script|<img|href="javascript:/);
});
