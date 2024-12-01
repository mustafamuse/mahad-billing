import { useState, useCallback } from 'react'

export function useModal(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const onOpen = useCallback(() => setIsOpen(true), [])
  const onClose = useCallback(() => setIsOpen(false), [])
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
  }
}
