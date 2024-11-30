import { GraduationCap } from 'lucide-react'

export function Header() {
  return (
    <header className="mb-12 text-center">
      <div className="mb-4 flex items-center justify-center">
        <GraduationCap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
        Set Up Your Tuition Payment
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
        Welcome to Irshād Mahad&apos;s tuition payment portal. Use this app to
        set up your monthly tuition payments easily and securely. Simply select
        your name and complete the payment process.
      </p>
    </header>
  )
}
