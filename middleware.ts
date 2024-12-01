import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /admin/dashboard)
  const path = request.nextUrl.pathname

  // If it's the admin access page, allow it
  if (path === '/admin-access') {
    return NextResponse.next()
  }

  // For now, we'll allow direct access to the dashboard
  // In a production app, you'd want to check for a session token here
  if (path === '/admin/dashboard') {
    return NextResponse.next()
  }

  // If it's an admin route but not the access page or dashboard, check for authentication
  if (path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin-access', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin-access'],
}
