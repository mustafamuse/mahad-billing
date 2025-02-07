'use client'

export function GradientAnimation() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute h-[50rem] w-[50rem] animate-gradient-slow rounded-full bg-gradient-to-r from-primary/40 to-primary-foreground/40 opacity-20 blur-3xl will-change-transform"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 h-[40rem] w-[40rem] animate-gradient-fast rounded-full bg-gradient-to-l from-blue-500/30 to-primary/30 opacity-20 blur-3xl will-change-transform"
      />
    </div>
  )
}
