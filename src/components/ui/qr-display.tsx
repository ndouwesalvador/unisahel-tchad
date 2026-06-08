'use client'

import { useEffect, useState, useRef } from 'react'

interface QrDisplayProps {
  value: string
  size?: number
  className?: string
}

export function QrDisplay({ value, size = 120, className = '' }: QrDisplayProps) {
  const [src, setSrc] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const generate = async () => {
      try {
        const QRCode = await import('qrcode')
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: { dark: '#1a2744', light: '#ffffff' },
        })
        if (mounted.current) setSrc(url)
      } catch {
        // silent
      }
    }
    generate()
    return () => { mounted.current = false }
  }, [value, size])

  if (!src) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`QR Code: ${value}`}
      width={size}
      height={size}
      className={className}
    />
  )
}
