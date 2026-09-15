import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { isGoApiError } from '../../api/http'
import { useAuth } from './AuthProvider'

function currentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
}

export function RegisterPage() {
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await register({ email, password, displayName: displayName || undefined, timezone: currentTimezone() })
      navigate(ROUTES.home, { replace: true })
    } catch (error) {
      setErrorMessage(isGoApiError(error) ? error.message : '注册暂时不可用，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
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
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={isLoading || isSubmitting}>注册</button>
      </form>
      <p>已有账号？<Link to={ROUTES.login}>登录</Link></p>
    </main>
  )
}
