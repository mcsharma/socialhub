import { NextResponse } from 'next/server'
import { parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getPostComments } from '@/lib/dal/posts'
import type { CommentDTO } from '@/lib/dal/dto'

/**
 * GET /api/posts/[postId]/comments — a post's comments, oldest first.
 * Loaded when someone opens a post's comments; 404 unless the viewer is in
 * the post's circle.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/posts/[postId]/comments'>,
) {
  if (!(await getViewer())) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  const postId = parseSnowflake((await ctx.params).postId)
  if (postId === null) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }
  const comments = await getPostComments(postId)
  if (!comments) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json<CommentDTO[]>(comments)
}
