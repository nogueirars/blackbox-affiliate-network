import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const DB_ROLE_MAP: Record<string, string> = {
  ADMIN: 'ADMIN',
  AFILIADO: 'AFILIADO',
  INTERMEDIARIO: 'INTERMEDIARIO',
  GERENTE: 'GERENTE',
}

async function getRolesFromDB(userId: string): Promise<string[]> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: publicUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single()

    if (!publicUser) return []

    const { data: userRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('id_usuario', publicUser.id)
      .eq('ativo', true)

    return (userRoles ?? []).map((r: { role: string }) => DB_ROLE_MAP[r.role] ?? r.role.toUpperCase())
  } catch {
    return []
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes (no auth required)
  const publicPaths = ['/login', '/auth', '/forgot-password', '/reset-password', '/api/auth', '/api/ref']
  if (!user && !publicPaths.some((p) => pathname.startsWith(p))) {
    // API routes: return 401 JSON (REST clients don't follow redirects)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based route guards
  if (user) {
    // Read roles from JWT first; fall back to DB when JWT has no roles
    let metaRoles: string[] = Array.isArray(user.app_metadata?.roles)
      ? (user.app_metadata.roles as string[]).map((r: string) => r.toUpperCase())
      : user.app_metadata?.role
        ? [(user.app_metadata.role as string).toUpperCase()]
        : []

    if (metaRoles.length === 0) {
      metaRoles = await getRolesFromDB(user.id)
    }

    const has = (...allowed: string[]) => allowed.some(r => metaRoles.includes(r))

    if (pathname.startsWith('/admin') && !has('ADMIN')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/intermediario') && !has('INTERMEDIARIO', 'ADMIN')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/gerente') && !has('GERENTE', 'INTERMEDIARIO', 'ADMIN')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/afiliado') && !has('AFILIADO', 'ADMIN')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect root to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
