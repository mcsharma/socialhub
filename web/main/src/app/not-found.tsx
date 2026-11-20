import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-6 shadow-xs">
      <h1 className="text-xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        This page doesn’t exist, or you don’t have access to it.
      </p>
      <Link href="/" className="font-medium text-primary hover:underline">
        Go home
      </Link>
    </section>
  )
}
