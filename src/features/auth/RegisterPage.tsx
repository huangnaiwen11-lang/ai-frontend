import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { isGoApiError } from '../../api/http'
import { useAuth } from './AuthProvider'
import { AuthPageLayout } from './AuthPageLayout'
import { AgeConfirmation } from './AgeConfirmation'
import { useAgeConfirmation } from './useAgeConfirmation'

function currentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
}

/** 保留 Go 注册字段与会话恢复流程，年龄声明仅作为本地提交前置条件。 */
export function RegisterPage() {
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()
  const { ageConfirmed, confirmAge } = useAgeConfirmation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    // 请求属于 AuthProvider，页面离开只停止本地 UI 更新，不打断 Go 会话恢复。
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || isLoading || !ageConfirmed) return
    // 同一批提交事件不能重复创建账号，请求结束后才释放同步锁。
    submittingRef.current = true
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await register({ email, password, displayName: displayName || undefined, timezone: currentTimezone() })
      if (mountedRef.current) navigate(ROUTES.home, { replace: true })
    } catch (error) {
      if (mountedRef.current) setErrorMessage(isGoApiError(error) ? error.message : '注册暂时不可用，请稍后重试')
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setIsSubmitting(false)
    }
  }

  return (
    <AuthPageLayout title="注册">
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <label>
          显示名称
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" />
        </label>
        <label>
          邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required />
        </label>
        <AgeConfirmation checked={ageConfirmed} onChange={confirmAge} />
        {errorMessage ? <p className="auth-page__error" role="alert">{errorMessage}</p> : null}
        <button className="auth-page__submit" type="submit" disabled={isLoading || isSubmitting || !ageConfirmed} aria-busy={isSubmitting}>注册</button>
      </form>
      <p className="auth-page__switch">已有账号？<Link to={ROUTES.login}>登录</Link></p>
    </AuthPageLayout>
  )
}
