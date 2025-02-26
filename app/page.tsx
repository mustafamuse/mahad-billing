'use client'

import Link from 'next/link'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeometricPattern } from '@/components/ui/geometric-pattern'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/programs"
              className="text-sm font-medium hover:text-primary"
            >
              Programs
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium hover:text-primary"
            >
              Pricing
            </Link>
            <Link
              href="/payment-link"
              className="text-sm font-medium hover:text-primary"
            >
              Make a Payment
            </Link>
            <Link
              href="#contact"
              className="text-sm font-medium hover:text-primary"
            >
              Contact
            </Link>
          </nav>
          <Button asChild variant="secondary">
            <Link href="/autopay">Get Started →</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative">
          <div className="container flex flex-col items-center gap-4 pb-8 pt-24 md:pt-32 lg:flex-row lg:gap-8">
            <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.21, 1.11, 0.81, 0.99],
                }}
                className="flex items-center gap-2 rounded-lg bg-muted px-4 py-1 text-sm"
              >
                <span className="text-primary">✨ Now Enrolling</span>
                <span className="text-muted-foreground">
                  2024-2025 Academic Year
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0, 0.71, 0.2, 1.01],
                }}
                className="text-5xl font-bold text-primary md:text-6xl lg:text-7xl"
              >
                Roots of Knowledge
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.3,
                }}
                className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Discover the Beauty of{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Islamic Knowledge
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.6,
                }}
                className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8"
              >
                Join our vibrant community where traditional Islamic education
                meets modern learning approaches.
              </motion.p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="gap-2 bg-primary/90 hover:bg-primary"
                  asChild
                >
                  <Link href="/autopay">
                    Begin Your Journey
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/programs">Explore Programs</Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/payment-link">Make a Payment</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block lg:flex-1">
              <div className="relative aspect-square overflow-hidden rounded-full border bg-muted">
                <GeometricPattern className="absolute inset-0 h-full w-full opacity-50" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
              Excellence in Islamic Education
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Our comprehensive programs are designed to nurture both spiritual
              growth and academic excellence.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border bg-background p-2"
              >
                <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                  <CheckCircle className="h-12 w-12 text-primary" />
                  <div className="space-y-2">
                    <h3 className="font-bold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Programs Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Our Programs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Discover our comprehensive Islamic education programs designed
                to nurture knowledge and understanding.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 dark:ring-gray-800 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
              <div className="p-8 sm:p-10 lg:flex-auto">
                <h3 className="text-2xl font-bold tracking-tight">
                  2-Year Roots of Knowledge Ma'had Program
                </h3>
                <p className="mt-6 text-base leading-7 text-muted-foreground">
                  Our flagship program offers a structured curriculum in Islamic
                  Studies, Arabic language, and Quranic Sciences. Accredited
                  under the Islamic University of Minnesota!
                  <br />
                  Learn more about our accrediting institution at{' '}
                  <Link
                    href="https://site.ium.edu.so/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    site.ium.edu.so
                  </Link>
                </p>
                <div className="mt-10 flex items-center gap-x-4">
                  <h4 className="flex-none text-sm font-semibold leading-6">
                    What's included
                  </h4>
                  <div className="h-px flex-auto bg-gray-100 dark:bg-gray-800" />
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2">
                  {[
                    'Comprehensive Islamic Studies',
                    'Arabic Language',
                    'Quranic Sciences',
                    'Islamic History',
                    'Islamic Jurisprudence',
                    'Character Development',
                  ].map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckCircle
                        className="h-6 w-5 flex-none text-primary"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                <div className="rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-inset ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800 lg:flex lg:flex-col lg:justify-center lg:py-16">
                  <div className="mx-auto max-w-xs px-8">
                    <p className="text-base font-semibold">
                      Full Program Details
                    </p>
                    <p className="mt-6 flex items-baseline justify-center gap-x-2">
                      <span className="text-5xl font-bold tracking-tight">
                        60
                      </span>
                      <span className="text-sm font-semibold leading-6">
                        credit hours
                      </span>
                    </p>
                    <Button asChild className="mt-10 w-full">
                      <Link href="/programs">
                        View Full Curriculum
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="mt-6 text-xs leading-5 text-muted-foreground">
                      Classes held at our Eden Prairie location
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className="container space-y-6 py-8 md:py-12 lg:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
              Simple Pricing
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Transparent pricing with progressive family discounts.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <Card className="flex flex-col">
              <div className="flex-1 p-6">
                <h3 className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  Monthly Tuition
                </h3>
                <div className="mt-4 flex items-baseline text-6xl font-bold">
                  $150
                  <span className="ml-1 text-xl font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
                <p className="mt-4 text-muted-foreground">
                  Standard rate per student includes:
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    'Comprehensive Islamic education',
                    'Expert instructors',
                    'Modern facilities',
                    'Flexible payment options',
                    'Family discount eligible',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full bg-primary/90 hover:bg-primary"
                >
                  <Link href="/register">Start Registration</Link>
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col">
              <div className="flex-1 p-6">
                <h3 className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  Family Discount Program
                </h3>
                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">
                      Progressive Savings
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Our tiered discount system rewards larger families:
                  </p>
                </div>
                <ul className="mt-6 space-y-4">
                  {[
                    {
                      title: '2 Siblings Enrolled',
                      rate: '$140/month each',
                      savings: 'Save $10 per student',
                    },
                    {
                      title: '3 Siblings Enrolled',
                      rate: '$135/month each',
                      savings: 'Save $15 per student',
                    },
                    {
                      title: '4+ Siblings Enrolled',
                      rate: '$130/month each',
                      savings: 'Save $20 per student',
                    },
                  ].map((tier) => (
                    <li key={tier.title} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{tier.title}</span>
                      </div>
                      <div className="ml-6 text-sm text-muted-foreground">
                        <div>{tier.rate}</div>
                        <div className="text-primary">{tier.savings}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/register">Register Now</Link>
                </Button>
              </div>
            </Card>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New students must complete registration before setting up automatic
            payments
          </p>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="container space-y-6 py-8 md:py-12 lg:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
              Contact Us
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              We're here to help. Get in touch with us.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-4 rounded-lg border bg-card/50 p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <p>6520 Edenvale Blvd # 110, Eden Prairie, MN 55346</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <p>umpp101@gmail.com</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <p>612-517-7466</p>
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-700">
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2024 Roots of Knowledge. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    title: 'Authentic Knowledge',
    description:
      'Learn from qualified instructors with traditional Islamic education.',
  },
  {
    title: 'Modern Approach',
    description:
      'Combining classical teachings with contemporary learning methods.',
  },
  {
    title: 'Flexible Schedule',
    description: 'Programs designed to accommodate your busy lifestyle.',
  },
  {
    title: 'Community Focus',
    description: 'Build lasting connections within our vibrant community.',
  },
  {
    title: 'Personalized Learning',
    description: 'Individual attention and customized learning paths.',
  },
  {
    title: 'Cultural Integration',
    description: 'Bridge traditional values with modern context.',
  },
]
