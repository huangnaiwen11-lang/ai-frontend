import { Link, NavLink, Outlet } from 'react-router-dom'
import { Bell, Image, Images, LogIn, LogOut, MessageSquare, UserRound, Video, Wallet, WandSparkles } from 'lucide-react'
import { ROUTES } from '../../app/routes'
import { useAuth } from '../auth/AuthProvider'
import './app-shell.css'

// 主导航沿用旧站的创作与个人中心布局；旧换脸入口收敛到模板编辑，不增加生成原子。
const primaryLinks = [
  { to: ROUTES.studioVideo, label: '视频创作', icon: Video },
  { to: ROUTES.studioImage, label: '图片创作', icon: Image },
  { to: ROUTES.studioEdit, label: '模板编辑', icon: WandSparkles },
  { to: ROUTES.account, label: '用户中心', icon: UserRound },
]
const secondaryLinks = [
  { to: ROUTES.works, label: '我的作品', icon: Images },
  { to: ROUTES.wallet, label: '钱包', icon: Wallet },
  { to: ROUTES.notifications, label: '通知', icon: Bell },
  { to: ROUTES.feedback, label: '反馈与支持', icon: MessageSquare },
]

/**
 * 用户端的稳定应用外壳。
 *
 * 壳层只读取认证会话，负责把用户带到功能页面；它不读取余额、VIP 或模板权限，
 * 更不能在这里做生成门禁。生成门禁必须由各创作页面提交给 Go 服务后在服务端原子
 * 执行，避免前端预读状态产生并发双免、过期余额等错误判断。
 */
export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="app-shell__brand" to={ROUTES.home} aria-label="Cling AI">
          <span>Cling</span><span className="app-shell__brand-accent">AI</span>
        </Link>
        <nav aria-label="主导航" className="app-shell__navigation">
          <div className="app-shell__primary">
            {primaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} title={label}><Icon size={22} aria-hidden="true" /><span>{label}</span></NavLink>
            ))}
          </div>
          <div className="app-shell__secondary">
            {secondaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} title={label}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>
            ))}
          </div>
        </nav>
        <div className="app-shell__session">
          {user ? (
            <button type="button" onClick={logout}><LogOut size={18} aria-hidden="true" /><span>退出登录</span></button>
          ) : (
            <Link to={ROUTES.login}><LogIn size={18} aria-hidden="true" /><span>登录</span></Link>
          )}
        </div>
      </header>
      {/* 子页面各自声明唯一 main；壳层只提供无语义的布局容器。 */}
      <div className="app-shell__content">
        <Outlet />
      </div>
    </div>
  )
}
