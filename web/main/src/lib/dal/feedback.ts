import 'server-only'
import {
  findFeedbackTarget,
  findTargetType,
  getTargetCounts,
  listComments,
  summarizeReactions,
  type CommentRow,
  type FeedbackTargetWithOwner,
  type ReactionSummary,
} from '@socialhub/db'
import { isViewerInCircle } from './circles'
import { getViewer } from './session'
import type { CommentDTO, ReactionStateDTO } from './dto'

// Reactions and comments on any feedback target (posts, comments, …). The
// permission rule is the same for every type: you can see a target, and so
// react to or comment on it, iff you're in its circle.

const COMMENTS_LIMIT = 200

/** The target, or null if it doesn't exist or the viewer can't see it. */
export async function getAccessibleTarget(
  targetId: bigint,
): Promise<FeedbackTargetWithOwner | null> {
  const target = await findFeedbackTarget(targetId)
  if (!target || !(await isViewerInCircle(target.circleId))) return null
  return target
}

/**
 * Whether a new comment may be left on this target. Two levels: comments on
 * posts, and replies to those comments — not replies to replies.
 */
export async function canCommentOn(
  target: FeedbackTargetWithOwner,
): Promise<boolean> {
  switch (target.owner.type) {
    case 'POST':
      return true
    case 'COMMENT':
      return (
        (await findTargetType(target.owner.comment.parentTargetId)) === 'POST'
      )
  }
}

/** Comments left on a target, oldest first, or null if not accessible. */
export async function getComments(
  parentTargetId: bigint,
): Promise<CommentDTO[] | null> {
  const viewer = await getViewer()
  const parent = viewer ? await getAccessibleTarget(parentTargetId) : null
  if (!viewer || !parent) return null

  const comments = await listComments({ parentTargetId, limit: COMMENTS_LIMIT })
  const reactions = await summarizeReactions({
    targetIds: comments.map((c) => c.targetId),
    viewerId: viewer.id,
  })
  // Every comment here shares the same parent, so one answer for all: they
  // can be replied to only if they're comments on a post.
  const canReply = parent.targetType === 'POST'
  return comments.map((c) =>
    toCommentDTO(c, reactions.get(c.targetId)!, canReply),
  )
}

/** Fresh reaction state for one target, e.g. after the viewer reacted. */
export async function getReactionState(
  targetId: bigint,
  viewerId: string,
): Promise<ReactionStateDTO> {
  const [counts, summaries] = await Promise.all([
    getTargetCounts(targetId),
    summarizeReactions({ targetIds: [targetId], viewerId }),
  ])
  const summary = summaries.get(targetId)!
  return {
    reactionCount: counts?.reactionCount ?? 0,
    topReactions: summary.topTypes,
    viewerReaction: summary.viewerType,
  }
}

export function toCommentDTO(
  comment: CommentRow,
  reactions: ReactionSummary,
  canReply: boolean,
): CommentDTO {
  return {
    id: comment.id.toString(),
    targetId: comment.targetId.toString(),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    reactionCount: comment.target.reactionCount,
    topReactions: reactions.topTypes,
    viewerReaction: reactions.viewerType,
    replyCount: comment.target.commentCount,
    canReply,
  }
}
