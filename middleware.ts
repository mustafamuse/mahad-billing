// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'

// export function middleware(request: NextRequest) {
//   // Get the pathname of the request (e.g. /admin/dashboard)
//   const path = request.nextUrl.pathname

//   // Allow siblings management page without authentication
//   if (path === '/admin/students/siblings') {
//     return NextResponse.next()
//   }

//   // If it's the admin access page, allow it
//   if (path === '/admin-access') {
//     return NextResponse.next()
//   }

//   // For now, we'll allow direct access to the dashboard
//   // In a production app, you'd want to check for a session token here
//   if (path === '/admin/dashboard') {
//     return NextResponse.next()
//   }

//   // If it's an admin route but not the access page or dashboard, check for authentication
//   if (path.startsWith('/admin')) {
//     return NextResponse.redirect(new URL('/admin-access', request.url))
//   }

//   return NextResponse.next()
// }

// export const config = {
//   matcher: ['/admin/:path*', '/admin-access'],
// }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow only autopay page
  if (path === '/autopay') {
    return NextResponse.next()
  }

  // Redirect all other routes to autopay
  return NextResponse.redirect(new URL('/autopay', request.url))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
