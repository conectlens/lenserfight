import React from 'react'

export const ConnectorsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-greyscale-500">Connectors</p>
        <h1 className="mt-1 text-2xl font-bold text-greyscale-900 dark:text-greyscale-100">Connectors</h1>
        <p className="mt-1 text-sm text-greyscale-500">Manage your local and cloud AI provider connections.</p>
      </div>
    </div>
  )
}
