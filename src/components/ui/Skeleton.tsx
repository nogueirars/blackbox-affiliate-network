import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--color-surface-container-highest)] opacity-50 ${className}`}
      {...props}
    />
  )
}
