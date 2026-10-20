import test from 'node:test';import assert from 'node:assert/strict';
import {addPdfBrand,buildLessonDeck,deckFromLesson,DECK_THEMES,newDeck,renderDeckSlide,validateDeck} from '../src/lib/presentation-decks.js';
function canvas(){const text=[];const ctx={fillRect(){},beginPath(){},arc(){},fill(){},measureText(value){return {width:value.length*15};},fillText(value){text.push(value);}};return {width:1280,height:720,text,getContext:()=>ctx};}
test('all themes render permanent branding, optional author and no speaker notes',()=>{
 const deck=buildLessonDeck('Quadratic equations');assert.equal(validateDeck(deck),true);assert.equal(deck.slides.length,6);deck.slides[0].notes='PRIVATE NOTES';
 for(const theme of Object.keys(DECK_THEMES)){const c=canvas();renderDeckSlide(c,deck.slides[0],theme,1,6,'Anele Qamata');assert.ok(c.text.includes('SmartBridge FET'));assert.ok(c.text.includes('Author: Anele Qamata'));assert.ok(!c.text.includes('PRIVATE NOTES'));assert.ok(c.text.includes('1 / 6'));}
 const c=canvas();renderDeckSlide(c,deck.slides[0],'forest',1,6);assert.ok(!c.text.some(t=>t.startsWith('Author:')));addPdfBrand(c,1,6);assert.equal(c.text.filter(t=>t==='SmartBridge FET').length,2);
});
test('deck bounds and lesson conversion retain editable teaching content',()=>{
 assert.equal(validateDeck(newDeck()),true);const d=newDeck();d.slides[0].body='x'.repeat(1601);assert.equal(validateDeck(d),false);d.slides=[];assert.equal(validateDeck(d),false);d.slides=Array(41).fill({title:'x',body:'',notes:'',layout:'title'});assert.equal(validateDeck(d),false);
 const converted=deckFromLesson({topic:'Fractions',subject:'Mathematics',grade:'Grade 10',objective:'Compare fractions',stages:[{title:'Practice',detail:'Compare 1/2 and 3/4',minutes:10}],assessment:'Explain your answer'});assert.equal(validateDeck(converted.content),true);assert.equal(converted.content.slides[2].body,'Compare 1/2 and 3/4');
});
