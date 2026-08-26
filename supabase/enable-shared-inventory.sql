-- Ejecuta esto después de crear tu usuario en Supabase Authentication > Users.
-- Sustituye el correo por el de la persona que administrará el inventario.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'TU_CORREO@EJEMPLO.COM');

-- Comprobación: debe devolver el correo y el rol admin.
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'TU_CORREO@EJEMPLO.COM';
