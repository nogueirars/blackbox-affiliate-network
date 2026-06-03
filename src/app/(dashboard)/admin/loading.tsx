import React from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full">
      {/* Generic Admin Header */}
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-64 opacity-60" />
      </div>

      {/* Tabela Genérica Admin */}
      <div className="glass-card rounded-xl overflow-hidden mt-2 flex flex-col">
        {/* Toolbar / Filtros */}
        <div className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
           <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />
           <div className="flex gap-2 w-full sm:w-auto">
             <Skeleton className="h-10 w-24 rounded-lg" />
             <Skeleton className="h-10 w-24 rounded-lg" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="orbit-table w-full">
            <thead className="bg-[var(--color-surface-container-low)]">
              <tr>
                <th className="px-6 py-3"><Skeleton className="h-4 w-32" /></th>
                <th className="px-6 py-3"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-3"><Skeleton className="h-4 w-20" /></th>
                <th className="px-6 py-3"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-3"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-outline-variant)]">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                  <td className="px-6 py-4">
                     <Skeleton className="h-5 w-40 mb-1" />
                     <Skeleton className="h-3 w-32 opacity-60" />
                  </td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24 opacity-60" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-lg" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
