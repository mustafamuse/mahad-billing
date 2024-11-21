export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Email: support@tutoringprogram.com<br />
            Phone: (555) 123-4567<br />
            Hours: Mon-Fri 9am-6pm EST
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                About Us
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Programs
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                FAQs
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Refund Policy
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="text-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-300">
          © {new Date().getFullYear()} Tutoring Program. All rights reserved.
        </p>
      </div>
    </footer>
  );
}