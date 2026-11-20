-- Run against the intended project after applying checkout migrations.
-- The exception subtransaction rolls every fixture and order back.
do $test$
declare zid uuid; vid bigint; rid uuid:=gen_random_uuid(); tok uuid:=gen_random_uuid();
 cart jsonb; q jsonb; a jsonb; b jsonb;
 customer jsonb:='{"name":"اختبار آلي","phone":"0900000000","address":"عنوان اختبار لا يرسل","notes":"rollback test"}';
begin
 begin
  update public.store_checkout_settings set orders_enabled=true,contact_phone='0900000000',warranty_policy='اختبار ضمان',return_policy='اختبار استبدال' where singleton;
  insert into public.delivery_zones(name_ar,fee_syp_new,eta_text,is_active) values('__transaction_test__',25,'اختبار',true) returning id into zid;
  insert into public.phone_variants(model_slug,sku,stock_count,is_published,is_available,price_syp_new_fixed)
   select slug,'__transaction_test__',2,true,true,10000 from public.phone_models where is_published limit 1 returning id into vid;
  cart:=jsonb_build_array(jsonb_build_object('kind','phone','id',vid,'quantity',2));
  q:=public.quote_checkout(cart,zid);
  if (q->>'total_syp_new')::numeric<>20025 then raise exception 'FAIL total';end if;
  begin
   perform public.place_order(rid,tok,cart,zid,customer,q||'{"total_syp_new":1}');
   raise exception 'FAIL tampering accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
  a:=public.place_order(rid,tok,cart,zid,customer,q);
  b:=public.place_order(rid,tok,cart,zid,customer,q);
  if a<>b then raise exception 'FAIL duplicate';end if;
  if public.track_order(rid,tok)->>'status'<>'new' or public.track_order(rid,gen_random_uuid()) is not null then raise exception 'FAIL tracking';end if;
  begin
   perform public.place_order(gen_random_uuid(),gen_random_uuid(),cart,zid,customer,q);
   raise exception 'FAIL oversold';
  exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='ailnohail1995@gmail.com'),true);
  perform public.change_order_status(rid,'confirmed');
  perform public.change_order_status(rid,'cancelled');
  perform public.change_order_status(rid,'cancelled');
  if (select stock_count from public.phone_variants where id=vid)<>2 then raise exception 'FAIL cancellation stock';end if;
  raise exception sqlstate 'Z0001' using message='PASS';
 exception when sqlstate 'Z0001' then null;
 end;
end $test$;

begin;
set local role anon;
do $$begin
 if public.track_order(gen_random_uuid(),gen_random_uuid()) is not null then raise exception 'FAIL tracking isolation';end if;
 begin perform 1 from public.store_orders;raise exception 'FAIL anonymous private records';exception when insufficient_privilege then null;end;
end $$;
rollback;
