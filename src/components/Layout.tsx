import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="page flex-1 pb-8 pt-3">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
