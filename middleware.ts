import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Protected routes that require authentication/authorization
  const protectedRoutes = [
    '/autopay',
    '/admin-access',
    '/dashboard',
    '/admin/dashboard',
  ]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )

  // If it's not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Handle admin routes
  if (path.startsWith('/admin')) {
    // Redirect to admin access page if trying to access admin routes
    return NextResponse.redirect(new URL('/admin-access', request.url))
  }

  // Handle autopay route - redirect to homepage or login
  if (path.startsWith('/autopay')) {
    // You can change this to redirect to a login page if you have one
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Update matcher to include all routes except api, static files, etc.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'

// export function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname

//   // Allow only autopay page
//   if (path === '/autopay') {
//     return NextResponse.next()
//   }

//   // Redirect all other routes to autopay
//   return NextResponse.redirect(new URL('/autopay', request.url))
// }

// export const config = {
//   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
// }
