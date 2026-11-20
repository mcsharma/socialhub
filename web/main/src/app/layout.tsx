import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, JetBrains_Mono } from 'next/font/google'
import {
  NavBarFrame,
  NavBarViewer,
  NavBarViewerSkeleton,
} from '@/components/NavBar'
import { SWRProvider } from '@/components/SWRProvider'
import './globals.css'

// next/font self-hosts the font files at build time (no runtime request to
// Google) and exposes them as CSS variables consumed in globals.css.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: { default: 'socialhub', template: '%s · socialhub' },
  description: 'Connect with friends.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <SWRProvider>
          <NavBarFrame>
            {/* Session-dependent → dynamic → must sit behind Suspense under
                cacheComponents. The rest of the nav is in the static shell. */}
            <Suspense fallback={<NavBarViewerSkeleton />}>
              <NavBarViewer />
            </Suspense>
          </NavBarFrame>
          <main className="mx-auto max-w-[680px] px-4 py-6">{children}</main>
        </SWRProvider>
      </body>
    </html>
  )
}
