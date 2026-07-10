import { Suspense, lazy, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import { isDataLoaded, loadData } from './data'

// 固定ページ・企業詳細は遅延読み込み（初期バンドルから分離）。
const CompanyDetailRoute = lazy(() => import('./pages/CompanyDetailRoute'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function AppLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__logo" aria-hidden="true">-0</div>
      <div className="app-loading__text">企業データを読み込み中…</div>
    </div>
  )
}

export default function App() {
  // 大きな実データ（企業・全国集計）は実行時に読み込む。読み込むまでは軽い読込画面。
  const [ready, setReady] = useState(isDataLoaded)
  useEffect(() => {
    let alive = true
    loadData().then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!ready) return <AppLoading />

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />}>
          <Route index element={null} />
          <Route path="company/:id" element={<CompanyDetailRoute />} />
        </Route>
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
