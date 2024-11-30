import { GraduationCap } from "lucide-react";

export function Header() {
  return (
    <header className="text-center mb-12">
      <div className="flex items-center justify-center mb-4">
        <GraduationCap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Set Up Your Tuition Payment
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Welcome to Irshād Mahad&apos;s tuition payment portal. Use this app to set up your monthly tuition payments easily and securely. Simply select your name and complete the payment process.
      </p>
    </header>
  );
}