import { NextResponse, type NextRequest } from 'next/server'
import { parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getCircleFeedPage } from '@/lib/dal/posts'
import type { PostPageDTO } from '@/lib/dal/dto'

/**
 * GET /api/circles/[circleId]/posts?cursor=<post id> — a circle's feed as
 * JSON, for client-side fetching (SWR). Same DAL function as the
 * server-rendered first page, so SSR and CSR return identical shapes.
 *
 * Non-members get 404, not 403: circles are secret, so the response must not
 * reveal whether a circle exists.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/circles/[circleId]/posts'>,
) {
  if (!(await getViewer())) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  const circleId = parseSnowflake((await ctx.params).circleId)
  const rawCursor = request.nextUrl.searchParams.get('cursor')
  const cursor = parseSnowflake(rawCursor)
  if (circleId === null || (rawCursor && cursor === null)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }
  const page = await getCircleFeedPage(circleId, cursor)
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json<PostPageDTO>(page)
}
