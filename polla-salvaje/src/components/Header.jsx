import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { FinalsBell } from './FinalsBell'
import { usePollaStore } from '../store/pollaStore'

export function Header() {
  const user = usePollaStore((s) => s.user)
  const logout = usePollaStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-salvaje-light/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => navigate('/predict')} className="flex shrink-0 items-center gap-2">
          <Logo size={36} />
          <div className="hidden leading-none text-left min-[400px]:block">
            <div className="display text-lg tracking-wide text-salvaje-brown">POLLA MUNDIALISTA SALVAJE</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-salvaje-gold">Mundial 2026</div>
          </div>
        </button>

        {user && (
          <div className="flex items-center gap-2">
            <FinalsBell />
            <button
              onClick={() => navigate('/profile')}
              title="Mi perfil"
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-black/5"
            >
              <Avatar src={user.avatar} name={user.fullName} size={34} className="ring-2 ring-salvaje-orange/20" />
              <div className="hidden text-left sm:block">
                <div className="text-sm font-semibold text-salvaje-brown">{user.fullName?.split(' ')[0]}</div>
                <div className="text-[11px] text-salvaje-gray">Mi perfil</div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              title="Salir"
              className="rounded-xl border border-black/10 p-2 text-salvaje-gray hover:bg-black/5 hover:text-salvaje-brown"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
