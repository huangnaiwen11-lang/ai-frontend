import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { isGoApiError } from '../../api/http'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
    } catch (error) {
      setErrorMessage(isGoApiError(error) ? error.message : '登录暂时不可用，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>登录</h1>
      <form onSubmit={handleSubmit}>
        <label>
          邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={isLoading || isSubmitting}>登录</button>
      </form>
      <p>还没有账号？<Link to={ROUTES.register}>注册</Link></p>
    </main>
  )
}
