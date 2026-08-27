import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { SiteProvider } from './context/SiteContext'
import {
  CategoriesPage,
  CategoryPage,
  Latest,
  LegalPage,
  ModelPage,
  ModelsPage,
  SearchPage,
  TagPage,
  Trending,
} from './pages/Catalog'
import { Home } from './pages/Home'
import { Watch } from './pages/Watch'
import { AdminAds } from './pages/admin/Ads'
import { AdminCategories } from './pages/admin/Categories'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminModels } from './pages/admin/Models'
import { AdminSettings } from './pages/admin/Settings'
import { AdminTags } from './pages/admin/Tags'
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
                  <Route index element={<AdminDashboard />} />
                  <Route path="videos" element={<AdminVideos />} />
                  <Route path="videos/new" element={<VideoEdit />} />
                  <Route path="videos/:id" element={<VideoEdit />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="tags" element={<AdminTags />} />
                  <Route path="models" element={<AdminModels />} />
                  <Route path="ads" element={<AdminAds />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/watch/:slug" element={<Watch />} />
                  <Route path="/latest" element={<Latest />} />
                  <Route path="/trending" element={<Trending />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/tag/:slug" element={<TagPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/models" element={<ModelsPage />} />
                  <Route path="/model/:slug" element={<ModelPage />} />
                  <Route path="/about" element={<LegalPage kind="about" />} />
                  <Route path="/terms" element={<LegalPage kind="terms" />} />
                  <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                  <Route path="/dmca" element={<LegalPage kind="dmca" />} />
                  <Route path="/2257" element={<LegalPage kind="2257" />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SiteProvider>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
