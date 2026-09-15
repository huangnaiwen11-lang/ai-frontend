import { useEffect, useMemo, useState } from 'react'
import { CheckoutPanel } from './CheckoutPanel'
import { WalletApi, type WalletLedgerEntry, type WalletSummary } from '../../api/wallet'
import { isGoApiError } from '../../api/http'
import { useGoApiClient } from '../../app/GoApiProvider'

const LEDGER_PAGE_SIZE = 20

export function PaymentPage() {
  const client = useGoApiClient()
  const walletApi = useMemo(() => new WalletApi(client), [client])
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [entries, setEntries] = useState<WalletLedgerEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadWallet() {
      setIsLoadingWallet(true)
      setWalletError(null)
      try {
        const [loadedSummary, ledgerPage] = await Promise.all([
          walletApi.getSummary(),
          walletApi.listLedger({ limit: LEDGER_PAGE_SIZE }),
        ])
        if (!active) return
        setSummary(loadedSummary)
        setEntries(ledgerPage.entries)
        setNextCursor(ledgerPage.nextCursor)
      } catch (error) {
        if (active) setWalletError(readErrorMessage(error, '读取钱包信息失败'))
      } finally {
        if (active) setIsLoadingWallet(false)
      }
    }

    void loadWallet()
    return () => { active = false }
  }, [walletApi])

  /** 续页仅回传 Go 给出的不透明游标，不能叠加旧式 skip 分页。 */
  async function loadMoreLedger() {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    setWalletError(null)
    try {
      const ledgerPage = await walletApi.listLedger({ limit: LEDGER_PAGE_SIZE, cursor: nextCursor })
      setEntries((currentEntries) => [...currentEntries, ...ledgerPage.entries])
      setNextCursor(ledgerPage.nextCursor)
    } catch (error) {
      setWalletError(readErrorMessage(error, '读取更多账本失败'))
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <main className="payment-page">
      <h1>我的钱包</h1>
      {isLoadingWallet ? <p role="status">正在读取钱包信息…</p> : null}
      {walletError ? <p role="alert">{walletError}</p> : null}
      {summary ? <WalletSummaryView summary={summary} /> : null}
      <CheckoutPanel />
      {!isLoadingWallet && !walletError && entries.length === 0 ? <p>暂无账本记录</p> : null}
      {entries.length > 0 ? <WalletLedgerView entries={entries} /> : null}
      {nextCursor ? (
        <button type="button" disabled={isLoadingMore} onClick={() => void loadMoreLedger()}>
          {isLoadingMore ? '正在加载…' : '加载更多账本'}
        </button>
      ) : null}

    </main>
  )
}

function WalletSummaryView({ summary }: { summary: WalletSummary }) {
  return (
    <section aria-label="钱包概览">
      <p>{summary.balance} 钻石</p>
      <p>{summary.vip.active ? 'VIP 有效' : '当前不是 VIP'}</p>
      {summary.vip.expiresAt ? <p>VIP 到期：{summary.vip.expiresAt}</p> : null}
      <p>时区：{summary.timezone}</p>
      <p>本地日期：{summary.localDate}</p>
      <p>图片日额度：{summary.dailyImage.remaining} / {summary.dailyImage.limit}</p>
      <p>视频日额度：{summary.dailyVideo.remaining} / {summary.dailyVideo.limit}</p>
    </section>
  )
}

function WalletLedgerView({ entries }: { entries: WalletLedgerEntry[] }) {
  return (
    <section aria-label="钱包账本">
      <h2>账本</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <span>{entry.deltaDiamonds}</span> <span>{entry.reason}</span> <time dateTime={entry.createdAt}>{entry.createdAt}</time>
          </li>
        ))}
      </ul>
    </section>
  )
}

function readErrorMessage(error: unknown, fallback: string): string {
  return isGoApiError(error) ? error.message : fallback
}
