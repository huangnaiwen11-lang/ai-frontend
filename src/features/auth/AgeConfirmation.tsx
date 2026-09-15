/** 使用原生复选框保留键盘与辅助技术语义，确认必须由用户主动完成。 */
export function AgeConfirmation({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="auth-page__age">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} required />
      <span>我确认已年满 18 周岁</span>
    </label>
  )
}
