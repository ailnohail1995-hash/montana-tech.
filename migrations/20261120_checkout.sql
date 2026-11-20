-- Additive checkout: no existing catalog, prices or Auth credentials are changed.
alter table public.phone_variants add column if not exists condition_label text not null default 'جديد';
alter table public.phone_variants add column if not exists warranty_text text not null default '';
create table public.store_checkout_settings (
 singleton boolean primary key default true check(singleton),
 orders_enabled boolean not null default false,
 checkout_usd_to_syp_new numeric(18,4) check(checkout_usd_to_syp_new>0),
 rate_updated_at timestamptz,
 contact_phone text not null default '',
 whatsapp_phone text not null default '',
 store_address text not null default '',
 warranty_policy text not null default '',
 return_policy text not null default '',
 delivery_policy text not null default '',
 privacy_policy text not null default 'نستخدم الاسم ورقم الهاتف والعنوان لتنفيذ الطلب والتوصيل فقط. تواصل مع المتجر لطلب تصحيح بياناتك أو حذفها بعد انتهاء الحاجة إليها.',
 updated_at timestamptz not null default now()
);
insert into public.store_checkout_settings(singleton) values(true);
create table public.delivery_zones (
 id uuid primary key default gen_random_uuid(), name_ar text not null unique check(length(name_ar) between 2 and 80),
 fee_syp_new numeric(14,2) not null default 0 check(fee_syp_new>=0),
 eta_text text not null default '', is_active boolean not null default false
);
insert into public.delivery_zones(name_ar) values ('المزة'),('المالكي'),('أبو رمانة'),('المهاجرين'),('ركن الدين'),('الصالحية'),('البرامكة'),('كفرسوسة'),('الميدان'),('الشاغور'),('دمشق القديمة'),('باب توما'),('القصاع'),('التجارة'),('الزاهرة'),('دمر');
create table public.accessory_products (
 id bigint generated always as identity primary key,
 sku text not null unique, name_ar text not null, family_slug text references public.accessory_families(slug),
 compatible_models text[] not null default '{}', description_ar text not null default '', image_url text,
 price_syp_new_fixed numeric(14,2) check(price_syp_new_fixed>0),
 stock_count integer not null default 0 check(stock_count>=0), is_published boolean not null default false,
 warranty_text text not null default ''
);
create table public.store_orders (
 id uuid primary key, order_number bigint generated always as identity unique,
 tracking_token uuid not null, request_payload jsonb not null,
 customer_name text not null, customer_phone text not null,
 address_text text not null, location_url text, notes text not null default '',
 zone_name text not null, zone_id uuid references public.delivery_zones(id),
 delivery_eta text not null, delivery_fee_syp_new numeric(14,2) not null,
 subtotal_syp_new numeric(14,2) not null, total_syp_new numeric(14,2) not null,
 items jsonb not null, status text not null default 'new' check(status in ('new','confirmed','preparing','out_for_delivery','delivered','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index store_orders_phone_time on public.store_orders(customer_phone,created_at);
create index store_orders_status_time on public.store_orders(status,created_at desc);
create table public.order_events (
 id bigint generated always as identity primary key, order_id uuid not null references public.store_orders(id),
 status text not null, actor uuid, occurred_at timestamptz not null default now()
);
create index order_events_order on public.order_events(order_id);
alter table public.store_checkout_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.accessory_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.order_events enable row level security;
revoke all on public.store_checkout_settings, public.delivery_zones, public.accessory_products, public.store_orders, public.order_events from anon,authenticated;
grant select on public.store_checkout_settings, public.delivery_zones, public.accessory_products to anon,authenticated;
grant insert,update,delete on public.delivery_zones,public.accessory_products to authenticated;
grant update on public.store_checkout_settings to authenticated;
grant select on public.store_orders,public.order_events to authenticated;
grant usage,select on sequence public.accessory_products_id_seq to authenticated;
create policy checkout_settings_read on public.store_checkout_settings for select to anon,authenticated using(true);
create policy checkout_settings_manage on public.store_checkout_settings for update to authenticated using((select fonkora_private.is_authorized_admin())) with check((select fonkora_private.is_authorized_admin()));
create policy zones_read on public.delivery_zones for select to anon,authenticated using(is_active or (select fonkora_private.is_authorized_admin()));
create policy zones_manage on public.delivery_zones for all to authenticated using((select fonkora_private.is_authorized_admin())) with check((select fonkora_private.is_authorized_admin()));
create policy accessory_read on public.accessory_products for select to anon,authenticated using(is_published or (select fonkora_private.is_authorized_admin()));
create policy accessory_manage on public.accessory_products for all to authenticated using((select fonkora_private.is_authorized_admin())) with check((select fonkora_private.is_authorized_admin()));
create policy orders_admin_read on public.store_orders for select to authenticated using((select fonkora_private.is_authorized_admin()));
create policy events_admin_read on public.order_events for select to authenticated using((select fonkora_private.is_authorized_admin()));

-- Never trust browser prices. This helper is not callable via the public REST API.
create function fonkora_private.checkout_quote(p_items jsonb,p_zone uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg public.store_checkout_settings; z public.delivery_zones; it jsonb; item_id bigint; qty integer;
 v public.phone_variants; a public.accessory_products; model public.phone_models;
 amount numeric; subtotal numeric:=0; rows jsonb:='[]'; label text; sku text; warranty text;
begin
 select * into cfg from public.store_checkout_settings where singleton;
 if not cfg.orders_enabled then raise exception 'استقبال الطلبات متوقف مؤقتاً؛ تواصل مع المتجر'; end if;
 if length(trim(cfg.contact_phone))<6 or length(trim(cfg.return_policy))<5 or length(trim(cfg.warranty_policy))<5 then raise exception 'إعدادات البيع لم تكتمل بعد'; end if;
 select * into z from public.delivery_zones where id=p_zone and is_active;
 if not found or length(trim(z.eta_text))<2 then raise exception 'اختر منطقة توصيل مفعلة ضمن دمشق'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'السلة غير صحيحة'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20 then raise exception 'السلة يجب أن تضم من ١ إلى ٢٠ إصداراً'; end if;
 if (select count(*) from jsonb_array_elements(p_items))<>(select count(distinct (x->>'kind',x->>'id')) from jsonb_array_elements(p_items) x) then raise exception 'إصدار مكرر في السلة'; end if;
 for it in select value from jsonb_array_elements(p_items) order by value->>'kind',(value->>'id')::bigint loop
  item_id:=(it->>'id')::bigint; qty:=(it->>'quantity')::integer;
  if qty is null or qty<1 or qty>10 then raise exception 'كمية غير صحيحة'; end if;
  if it->>'kind'='phone' then
   select * into v from public.phone_variants where id=item_id;
   if not found or not v.is_published or not v.is_available or coalesce(v.stock_count,0)<qty then raise exception 'إصدار غير متوفر أو الكمية تجاوزت المخزون'; end if;
   select * into model from public.phone_models where slug=v.model_slug and is_published;
   if not found then raise exception 'الهاتف غير منشور'; end if;
   amount:=v.price_syp_new_fixed;
   if coalesce(amount,0)<=0 then
    if coalesce(v.price_usd,0)<=0 or cfg.checkout_usd_to_syp_new is null or cfg.rate_updated_at is null or cfg.rate_updated_at<now()-interval '24 hours' then raise exception 'يلزم تحديث سعر صرف البيع أو اعتماد سعر ثابت بالليرة'; end if;
    amount:=round(v.price_usd*cfg.checkout_usd_to_syp_new,2);
   end if;
   label:=model.name||' • '||coalesce(v.storage_gb::text||'GB','سعة غير محددة')||' • '||coalesce(v.color_label,'لون غير محدد')||' • '||v.condition_label;
   sku:=v.sku; warranty:=v.warranty_text;
  elsif it->>'kind'='accessory' then
   select * into a from public.accessory_products where id=item_id;
   if not found or not a.is_published or a.stock_count<qty or coalesce(a.price_syp_new_fixed,0)<=0 then raise exception 'الإكسسوار غير متوفر'; end if;
   amount:=a.price_syp_new_fixed; label:=a.name_ar; sku:=a.sku; warranty:=a.warranty_text;
  else raise exception 'نوع منتج غير صحيح'; end if;
  subtotal:=subtotal+amount*qty;
  rows:=rows||jsonb_build_array(jsonb_build_object('kind',it->>'kind','id',item_id,'quantity',qty,'name',label,'sku',sku,'warranty',warranty,'unit_syp_new',amount));
 end loop;
 return jsonb_build_object('items',rows,'subtotal_syp_new',subtotal,'delivery_fee_syp_new',z.fee_syp_new,'total_syp_new',subtotal+z.fee_syp_new,'zone_name',z.name_ar,'delivery_eta',z.eta_text,'payment_method','cash_on_delivery');
end $$;
revoke all on function fonkora_private.checkout_quote(jsonb,uuid) from public,anon,authenticated;
create function public.quote_checkout(p_items jsonb,p_zone uuid) returns jsonb language sql security definer set search_path='' as $$select fonkora_private.checkout_quote(p_items,p_zone)$$;
revoke all on function public.quote_checkout(jsonb,uuid) from public;
grant execute on function public.quote_checkout(jsonb,uuid) to anon,authenticated;

create function public.place_order(p_request_id uuid,p_tracking_token uuid,p_items jsonb,p_zone uuid,p_customer jsonb,p_expected_quote jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb; payload jsonb; previous public.store_orders; ph text; it jsonb; res public.store_orders;
begin
 if p_request_id is null or p_tracking_token is null then raise exception 'معرّف الطلب غير صحيح'; end if;
 -- Same id always serializes, including simultaneous retries from another connection.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 payload:=jsonb_build_object('items',p_items,'zone',p_zone,'customer',p_customer,'quote',p_expected_quote);
 select * into previous from public.store_orders where id=p_request_id;
 if found then
  if previous.tracking_token<>p_tracking_token or previous.request_payload<>payload then raise exception 'معرّف مستخدم لطلب مختلف'; end if;
  return jsonb_build_object('id',previous.id,'order_number',previous.order_number,'status',previous.status,'total_syp_new',previous.total_syp_new);
 end if;
 ph:=regexp_replace(translate(coalesce(p_customer->>'phone',''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]()-]','','g');
 if ph !~ '^(09[0-9]{8}|\+9639[0-9]{8}|009639[0-9]{8})$' then raise exception 'أدخل رقم جوال سوري صحيح'; end if;
 ph:=regexp_replace(ph,'^(00963|\+963)','0');
 if coalesce(length(trim(p_customer->>'name')),0) not between 2 and 100 or coalesce(length(trim(p_customer->>'address')),0) not between 10 and 500 or coalesce(length(p_customer->>'notes'),0)>1000 then raise exception 'راجع الاسم والعنوان والملاحظات'; end if;
 if coalesce(p_customer->>'location_url','')<>'' and p_customer->>'location_url' !~ '^https://www\.google\.com/maps\?q=-?[0-9.]+,-?[0-9.]+$' then raise exception 'رابط موقع غير صحيح'; end if;
 perform pg_advisory_xact_lock(hashtextextended(ph,1));
 if (select count(*) from public.store_orders where customer_phone=ph and created_at>now()-interval '1 hour')>=5 then raise exception 'طلبات كثيرة لهذا الرقم؛ تواصل مع المتجر'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>20 then raise exception 'سلة غير صحيحة'; end if;
 -- Deterministic lock order prevents overselling and deadlocks for multi-item baskets.
 for it in select value from jsonb_array_elements(p_items) order by value->>'kind',(value->>'id')::bigint loop
  if it->>'kind'='phone' then perform 1 from public.phone_variants where id=(it->>'id')::bigint for update;
  elsif it->>'kind'='accessory' then perform 1 from public.accessory_products where id=(it->>'id')::bigint for update; end if;
 end loop;
 -- Protect delivery fee and checkout rate against concurrent administrative edits.
 perform 1 from public.store_checkout_settings where singleton for share;
 perform 1 from public.delivery_zones where id=p_zone for share;
 q:=fonkora_private.checkout_quote(p_items,p_zone);
 if p_expected_quote is null or q<>p_expected_quote then raise exception 'تغير السعر أو بيانات التوصيل؛ راجع الإجمالي ثم أكد مجدداً'; end if;
 for it in select value from jsonb_array_elements(q->'items') loop
  if it->>'kind'='phone' then update public.phone_variants set stock_count=stock_count-(it->>'quantity')::int,updated_at=now() where id=(it->>'id')::bigint;
  else update public.accessory_products set stock_count=stock_count-(it->>'quantity')::int where id=(it->>'id')::bigint; end if;
 end loop;
 insert into public.store_orders(id,tracking_token,request_payload,customer_name,customer_phone,address_text,location_url,notes,zone_id,zone_name,delivery_eta,delivery_fee_syp_new,subtotal_syp_new,total_syp_new,items)
 values(p_request_id,p_tracking_token,payload,trim(p_customer->>'name'),ph,trim(p_customer->>'address'),nullif(p_customer->>'location_url',''),coalesce(p_customer->>'notes',''),p_zone,q->>'zone_name',q->>'delivery_eta',(q->>'delivery_fee_syp_new')::numeric,(q->>'subtotal_syp_new')::numeric,(q->>'total_syp_new')::numeric,q->'items') returning * into res;
 insert into public.order_events(order_id,status) values(res.id,'new');
 return jsonb_build_object('id',res.id,'order_number',res.order_number,'status',res.status,'total_syp_new',res.total_syp_new);
end $$;
revoke all on function public.place_order(uuid,uuid,jsonb,uuid,jsonb,jsonb) from public;
grant execute on function public.place_order(uuid,uuid,jsonb,uuid,jsonb,jsonb) to anon,authenticated;

create function public.track_order(p_id uuid,p_token uuid) returns jsonb language sql security definer set search_path='' as $$
select jsonb_build_object('order_number',o.order_number,'status',o.status,'items',o.items,'total_syp_new',o.total_syp_new,'delivery_eta',o.delivery_eta,'created_at',o.created_at,'events',coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'occurred_at',e.occurred_at) order by e.occurred_at) from public.order_events e where e.order_id=o.id),'[]'::jsonb)) from public.store_orders o where o.id=p_id and o.tracking_token=p_token
$$;
revoke all on function public.track_order(uuid,uuid) from public;
grant execute on function public.track_order(uuid,uuid) to anon,authenticated;
create function public.change_order_status(p_id uuid,p_status text) returns text language plpgsql security definer set search_path='' as $$
declare o public.store_orders; it jsonb;
begin
 if not fonkora_private.is_authorized_admin() then raise exception 'صلاحية المدير مطلوبة'; end if;
 select * into o from public.store_orders where id=p_id for update;
 if not found then raise exception 'الطلب غير موجود'; end if;
 if o.status=p_status then return o.status; end if;
 if o.status in ('cancelled','delivered') or not ((p_status='cancelled') or (o.status='new' and p_status='confirmed') or (o.status='confirmed' and p_status='preparing') or (o.status='preparing' and p_status='out_for_delivery') or (o.status='out_for_delivery' and p_status='delivered')) then raise exception 'انتقال حالة غير مسموح'; end if;
 if p_status='cancelled' then
  for it in select value from jsonb_array_elements(o.items) order by value->>'kind',(value->>'id')::bigint loop
   if it->>'kind'='phone' then update public.phone_variants set stock_count=stock_count+(it->>'quantity')::int,updated_at=now() where id=(it->>'id')::bigint;
   else update public.accessory_products set stock_count=stock_count+(it->>'quantity')::int where id=(it->>'id')::bigint; end if;
  end loop;
 end if;
 update public.store_orders set status=p_status,updated_at=now() where id=p_id;
 insert into public.order_events(order_id,status,actor) values(p_id,p_status,auth.uid());
 return p_status;
end $$;
revoke all on function public.change_order_status(uuid,text) from public,anon;
grant execute on function public.change_order_status(uuid,text) to authenticated;

