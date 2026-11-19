import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getProfile } from '@/lib/dal/users'
import { getRecentPostsByAuthor } from '@/lib/dal/posts'
import { PostCard, PostCardSkeleton } from '@/components/PostCard'
import { UserAvatar } from '@/components/UserAvatar'

/**
 * Profile — /u/[username]. Contrast with the home feed:
 *  - Header (name, joined date, post count) comes from getProfile(), which is
 *    'use cache'd per username and invalidated by tag when that user posts.
 *  - Recent posts are NOT cached: fetched per request, streamed in their own
 *    <Suspense> after the header.
 *  - Pure Server Components — no client JS for this page beyond the layout.
 */

export async function generateMetadata({ params }: PageProps<'/u/[username]'>): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)
  return { title: profile ? `${profile.name} (@${profile.username})` : 'Profile not found' }
}

export default function ProfilePage({ params }: PageProps<'/u/[username]'>) {
  // `params` is a Promise. Awaiting it is runtime data (any username can be
  // requested), so it happens inside the Suspense boundary, not up here.
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} />
    </Suspense>
  )
}

const joinedFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

async function Profile({ params }: { params: PageProps<'/u/[username]'>['params'] }) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-xs">
        <UserAvatar user={profile} size="lg" className="size-20 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Joined {joinedFormat.format(new Date(profile.joinedAt))} · {profile.postCount} posts
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recent posts</h2>
        <Suspense fallback={<PostCardSkeleton />}>
          <RecentPosts authorId={profile.id} />
        </Suspense>
      </section>
    </div>
  )
}

async function RecentPosts({ authorId }: { authorId: string }) {
  const posts = await getRecentPostsByAuthor(authorId)
  if (posts.length === 0) return <p className="text-muted-foreground">No posts yet.</p>
  return posts.map((post) => <PostCard key={post.id} post={post} />)
}

function ProfileSkeleton() {
  return <div className="h-36 animate-pulse rounded-lg bg-muted" />
}
