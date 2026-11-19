import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const stage2=fs.readFileSync('stage2.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const android=fs.readFileSync('android/src/main/java/com/montanatech/store/MainActivity.java','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert(html.includes('id="currencySelect"'), '3-way currency selector absent');
assert(html.includes('id="rateAge"'), 'FX update time label absent');
assert(html.includes('id="fxSourceLink"'), 'FX source URL absent');
for(const id of ['usd','new','old'])assert(html.includes('value="'+id+'"'), 'Missing currency '+id);
assert(html.includes('فونكورا'), 'Brand mismatch in HTML');
assert(manifest.short_name==='فونكورا', 'PWA brand mismatch');
assert(android.includes('fonkora-store.montanatech21.workers.dev'), 'Android wrapper points to old domain');
assert(app.includes('/phone_price_guides?select='), 'Guide prices not fetched from Supabase');
assert(app.includes('سعر أولي استرشادي'), 'Estimated pricing disclosure missing');
assert(!/sb_secret_|service_role/.test(app), 'Secret key must never reach the browser');
assert(!sw.includes('/api/rates?'), 'Do not pre-cache live exchange rates');

const context=vm.createContext({
 document:{readyState:'loading',addEventListener:()=>{}},
 console,Intl,Date,Number,String,Math,URL
});
vm.runInContext(app,context,{timeout:1000});
vm.runInContext("priceGuides=new Map([['example',{usd_estimate:900,is_approved:false}]]);rate={market:{sell:150,source:'damascus_market',updated_at:'2026-11-19T21:00:00Z'}};variants=[];",context);
const p=vm.runInContext("priceInfo({slug:'example'})",context);
assert.equal(p.usd,900);
assert.equal(p.syp,135000);
assert.equal(p.illustrative,true);
for(const [currency,label] of [['usd','$'],['new','جديدة'],['old','قديمة']]){
 const markup=vm.runInContext("unit='"+currency+"';priceMarkup({slug:'example'})",context);
 assert(markup.includes(label),'Display for '+currency+' failed');
 assert(markup.includes('ليس عرض بيع'),'Estimate must be clearly labelled');
}
const unavailable=vm.runInContext("unit='new';rate=null;priceMarkup({slug:'example'})",context);
assert(unavailable.includes('$'),'USD available without FX rate');
assert(unavailable.includes('غير متاح'),'Do not fabricate a SYP conversion without FX');
assert(stage2.includes('hasPriceGuide'),'Advisor must include initial-price guidance');
console.log('FONKORA brand, USD/new/old SYP price labels, indicative-price safeguards: PASS');
