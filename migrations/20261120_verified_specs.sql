with verified(slug,display_inches,screen_hz,camera_main_mp,battery_mah,source) as (values
('oppo-find-x9-pro',6.78,120,50,7500,'https://www.oppo.com/en/smartphones/series-find-x/find-x9-pro/specs/'),
('oppo-reno15-pro-5g',6.32,120,200,6200,'https://www.oppo.com/en/smartphones/series-reno/reno15-pro/specs/'),
('redmi-note-15-pro-plus-5g',6.83,120,200,6500,'https://www.mi.com/global/product/redmi-note-15-pro-plus-5g/specs/'),
('poco-f8-pro',6.59,120,50,6210,'https://www.mi.com/global/product/poco-f8-pro/specs/'),
('realme-15-pro-5g',6.80,144,50,7000,'https://www.realme.com/global/realme-15-pro-5g/specs'),
('xiaomi-17-ultra',6.90,120,50,6000,'https://www.mi.com/global/product/xiaomi-17-ultra/specs/'),
('vivo-v60',6.77,120,50,6500,'https://www.vivo.com/en/products/param/v60'),
('vivo-x300-pro',6.78,120,50,6510,'https://www.vivo.com/en/products/param/x300-pro'),
('honor-600-pro',6.57,120,200,7000,'https://www.honor.com/global/news/honor-600-series-launch/'),
('honor-x9d',6.79,120,108,8300,'https://www.honor.com/global/news/honor-x9d-launch/'))
update public.phone_models p set display_inches=coalesce(p.display_inches,v.display_inches),screen_hz=coalesce(p.screen_hz,v.screen_hz),camera_main_mp=coalesce(p.camera_main_mp,v.camera_main_mp),battery_mah=coalesce(p.battery_mah,v.battery_mah),verified_on='2026-11-20',specifications=p.specifications||jsonb_build_object('completion_source_url',v.source,'region_note','المواصفات مرجعية للإصدار العالمي؛ قد تختلف البطارية والشرائح والتوافق باختلاف السوق. تحقق من إصدار المتجر قبل الطلب.')
from verified v where p.slug=v.slug returning p.slug,p.display_inches,p.camera_main_mp,p.battery_mah;
update public.phone_models set display_inches=coalesce(display_inches,6.71),screen_hz=coalesce(screen_hz,120),camera_main_mp=coalesce(camera_main_mp,50),battery_mah=coalesce(battery_mah,7100),verified_on='2026-11-20',specifications=specifications||'{"completion_source_url":"https://www.honor.com/levant/phones/honor-magic8-pro/","region_note":"مواصفات إصدار بلاد الشام؛ قد تختلف مواصفات الأسواق الأخرى"}'::jsonb where slug='honor-magic8-pro';
