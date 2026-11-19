import Link from 'next/link'

export default function ProfileNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">This profile isn’t available</h1>
      <p className="mt-2 text-muted-foreground">The link may be broken, or the account may have been removed.</p>
      <Link href="/" className="mt-4 inline-block font-medium text-primary hover:underline">
        Back to feed
      </Link>
    </div>
  )
}
