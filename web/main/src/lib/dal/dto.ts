// DTOs — the only shapes that leave the server (to Client Components, JSON
// API responses, SWR caches). Database rows never cross that boundary
// directly: BigInt IDs become decimal strings, Dates become ISO strings, and
// only the fields the UI needs are exposed.

export type UserSummaryDTO = {
  id: string
  name: string
  username: string
  image: string | null
}
