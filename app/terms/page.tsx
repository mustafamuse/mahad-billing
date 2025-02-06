import Link from 'next/link'

import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GeometricPattern } from '@/components/ui/geometric-pattern'
import { Logo } from '@/components/ui/logo'

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'program', title: 'Program Information' },
  { id: 'payment', title: 'Payment Terms' },
  { id: 'cancellation', title: 'Cancellation and Refunds' },
  { id: 'conduct', title: 'Code of Conduct' },
  { id: 'communication', title: 'Communication' },
  { id: 'changes', title: 'Changes to Terms' },
  { id: 'contact', title: 'Contact Us' },
]

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] animate-gradient-slow opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl" />
        </div>
      </div>

      <div className="container relative px-4 py-16">
        <div className="mx-auto max-w-5xl">
          {/* Back Button */}
          <div className="mb-12 flex items-center justify-between">
            <Button
              asChild
              variant="ghost"
              className="flex items-center gap-2 hover:bg-transparent hover:text-primary"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Logo size="sm" />
          </div>

          {/* Header */}
          <div className="relative mb-16 text-center">
            <GeometricPattern className="absolute left-0 top-0 -z-10 h-64 w-64 rotate-90 opacity-10" />
            <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
              Terms & Policies
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Last updated: March 2024
            </p>
          </div>

          <div className="relative flex gap-8">
            {/* Table of Contents - Desktop */}
            <div className="sticky top-8 hidden h-fit w-64 shrink-0 lg:block">
              <div className="rounded-lg border bg-card/50 p-6 shadow-lg backdrop-blur-sm">
                <h3 className="mb-4 font-semibold">On this page</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 rounded-lg border bg-card/50 p-8 shadow-lg backdrop-blur-sm">
              <GeometricPattern className="absolute right-0 top-0 -z-10 h-full w-full opacity-[0.02]" />
              <div className="prose prose-gray dark:prose-invert mx-auto max-w-none">
                <section
                  id="acceptance"
                  className="mb-12 scroll-mt-8 [&:not(:first-child)]:pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Acceptance of Terms
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    By enrolling in our programs or using our services, you
                    agree to these Terms & Policies. Please read them carefully
                    before proceeding with enrollment.
                  </p>
                </section>

                <section
                  id="program"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Program Information
                  </h2>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-xl font-medium">
                        Duration and Structure
                      </h3>
                      <ul className="mt-4 list-none space-y-2 pl-0">
                        {[
                          'Programs are structured as 2-year courses',
                          'Classes are held weekly',
                          'Academic year is divided into three trimesters',
                          'Assessment test required before enrollment',
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-muted-foreground">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-medium">Eligibility</h3>
                      <p className="mt-2 text-muted-foreground">
                        While our programs are open to all age groups, they are
                        primarily designed for late high school to college-age
                        students. All prospective students must complete an
                        assessment test before enrollment.
                      </p>
                    </div>
                  </div>
                </section>

                <section
                  id="payment"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Payment Terms
                  </h2>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-xl font-medium">Fees and Billing</h3>
                      <ul className="mt-4 list-none space-y-2 pl-0">
                        {[
                          'Monthly tuition: $150 per student',
                          'Family discount: $10 off per additional student',
                          'Payments processed first week of each month',
                          'US bank account (ACH) payments only',
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-muted-foreground">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-medium">Payment Policies</h3>
                      <ul className="mt-4 list-none space-y-2 pl-0">
                        {[
                          'Automatic monthly payments required',
                          'Failed payments will be retried with added processing fees',
                          'Banking information updates must be submitted through proper channels',
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-muted-foreground">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section
                  id="cancellation"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Cancellation and Refunds
                  </h2>
                  <ul className="mt-4 list-none space-y-2 pl-0">
                    {[
                      'Cancellation requests must be submitted to administration',
                      'Cancellations effective from next billing period',
                      'Refunds available if requested before second class of billing period',
                      'No refunds for partial attendance',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  id="conduct"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Code of Conduct
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Students are expected to:
                  </p>
                  <ul className="mt-4 list-none space-y-2 pl-0">
                    {[
                      'Maintain respectful behavior towards instructors and peers',
                      'Complete assigned coursework',
                      'Participate actively in classes',
                      'Adhere to Islamic principles and values',
                      'Follow classroom and facility rules',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  id="communication"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Communication
                  </h2>
                  <ul className="mt-4 list-none space-y-2 pl-0">
                    {[
                      'Primary communication through WhatsApp and email',
                      'Office hours available during weekends after classes',
                      'Emergency contact information must be kept current',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  id="changes"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Changes to Terms
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    We reserve the right to modify these terms at any time.
                    Changes will be effective immediately upon posting to our
                    website. Continued enrollment constitutes acceptance of any
                    changes.
                  </p>
                </section>

                <section
                  id="contact"
                  className="mb-12 scroll-mt-8 border-t pt-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Contact Us
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    For questions about these terms or our policies, please
                    contact us:
                  </p>
                  <ul className="mt-4 list-none space-y-2 pl-0">
                    {[
                      'Email: contact@rootsofknowledge.org',
                      'In person: During weekend office hours',
                      'WhatsApp: Available during business hours',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
