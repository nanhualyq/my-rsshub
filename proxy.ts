import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export function proxy(req: NextRequest) {
  const token = process.env.AUTH_TOKEN

  if (!token) {
    return NextResponse.next()
  }

  if (req.nextUrl.searchParams.get('token') === token) {
    return NextResponse.next()
  }

  return new NextResponse('Auth Required. Provide ?token=... in the URL.', {
    status: 401,
  })
}
