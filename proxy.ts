import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}

export default function proxy(req: NextRequest) {
  if (!process.env.BASIC_AUTH_USER || !process.env.BASIC_AUTH_PWD) {
    return NextResponse.next()
  }

  const basicAuth = req.headers.get('authorization')
  const url = req.nextUrl

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    if (
      user === process.env.BASIC_AUTH_USER &&
      pwd === process.env.BASIC_AUTH_PWD
    ) {
      return NextResponse.next()
    }
  }

  url.pathname = '/api/auth'
  return NextResponse.rewrite(url)
}
