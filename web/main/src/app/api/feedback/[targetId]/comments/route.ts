import { NextResponse } from 'next/server'
import { parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getComments } from '@/lib/dal/feedback'
import type { CommentDTO } from '@/lib/dal/dto'

/**
 * GET /api/feedback/[targetId]/comments — comments left on any feedback
 * target (a post's comments, or a comment's replies), oldest first. Loaded
 * when someone opens them; 404 unless the viewer is in the target's circle.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/feedback/[targetId]/comments'>,
) {
  if (!(await getViewer())) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  const targetId = parseSnowflake((await ctx.params).targetId)
  if (targetId === null) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }
  const comments = await getComments(targetId)
  if (!comments) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json<CommentDTO[]>(comments)
}
