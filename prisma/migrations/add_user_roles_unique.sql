-- prisma/migrations/add_user_roles_unique.sql
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_active
  ON public.user_roles (id_usuario, role)
  WHERE ativo = true;
