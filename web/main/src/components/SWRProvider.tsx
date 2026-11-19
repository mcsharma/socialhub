'use client'

import { SWRConfig } from 'swr'

/** JSON fetcher shared by every useSWR call; non-2xx responses throw. */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json() as Promise<T>
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher: jsonFetcher }}>{children}</SWRConfig>
}
