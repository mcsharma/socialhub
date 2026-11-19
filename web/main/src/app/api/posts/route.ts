import { NextResponse, type NextRequest } from 'next/server'
import { parseSnowflake } from '@socialhub/db'
import { getFeedPage } from '@/lib/dal/posts'
import type { PostPageDTO } from '@/lib/dal/dto'

/**
 * GET /api/posts?cursor=<post id> — JSON for client-side fetching (SWR).
 * Same DAL function as the server-rendered first page, so SSR and CSR
 * return identical shapes.
 */
export async function GET(request: NextRequest) {
  const rawCursor = request.nextUrl.searchParams.get('cursor')
  const cursor = parseSnowflake(rawCursor)
  if (rawCursor && cursor === null) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
  }
  return NextResponse.json<PostPageDTO>(await getFeedPage(cursor))
}
