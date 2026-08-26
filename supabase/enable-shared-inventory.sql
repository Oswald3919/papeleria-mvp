-- Ejecuta esto después de crear tu usuario en Supabase Authentication > Users.
-- Sustituye el correo por el de la persona que administrará el inventario.
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'admin'::public.app_role
from auth.users
where email = 'TU_CORREO@EJEMPLO.COM'
on conflict (id) do update set role = 'admin';

-- Comprobación: debe devolver el correo y el rol admin.
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'TU_CORREO@EJEMPLO.COM';
