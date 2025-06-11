interface FooterProps {
  showButtons?: boolean
}

export function Footer({ showButtons = false }: FooterProps) {
  return (
    <footer className="mt-8 border-t border-border/10 bg-background pt-8">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Mahad Auto-Pay. All rights reserved.</p>
          {showButtons && (
            <div className="mt-4 flex justify-center gap-4">
              <button className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </button>
              <button className="text-muted-foreground hover:text-foreground">
                Terms of Service
              </button>
              <button className="text-muted-foreground hover:text-foreground">
                Contact Support
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
