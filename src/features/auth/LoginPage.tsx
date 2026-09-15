import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { isGoApiError } from '../../api/http'
import { useAuth } from './AuthProvider'
import { AuthPageLayout } from './AuthPageLayout'
import { AgeConfirmation } from './AgeConfirmation'
import { useAgeConfirmation } from './useAgeConfirmation'

/** 仅在 Go 登录和 /me 投影均完成后离开表单，恢复失败时保留错误与输入。 */
export function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const { ageConfirmed, confirmAge } = useAgeConfirmation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    // StrictMode 会重建 effect；每次 setup 都恢复标记，离开页面立即禁止迟到的 UI 更新。
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || isLoading || !ageConfirmed) return
    // React 状态刷新前也必须挡住第二个提交事件，避免创建重复会话。
    submittingRef.current = true
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      if (mountedRef.current) navigate(ROUTES.home, { replace: true })
    } catch (error) {
      if (mountedRef.current) setErrorMessage(isGoApiError(error) ? error.message : '登录暂时不可用，请稍后重试')
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setIsSubmitting(false)
    }
  }

  return (
    <AuthPageLayout title="登录">
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <label>
          邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <AgeConfirmation checked={ageConfirmed} onChange={confirmAge} />
        {errorMessage ? <p className="auth-page__error" role="alert">{errorMessage}</p> : null}
        <button className="auth-page__submit" type="submit" disabled={isLoading || isSubmitting || !ageConfirmed} aria-busy={isSubmitting}>登录</button>
      </form>
      <p className="auth-page__switch">还没有账号？<Link to={ROUTES.register}>注册</Link></p>
    </AuthPageLayout>
  )
}
