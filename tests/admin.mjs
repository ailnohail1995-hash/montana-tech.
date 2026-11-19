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
assert(html.includes('ailnohail1995@gmail.com'),"Admin identity displayed incorrectly");
assert(!html.includes('tomjontom21@gmail.com'),"Old admin may not remain in UI");
for(const id of ['loginPassword','forgotPassword','recoveryForm','recoveryCode','newPassword','confirmNewPassword','changePassword'])assert(ids.has(id),'Admin password or recovery field missing: '+id);
assert(js.includes('grant_type=password'),'Password login endpoint required');
for(const field of ['signupAdmin','signupConfirmForm','signupConfirmationCode','verifySignup'])assert(ids.has(field),'First login setup missing '+field);
assert(js.includes('activateFirstManager'), 'Owner browser activation missing');
assert(js.includes('/signup?redirect_to='), 'Signup must use native Supabase Auth with email verification');
assert(!js.includes('AILNOHail1995'), 'Initial manager password must never be bundled');
assert(js.includes('/recover?redirect_to='),'Gmail recovery must use Supabase Auth recovery email');
for(const id of ['reauthPasswordForm','reauthNonce','reauthNewPassword','reauthPasswordRepeat','saveVerifiedPassword','changePassword'])assert(ids.has(id),'Manager reauthentication field missing: '+id);
assert(js.includes('AUTH+"/reauthenticate"'),'Must ask Supabase to send reauth nonce');
assert(js.includes('updatePasswordWithNonce'),'Must use nonce before accepting a password change');
assert(js.includes('{password,nonce}'),'Password update must send nonce to Supabase Auth');

assert(js.includes('type:"recovery"'),'Password reset must verify recovery token');
assert(js.includes('getVerifiedAdminIdentity'),'Password update must verify admin email from Auth');
assert(!js.includes('AILNOHail1995'),'User password must not appear in app bundle');
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
