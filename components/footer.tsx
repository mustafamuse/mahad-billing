export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-700">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Contact Us
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Email: support@tutoringprogram.com
            <br />
            Phone: (555) 123-4567
            <br />
            Hours: Mon-Fri 9am-6pm EST
          </p>
        </div>
        <div>
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Quick Links
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                About Us
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Programs
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                FAQs
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Legal
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Refund Policy
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-8 text-center dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-300">
          © {new Date().getFullYear()} Tutoring Program. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
