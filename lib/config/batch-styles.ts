export interface BatchStyle {
  variant: 'default' | 'secondary' | 'outline'
  className: string
}

interface BatchConfig {
  name: string
  style: BatchStyle
}

// Individual batch styles
export const BATCH_CONFIGS: BatchConfig[] = [
  {
    name: 'Irshād 1',
    style: {
      variant: 'secondary',
      className:
        'bg-blue-200 text-blue-900 hover:bg-blue-300 dark:bg-blue-400/30 dark:text-blue-200 dark:hover:bg-blue-400/40',
    },
  },
  {
    name: 'Irshād 3',
    style: {
      variant: 'secondary',
      className:
        'bg-rose-200 text-rose-900 hover:bg-rose-300 dark:bg-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-400/40',
    },
  },
  {
    name: 'Irshād 4',
    style: {
      variant: 'secondary',
      className:
        'bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-400/30 dark:text-amber-200 dark:hover:bg-amber-400/40',
    },
  },
  {
    name: 'Abūbakar 1',
    style: {
      variant: 'secondary',
      className:
        'bg-emerald-200 text-emerald-900 hover:bg-emerald-300 dark:bg-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-400/40',
    },
  },
]

// Default style for any unmatched batches
export const DEFAULT_BATCH_STYLE: BatchStyle = {
  variant: 'secondary',
  className:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-400/30 dark:text-gray-200 dark:hover:bg-gray-400/40',
}

export function getBatchStyle(batchName: string): BatchStyle {
  const config = BATCH_CONFIGS.find(
    (config) => config.name.toLowerCase() === batchName.toLowerCase()
  )
  return config?.style ?? DEFAULT_BATCH_STYLE
}
