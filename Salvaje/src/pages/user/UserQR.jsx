import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { RefreshCw, Scan, Shield } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { getUserQRToken } from '../../services/qr.service'

export function UserQR() {
  const { user, profile } = useAuth()
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchToken = async (isRefresh = false) => {
    if (!user?.uid) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const t = await getUserQRToken(user.uid, 'permanent')
      setToken(t)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchToken()
  }, [user?.uid])

  const membershipLabels = {
    monthly: 'Plan Mensual',
    ticketera: `Ticketera (${profile?.ticketeraBalance || 0} clases)`,
    free_trial: 'Clase de Cortesia',
    none: 'Sin membresia',
  }

  return (
    <AppShell title="Mi QR">
      <div className="max-w-sm mx-auto px-4 pt-6 pb-6 space-y-5">
        <div className="text-center">
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Mi Codigo QR</h1>
          <p className="font-body text-salvaje-gray text-sm mt-1">
            Muestra este QR a tu coach para registrar asistencia
          </p>
        </div>

        <Card>
          <CardBody className="flex flex-col items-center py-8 gap-6">
            {loading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : token ? (
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(212,82,26,0.3)',
                    '0 0 0 12px rgba(212,82,26,0)',
                    '0 0 0 0 rgba(212,82,26,0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-4 bg-white rounded-2xl border-2 border-salvaje-orange/40"
              >
                <QRCodeSVG
                  value={token.id}
                  size={220}
                  fgColor="#1A0F0A"
                  bgColor="transparent"
                  level="M"
                />
              </motion.div>
            ) : (
              <div className="w-64 h-64 bg-salvaje-cream rounded-2xl flex items-center justify-center">
                <p className="font-body text-salvaje-gray text-sm text-center px-4">
                  No se pudo cargar el QR
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="font-display text-2xl uppercase text-salvaje-dark">
                {profile?.displayName || user?.email}
              </p>
              <Badge variant="orange" className="mt-2">
                <Shield size={10} />
                {membershipLabels[profile?.membershipType] || 'Sin membresia'}
              </Badge>
            </div>

            {token && (
              <div className="flex items-center gap-2 text-center">
                <Scan size={14} className="text-salvaje-gray" />
                <p className="text-xs font-mono text-salvaje-gray/60 break-all">
                  {token?.id?.slice(0, 16)}...
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => fetchToken(true)}
          loading={refreshing}
        >
          <RefreshCw size={16} />
          Actualizar QR
        </Button>
      </div>
    </AppShell>
  )
}
