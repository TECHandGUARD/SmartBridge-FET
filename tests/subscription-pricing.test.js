import test from 'node:test';
import assert from 'node:assert/strict';
import {priceToCents,validPrices} from '../src/lib/subscription-pricing.js';
test('subscription amounts accept arbitrary positive rand amounts with cents',()=>{
 assert.equal(priceToCents('200'),20000);assert.equal(priceToCents('500'),50000);assert.equal(priceToCents('19.99'),1999);assert.equal(priceToCents('0.01'),null);
 for(const value of ['0','-1','1.234','1e3','NaN','','21474836.48'])assert.equal(priceToCents(value),null);
});
test('all three plan prices must load before presenting a payment amount',()=>{
 const rows=['student','parent','tutor_pro'].map(product=>({product,amount_cents:2000}));
 assert.equal(validPrices(rows),true);assert.equal(validPrices(rows.slice(1)),false);
 assert.equal(validPrices(rows.map(row=>({...row,amount_cents:0}))),false);
});
