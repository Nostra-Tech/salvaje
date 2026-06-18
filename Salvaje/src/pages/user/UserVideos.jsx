import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Play, Pause, Dumbbell, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/layout/BottomNav'
import { NotificationPanel } from '../../components/notifications/NotificationPanel'
import { AchievementUnlockedModal } from '../../components/user/AchievementUnlockedModal'
import { BattleSurveyModal } from '../../components/user/BattleSurveyModal'
import { BirthdayModal } from '../../components/user/BirthdayModal'
import { useBirthday } from '../../hooks/useBirthday'
import { useActivityTracker } from '../../hooks/useActivityTracker'
import { useAuth } from '../../hooks/useAuth'
import { getVideos } from '../../services/videos.service'
import { Spinner } from '../../components/ui/Spinner'

const CATEGORIES = [
  { value: 'all', label: 'Todo' },
  { value: 'recomendacion', label: 'Tips' },
  { value: 'ejercicio_casa', label: 'En Casa' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'nutricion', label: 'Nutrición' },
]

export function UserVideos() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { showBirthdayModal, closeBirthdayModal } = useBirthday()
  useActivityTracker()

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    const cat = category === 'all' ? null : category
    getVideos(cat)
      .then((v) => { setVideos(v); setCurrentIndex(0) })
      .finally(() => setLoading(false))
  }, [category])

  return (
    <>
      {/* Full-screen video feed — sits behind BottomNav (z-40) */}
      <div className="fixed inset-0 bg-black" style={{ zIndex: 1 }}>

        {/* ─── Video snap feed ─── */}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" className="text-white" />
          </div>
        ) : videos.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-4">
            <Dumbbell size={56} className="text-white/20" />
            <div>
              <p className="font-display text-3xl uppercase text-white">Sin videos aún</p>
              <p className="font-body text-sm text-white/40 mt-1">
                El coach o admin subirá contenido pronto
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none">
            {videos.map((video, i) => (
              <VideoCard
                key={video.id}
                video={video}
                isActive={i === currentIndex}
                isAdjacent={Math.abs(i - currentIndex) <= 1}
                onVisible={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        )}

        {/* ─── Top overlay: category pills + back chevron ─── */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div className="bg-gradient-to-b from-black/70 via-black/30 to-transparent px-4 pb-10"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <div className="flex items-center gap-3 mb-3 pointer-events-auto">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeft size={18} className="text-white" />
              </button>
              <p className="font-display text-base uppercase text-white tracking-wider">Videos</p>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-body font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    category === c.value
                      ? 'bg-salvaje-orange text-white'
                      : 'bg-white/20 text-white backdrop-blur-sm border border-white/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Counter badge */}
        {videos.length > 0 && (
          <div
            className="absolute right-4 pointer-events-none"
            style={{ zIndex: 10, top: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <div className="mt-2 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <p className="font-mono text-[10px] text-white/70">
                {currentIndex + 1} / {videos.length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BottomNav is fixed z-40 — renders on top of the video feed */}
      <BottomNav />

      {/* Persistent modals / panels */}
      <NotificationPanel />
      <AchievementUnlockedModal />
      <BattleSurveyModal />
      <BirthdayModal open={showBirthdayModal} onClose={closeBirthdayModal} name={profile?.displayName} />
    </>
  )
}

function VideoCard({ video, isActive, isAdjacent, onVisible }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const iconTimerRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [showIcon, setShowIcon] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // IntersectionObserver: auto-play when ≥55% visible, pause otherwise
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible()
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {})
        } else {
          videoRef.current?.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.55 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible])

  // Belt-and-suspenders: pause when not active
  useEffect(() => {
    if (!isActive && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
      setPlaying(false)
    }
  }, [isActive])

  const flashIcon = useCallback(() => {
    clearTimeout(iconTimerRef.current)
    setShowIcon(true)
    iconTimerRef.current = setTimeout(() => setShowIcon(false), 1000)
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
    flashIcon()
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    const next = !muted
    videoRef.current.muted = next
    setMuted(next)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full snap-start flex-shrink-0 overflow-hidden"
      style={{ height: '100dvh' }}
      onClick={togglePlay}
    >
      {/* Video element */}
      {video.videoURL ? (
        <video
          ref={videoRef}
          src={video.videoURL}
          className="absolute inset-0 w-full h-full object-cover"
          muted={muted}
          playsInline
          loop
          preload={isActive ? 'auto' : isAdjacent ? 'metadata' : 'none'}
          onCanPlay={() => setLoaded(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-salvaje-brown">
          <Dumbbell size={48} className="text-white/30" />
        </div>
      )}

      {/* Loading shimmer */}
      {!loaded && isActive && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />

      {/* Play / pause flash */}
      <AnimatePresence>
        {showIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              {playing
                ? <Play size={34} className="text-white ml-1" />
                : <Pause size={34} className="text-white" />
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom info — sits above BottomNav (h-16) with extra breathing room */}
      <div
        className="absolute left-0 right-0 px-4 pointer-events-none"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)', zIndex: 5 }}
      >
        <div className="flex items-end gap-3">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-2xl uppercase text-white leading-tight drop-shadow-lg">
              {video.title}
            </p>
            {video.description && (
              <p className="font-body text-sm text-white/80 mt-1 line-clamp-2 drop-shadow">
                {video.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-5 h-5 rounded-full bg-salvaje-orange flex items-center justify-center flex-shrink-0">
                <span className="font-display text-[8px] text-white uppercase">S</span>
              </div>
              <p className="font-mono text-[10px] text-white/60 uppercase tracking-widest">
                {video.authorName}
              </p>
              <span className="text-white/30 text-[10px]">·</span>
              <p className="font-mono text-[10px] text-salvaje-orange/80 uppercase tracking-widest">
                {CATEGORIES.find((c) => c.value === video.category)?.label || video.category}
              </p>
            </div>
          </div>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="pointer-events-auto w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          >
            {muted
              ? <VolumeX size={20} className="text-white" />
              : <Volume2 size={20} className="text-white" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
