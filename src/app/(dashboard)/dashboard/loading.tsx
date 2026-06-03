import React from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-6 rounded-3xl flex flex-col gap-1">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20 opacity-60" />
          </div>
        ))}
      </div>

      {/* Visualization Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Growth Path Skeleton */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col gap-6 min-h-[400px]">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64 opacity-60" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex-1 flex items-end">
            <Skeleton className="w-full h-[250px] rounded-lg" />
          </div>
        </div>

        {/* Demographics Skeleton */}
        <div className="glass-card rounded-3xl p-6 flex flex-col gap-6 h-full">
          <Skeleton className="h-7 w-40" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="flex flex-col gap-4 border-t border-[var(--color-outline-variant)] pt-6">
            <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-8" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-8" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-8" /></div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent saques table skeleton */}
        <div className="glass-card rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center pb-4 border-b border-[var(--color-outline-variant)]">
             <Skeleton className="h-6 w-40" />
             <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions & Activity */}
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
            <Skeleton className="h-6 w-40 mb-2" />
            {[1, 2].map((i) => (
               <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
            <Skeleton className="h-6 w-40 mb-2" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                 <Skeleton className="h-3 w-3 rounded-full" />
                 <Skeleton className="h-4 w-48" />
                 <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
