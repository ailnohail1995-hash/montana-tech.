import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(p,"utf8");
const html=read("admin.html"),js=read("admin.js"),css=read("admin.css"),store=read("app.js"),home=read("index.html");
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const id of ["loginForm","verifyForm","loginEmail","dashboard","page-phones","page-brands","page-categories","page-variants","page-prices","editorForm","editorFields","catalogCategoriesList","auditList"]){
 assert(ids.has(id),"Admin missing "+id);
}
for(const section of ["phones","brands","categories","variants","prices","settings"]){
 assert(html.includes('data-page="'+section+'"'),"Missing manager navigation "+section);
}
assert(html.includes('class="dashboard hidden"'),"Manager data must be hidden before authorization");
assert(html.includes('tomjontom21@gmail.com'),"Admin identity displayed incorrectly");
assert(js.includes('/auth/v1'),"Missing Supabase Auth endpoints");
assert(js.includes('store_currency_settings'),"Server-side permission check required");
assert(js.includes('phone_price_guides'),"Manager must edit indicative prices");
assert(js.includes('catalog_categories'),"Manager must edit storefront categories");
assert(js.includes('storage/v1/object/'),"Manager must store images inside Supabase");
assert(js.includes('fonkora_admin_audit_view'),"Manager must use RLS-invoker audit log");
assert(js.includes('isAdmin'),"Authorization state missing");
assert(!/service_role|sb_secret_/.test(js),"Admin browser code contains forbidden secret indicator");
assert(!/createUser\(/i.test(js),"Do not grant rights using client-editable user data");
assert(!/\bDELETE\b[^\n]+phone_models/.test(js),"No destructive phone bulk deletion");
assert(home.includes('id="catalogCategorySelect"'),"Storefront cannot filter admin categories");
assert(store.includes('/catalog_categories?select='),"Storefront not connected to category source");
assert(css.includes('.editor-overlay'),"Admin editor not styled");
new Function(js);
console.log("FONKORA admin static contract, authorization UX and customer category wiring: PASS");
