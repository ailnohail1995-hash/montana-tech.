import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const stage2=fs.readFileSync('stage2.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const [,name] of app.matchAll(/\$\("([^"]+)"\)/g))assert(ids.has(name),'Missing app element: '+name);
for(const name of ['advancedPanel','filterBattery','filterScreen','filterHz','filterChip','filterSort','compareFocus','compareDifferences','accessoryPhonePick','budgetManual','budgetCurrencyChoice']){
  assert(ids.has(name),'Missing stage2 control: '+name);
}
for(const str of ['stage2.js','app.js','styles.css'])assert(html.includes(str),'HTML does not include '+str);
assert(html.indexOf('stage2.js')<html.indexOf('app.js'),'Stage2 script must load before app');
assert(sw.includes('"./stage2.js"'),'Service worker must cache Stage2');
assert(!stage2.includes('sb_secret_'),'Do not expose secrets');
assert(!app.includes('sb_secret_'),'Do not expose secrets in client');
assert(css.includes('stage2-insight'));

const context={window:{},Intl,Number,Math,Date,URL,String,Array,Set};
vm.runInNewContext(stage2,context,{timeout:1000});
const x=context.window.MontanaStage2;
assert(x,'Stage2 library missing');
assert(x.matchingReasons({strengths:['بطارية'],battery_mah:6000},['بطارية']).length===1);
assert(x.matchingReasons({strengths:['تصوير'],battery_mah:5000},['بطارية']).length===0);
const mock=[
  {slug:'a',name:'A',battery_mah:5000,screen_hz:120,display_inches:6.8,strengths:['تصوير']},
  {slug:'b',name:'B',battery_mah:6000,screen_hz:120,display_inches:6.7,strengths:['تصوير','بطارية']},
  {slug:'c',name:'C',battery_mah:null,screen_hz:60,display_inches:6.3,strengths:['ألعاب']}
];
assert(x.selectSort(mock).length===3);
assert(x.alternativeCandidates(mock[0],mock)[0].p.slug==='b');
assert(x.accessoryLabel({compatibility_kind:'model_specific'},{slug:'a',name:'A'}).status==='التحقق مطلوب');
console.log('Stage 2 static and decision-rule contracts: PASS');
