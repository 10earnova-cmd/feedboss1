import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { SiteProvider } from './context/SiteContext'
import { LegalPage, SearchPage } from './pages/Catalog'
import { Home } from './pages/Home'
import { Watch } from './pages/Watch'
import { AdminAds } from './pages/admin/Ads'
import { BulkUpload } from './pages/admin/BulkUpload'
import { VideoEdit } from './pages/admin/VideoEdit'
import { AdminVideos } from './pages/admin/Videos'

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <SiteProvider>
            <Routes>
                <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<VideoEdit />} />
                  <Route path="bulk" element={<BulkUpload />} />
                  <Route path="videos" element={<AdminVideos />} />
                  <Route path="videos/new" element={<Navigate to="/admin" replace />} />
                  <Route path="videos/:id" element={<VideoEdit />} />
                  <Route path="ads" element={<AdminAds />} />
                  <Route path="categories" element={<Navigate to="/admin" replace />} />
                  <Route path="tags" element={<Navigate to="/admin" replace />} />
                  <Route path="models" element={<Navigate to="/admin" replace />} />
                  <Route path="settings" element={<Navigate to="/admin" replace />} />
                </Route>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/watch/:slug" element={<Watch />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/about" element={<LegalPage kind="about" />} />
                  <Route path="/terms" element={<LegalPage kind="terms" />} />
                  <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                  <Route path="/dmca" element={<LegalPage kind="dmca" />} />
                  <Route path="/2257" element={<LegalPage kind="2257" />} />
                  <Route path="/latest" element={<Navigate to="/" replace />} />
                  <Route path="/trending" element={<Navigate to="/" replace />} />
                  <Route path="/categories" element={<Navigate to="/" replace />} />
                  <Route path="/category/:slug" element={<Navigate to="/" replace />} />
                  <Route path="/tag/:slug" element={<Navigate to="/" replace />} />
                  <Route path="/models" element={<Navigate to="/" replace />} />
                  <Route path="/model/:slug" element={<Navigate to="/" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SiteProvider>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
