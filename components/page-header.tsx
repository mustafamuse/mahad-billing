interface PageHeaderProps {
  heading: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({
  heading,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
