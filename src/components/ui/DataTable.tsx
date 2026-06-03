'use client'

import React, { ReactNode } from 'react'

export interface Column<T> {
  header: ReactNode
  accessorKey?: keyof T
  cell?: (item: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  title?: string
  emptyMessage?: ReactNode
  footer?: ReactNode
  className?: string
  containerClassName?: string
  maxHeight?: string
  minWidth?: string
}

export function DataTable<T>({
  columns,
  data,
  title,
  emptyMessage = 'Sem dados disponíveis',
  footer,
  className = '',
  containerClassName = '',
  maxHeight = '600px',
  minWidth = '800px',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`glass-card rounded-2xl overflow-hidden w-full flex flex-col min-w-0 border border-[var(--color-outline-variant)] ${containerClassName}`}>
        {title && (
          <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
            <h2 className="text-headline-md text-[var(--color-on-surface)] font-semibold">{title}</h2>
          </div>
        )}
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[48px] opacity-30">bar_chart</span>
          <p className="text-sm opacity-60 text-center px-4">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card rounded-2xl overflow-hidden w-full max-w-full flex flex-col min-w-0 shadow-sm border border-[var(--color-outline-variant)] ${containerClassName}`}>
      {title && (
        <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center">
          <h2 className="text-headline-md text-[var(--color-on-surface)] font-semibold">{title}</h2>
          <span className="text-xs text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-highest)] px-2 py-1 rounded-full whitespace-nowrap">
            {data.length} registros
          </span>
        </div>
      )}

      {/* 
        This wrapper is critical to prevent the table from stretching the whole page horizontally.
        w-full, max-w-full, and min-w-0 ensure it stays contained within its parent.
      */}
      <div
        className="overflow-x-auto overflow-y-auto hidden-scrollbar w-full max-w-full flex-1"
        style={{ maxHeight }}
      >
        <table className={`w-full border-collapse ${className}`} style={{ minWidth }}>
          <thead className="sticky top-0 z-10 backdrop-blur-md bg-[var(--color-surface-container-low)]/90 border-b border-[var(--color-outline-variant)] shadow-sm">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3 text-label-md text-[var(--color-on-surface-variant)] font-medium ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-outline-variant)]">
            {data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-[var(--color-surface-container-high)] transition-all duration-200 group"
              >
                {columns.map((col, colIndex) => {
                  let cellContent: ReactNode = null
                  if (col.cell) {
                    cellContent = col.cell(item, rowIndex)
                  } else if (col.accessorKey) {
                    cellContent = item[col.accessorKey] as ReactNode
                  }
                  return (
                    <td
                      key={colIndex}
                      className={`px-5 py-3 group-hover:text-[var(--color-on-surface)] transition-colors ${col.className || ''}`}
                    >
                      {cellContent}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot className="sticky bottom-0 z-10 backdrop-blur-md bg-[var(--color-surface-container-low)]/90 border-t-2 border-[var(--color-outline-variant)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              {footer}
            </tfoot>
          )}
        </table>
      </div>

      {/* Scrollbar styles to be elegant and non-intrusive */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hidden-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .hidden-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .hidden-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--color-outline-variant);
          border-radius: 20px;
        }
        .hidden-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: var(--color-outline);
        }
      `}} />
    </div>
  )
}
