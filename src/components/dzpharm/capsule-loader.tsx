'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CapsuleLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  sublabel?: string
  className?: string
  colorTheme?: 'emerald' | 'cyan' | 'amber'
}

export function CapsuleLoader({
  size = 'md',
  label = 'Chargement clinique…',
  sublabel,
  className,
  colorTheme = 'emerald',
}: CapsuleLoaderProps) {
  const dimensions = {
    sm: { width: 48, height: 24, stroke: 2, scale: 0.7 },
    md: { width: 72, height: 36, stroke: 2.5, scale: 1 },
    lg: { width: 96, height: 48, stroke: 3, scale: 1.3 },
  }[size]

  const colors = {
    emerald: {
      left: '#059669', // Emerald 600
      right: '#34d399', // Emerald 400
      glow: 'rgba(16, 185, 129, 0.4)',
    },
    cyan: {
      left: '#0284c7', // Sky 600
      right: '#38bdf8', // Sky 400
      glow: 'rgba(14, 165, 233, 0.4)',
    },
    amber: {
      left: '#d97706', // Amber 600
      right: '#fbbf24', // Amber 400
      glow: 'rgba(245, 158, 11, 0.4)',
    },
  }[colorTheme]

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-4 select-none', className)}>
      <div className="relative flex items-center justify-center" style={{ height: dimensions.height * 1.5 }}>
        {/* Lueur centrale / particules émises lors de l'ouverture */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: dimensions.width * 0.4,
            height: dimensions.height * 0.8,
            backgroundColor: colors.glow,
            filter: 'blur(10px)',
          }}
          animate={{
            scale: [0.4, 1.4, 0.4],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Croix clinique centrale étincelante */}
        <motion.svg
          viewBox="0 0 24 24"
          className="absolute size-4 text-emerald-500 dark:text-emerald-400 z-0"
          animate={{
            rotate: [0, 180, 360],
            scale: [0.6, 1.2, 0.6],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <path
            fill="currentColor"
            d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"
          />
        </motion.svg>

        {/* Moitié GAUCHE de la gélule */}
        <motion.div
          className="relative z-10"
          animate={{
            x: [-4, -14, -4],
            rotate: [0, -6, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg
            width={dimensions.width / 2}
            height={dimensions.height}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Corps gauche arrondi */}
            <path
              d="M36 4H18C10.268 4 4 10.268 4 18C4 25.732 10.268 32 18 32H36V4Z"
              fill={colors.left}
              stroke="currentColor"
              strokeWidth={dimensions.stroke}
              className="text-border/40"
            />
            {/* Reflet verre 3D */}
            <path
              d="M10 12C10 10 14 8 20 8H34"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
          </svg>
        </motion.div>

        {/* Moitié DROITE de la gélule */}
        <motion.div
          className="relative z-10"
          animate={{
            x: [4, 14, 4],
            rotate: [0, 6, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg
            width={dimensions.width / 2}
            height={dimensions.height}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Corps droit arrondi */}
            <path
              d="M0 4H18C25.732 4 32 10.268 32 18C32 25.732 25.732 32 18 32H0V4Z"
              fill={colors.right}
              stroke="currentColor"
              strokeWidth={dimensions.stroke}
              className="text-border/40"
            />
            {/* Reflet verre 3D */}
            <path
              d="M2 8H16C22 8 26 10 26 12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </svg>
        </motion.div>
      </div>

      {label && (
        <div className="text-center">
          <p className="text-xs font-bold tracking-wide text-foreground animate-pulse">
            {label}
          </p>
          {sublabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
