import { useEffect, useRef } from 'react'

/**
 * Fondo de ondas animadas (canvas) en paleta Salvaje.
 * Se ajusta al tamaño de su contenedor (no a la ventana).
 */
export function WaveCanvas({ className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let time = 0

    const waves = Array.from({ length: 8 }).map(() => ({
      value: Math.random() * 0.5 + 0.1,
      target: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.02 + 0.01,
    }))

    // Resolución reducida del lienzo: ahorra memoria/CPU en paneles altos
    // (el glow disimula el menor detalle). El CSS lo estira al 100%.
    const SCALE = 0.6
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(r.width * SCALE))
      canvas.height = Math.max(1, Math.floor(r.height * SCALE))
    }

    const update = () => {
      waves.forEach((d) => {
        if (Math.random() < 0.01) d.target = Math.random() * 0.7 + 0.1
        d.value += (d.target - d.value) * d.speed
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      waves.forEach((d, i) => {
        const freq = d.value * 7
        ctx.beginPath()
        for (let x = 0; x < canvas.width; x++) {
          const nx = (x / canvas.width) * 2 - 1
          const px = nx + i * 0.04 + freq * 0.03
          const py = Math.sin(px * 10 + time) * Math.cos(px * 2) * freq * 0.1 * ((i + 1) / 8)
          const y = ((py + 1) * canvas.height) / 2
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const intensity = Math.min(1, freq * 0.3)
        const r = 212 + intensity * 40 // hacia naranja/dorado Salvaje
        const g = 100 + intensity * 72
        const b = 30 + intensity * 30
        ctx.lineWidth = 1 + i * 0.3
        ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`
        ctx.shadowColor = `rgba(${r},${g},${b},0.5)`
        ctx.shadowBlur = 6
        ctx.stroke()
        ctx.shadowBlur = 0
      })
    }

    const animate = () => {
      time += 0.02
      update()
      draw()
      raf = requestAnimationFrame(animate)
    }

    resize()
    animate()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className={`absolute inset-0 h-full w-full ${className}`} />
}
