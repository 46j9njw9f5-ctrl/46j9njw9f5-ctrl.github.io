import { Suspense, lazy, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isDataLoaded, loadData } from './data'

// 固定ページ・企業詳細はルート単位で遅延読み込み（コード分割）。
const CompanyDetailRoute = lazy(() => import('./pages/CompanyDetailRoute'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const RegionIndexPage = lazy(() => import('./pages/RegionIndexPage'))
const RegionPage = lazy(() => import('./pages/RegionPage'))

function AppLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__logo" aria-hidden="true">-0</div>
      <div className="app-loading__text">企業データを読み込み中…</div>
    </div>
  )
}

function AppError() {
  return (
    <div className="app-error" role="alert">
      <p>企業データの読み込みに失敗しました。通信環境をご確認のうえ、再読み込みしてください。</p>
      <button className="btn btn--primary" onClick={() => window.location.reload()}>
        再読み込み
      </button>
    </div>
  )
}

export default function App() {
  // 大きな実データ（企業・全国集計）は実行時に読み込む。読み込むまでは軽い読込画面。
  const [ready, setReady] = useState(isDataLoaded)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    loadData()
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  if (failed) return <AppError />
  if (!ready) return <AppLoading />

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />}>
            <Route index element={null} />
            <Route path="company/:id" element={<CompanyDetailRoute />} />
          </Route>
          <Route path="/area" element={<RegionIndexPage />} />
          <Route path="/area/:pref" element={<RegionPage />} />
          <Route path="/area/:pref/:theme" element={<RegionPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
