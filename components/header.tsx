import { GraduationCap } from "lucide-react";

export function Header() {
  return (
    <header className="text-center mb-12">
      <div className="flex items-center justify-center mb-4">
        <GraduationCap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Enroll in Our Tutoring Program
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Join our comprehensive tutoring program designed to help students excel. 
        Complete the form below to begin your educational journey.
      </p>
    </header>
  );
}