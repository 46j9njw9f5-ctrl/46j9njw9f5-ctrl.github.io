// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import App from '../App'
// 実データは実行時に読み込むため、サンプルIDは静的importから取得する。
import companiesJson from '../data/companies.generated.json'

const real = companiesJson as unknown as { id: string; name: string }[]
const firstId = real[0].id
const firstName = real[0].name

let capturedNav: NavigateFunction | null = null
function CaptureNav() {
  capturedNav = useNavigate()
  return null
}
function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CaptureNav />
      <App />
    </MemoryRouter>,
  )
}

describe('企業詳細のURL・ルーティング', () => {
  it('企業URLを直接開くと該当企業の詳細が表示される', async () => {
    renderApp(`/company/${firstId}`)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 8000 })
    expect(dialog).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: firstName }, { timeout: 8000 })).toBeInTheDocument()
  }, 20000)

  it('存在しない企業IDでは一覧へ戻れる404表示になる', async () => {
    renderApp('/company/__does-not-exist__')
    expect(await screen.findByText(/企業が見つかりません/, {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /企業一覧へ戻る/ })).toBeInTheDocument()
  }, 20000)

  it('ブラウザ戻る操作で企業詳細が閉じる', async () => {
    renderApp('/')
    const openBtns = await screen.findAllByRole('button', { name: /の詳細を見る$/ }, { timeout: 8000 })
    fireEvent.click(openBtns[0])
    expect(await screen.findByRole('dialog', {}, { timeout: 8000 })).toBeInTheDocument()
    // 戻る（履歴を1つ戻す）
    act(() => {
      capturedNav?.(-1)
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }, 20000)

  it('Esc で閉じたあと、開く前のボタンへフォーカスが戻る', async () => {
    renderApp('/')
    const openBtns = await screen.findAllByRole('button', { name: /の詳細を見る$/ }, { timeout: 8000 })
    const btn = openBtns[0] as HTMLButtonElement
    btn.focus() // jsdom では click はフォーカスを移さないため明示
    fireEvent.click(btn)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 8000 })
    expect(dialog).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(btn)
  }, 20000)

  it('methodology ページが表示される', async () => {
    renderApp('/methodology')
    expect(
      await screen.findByRole('heading', { name: 'スコアの算出方法' }, { timeout: 8000 }),
    ).toBeInTheDocument()
  }, 20000)
})
