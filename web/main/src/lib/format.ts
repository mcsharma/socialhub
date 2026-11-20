// Date formatting shared by server and client. Server and browser may be in
// different time zones, so elements rendering these need
// suppressHydrationWarning.

const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso))
