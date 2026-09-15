import { useState } from 'react'

const AGE_CONFIRMATION_KEY = 'ai-frontend-service.age-confirmed'

/** 年龄声明与身份令牌隔离；浏览器禁止存储时仍允许用户完成本次明确确认。 */
export function useAgeConfirmation() {
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    try {
      return window.localStorage.getItem(AGE_CONFIRMATION_KEY) === 'true'
    } catch {
      return false
    }
  })

  function confirmAge(confirmed: boolean) {
    setAgeConfirmed(confirmed)
    try {
      if (confirmed) window.localStorage.setItem(AGE_CONFIRMATION_KEY, 'true')
      else window.localStorage.removeItem(AGE_CONFIRMATION_KEY)
    } catch {
      // 持久化仅用于下次访问，失败不撤销用户在当前页面的选择。
    }
  }

  return { ageConfirmed, confirmAge }
}
