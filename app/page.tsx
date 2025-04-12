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
  Users2,
  GraduationCap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeometricPattern } from '@/components/ui/geometric-pattern'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 md:h-16">
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
              href="#contact"
              className="text-sm font-medium hover:text-primary"
            >
              Contact
            </Link>
          </nav>
          <Button asChild variant="secondary" className="h-10 px-4 md:h-11">
            <Link href="https://buy.stripe.com/fZeg0O7va1gt4da3cc">
              Pay Tuition →
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background">
          {/* Background Pattern */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
            <GeometricPattern className="absolute inset-0 h-full w-full opacity-30" />
          </div>

          <div className="container flex flex-col items-center gap-6 px-4 pb-16 pt-16 md:gap-8 md:pb-24 md:pt-24 lg:flex-row lg:pt-32">
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              {/* Announcement Badge */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-base backdrop-blur"
              >
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  Now Enrolling
                </span>
                <span className="text-muted-foreground">2024-2025</span>
              </motion.div>

              {/* Main Title with Enhanced Animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, type: 'spring' }}
                className="relative"
              >
                <span className="absolute -inset-x-4 -inset-y-2 -z-10 rounded-lg bg-primary/5" />
                <h1 className="text-4xl font-bold text-primary sm:text-5xl md:text-6xl lg:text-7xl">
                  Roots of Knowledge
                </h1>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
              >
                Discover the Beauty of{' '}
                <span className="relative">
                  <span className="absolute inset-x-0 bottom-2 h-3 bg-primary/10" />
                  <span className="relative bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Islamic Knowledge
                  </span>
                </span>
              </motion.h2>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col gap-6 text-center lg:text-left"
              >
                <p className="max-w-[42rem] text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
                  Join our vibrant community where traditional Islamic education
                  meets modern learning approaches.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground lg:justify-start">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-primary" />
                    <span>100+ Students Enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>Islamic University Instructors</span>
                  </div>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="group h-14 gap-2 rounded-xl bg-primary/90 text-base hover:bg-primary sm:w-auto md:h-12"
                  asChild
                >
                  <Link href="/register">
                    Begin Your Journey
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-xl text-base hover:bg-primary/5 sm:w-auto md:h-12"
                >
                  <Link href="/programs">Explore Programs</Link>
                </Button>
              </div>
            </div>

            {/* Hero Image/Pattern */}
            <div className="relative hidden lg:block lg:flex-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-3xl" />
              <div className="relative aspect-square overflow-hidden rounded-full border bg-muted">
                <GeometricPattern className="absolute inset-0 h-full w-full opacity-50" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container space-y-8 px-4 py-12 md:space-y-12 md:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-2xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              Excellence in Islamic Education
            </h2>
            <p className="max-w-[85%] text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
              Our comprehensive programs are designed to nurture both spiritual
              growth and academic excellence.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border bg-background p-2"
              >
                <div className="flex h-[180px] flex-col justify-between rounded-lg p-6">
                  <CheckCircle className="h-12 w-12 text-primary" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Programs Section - Mobile optimized */}
        <section className="py-12 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Our Programs
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
                Discover our comprehensive Islamic education programs designed
                to nurture knowledge and understanding at every level.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-3xl rounded-2xl ring-1 ring-gray-200 dark:ring-gray-800 lg:mx-0 lg:flex lg:max-w-none">
              <div className="p-6 sm:p-8 lg:flex-auto">
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    2-Year Roots of Knowledge Ma'had Program
                  </h3>
                  <div className="mt-3 flex items-center justify-center gap-2 lg:justify-start">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Accredited Program
                    </span>
                  </div>
                  <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                    Our flagship program offers a structured curriculum in
                    Islamic Studies, Arabic language, and Quranic Sciences.
                    Accredited under the Islamic University of Minnesota!
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
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
                </div>

                <div className="mt-8 flex items-center gap-x-4">
                  <h4 className="flex-none text-base font-semibold">
                    What's included
                  </h4>
                  <div className="h-px flex-auto bg-gray-100 dark:bg-gray-800" />
                </div>

                <ul className="mt-6 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2">
                  {[
                    {
                      title: 'Comprehensive Islamic Studies',
                      description:
                        'Foundation in Islamic principles and practices',
                    },
                    {
                      title: 'Arabic Language',
                      description: 'Classical and modern Arabic instruction',
                    },
                    {
                      title: 'Quranic Sciences',
                      description: 'Tajweed and Quranic interpretation',
                    },
                    {
                      title: 'Islamic History',
                      description: 'Study of Islamic civilization and heritage',
                    },
                    {
                      title: 'Islamic Jurisprudence',
                      description: 'Understanding of Islamic law and rulings',
                    },
                    {
                      title: 'Character Development',
                      description: 'Focus on Islamic ethics and manners',
                    },
                  ].map((feature) => (
                    <li key={feature.title} className="relative">
                      <div className="flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-x-3">
                          <CheckCircle
                            className="h-5 w-5 flex-none text-primary"
                            aria-hidden="true"
                          />
                          <span className="font-medium">{feature.title}</span>
                        </div>
                        <p className="ml-8 text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                <div className="rounded-2xl bg-gray-50 py-8 text-center ring-1 ring-inset ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800 lg:flex lg:flex-col lg:justify-center lg:py-16">
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
                    <Button
                      asChild
                      className="mt-8 h-14 w-full rounded-xl text-base md:h-12"
                    >
                      <Link href="/programs">
                        View Full Curriculum
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                      Classes held at our Eden Prairie location
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Modern Design */}
        <section
          id="pricing"
          className="container space-y-8 px-4 py-12 md:space-y-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-2xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              Tuition & Family Discounts
            </h2>
            <p className="max-w-[85%] text-base leading-relaxed text-muted-foreground sm:text-lg">
              Quality education with special rates for families
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Card className="relative overflow-hidden rounded-xl border bg-card">
              {/* Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

              <div className="relative space-y-6 p-6 md:p-8">
                {/* Base Price */}
                <div className="flex flex-col items-center space-y-2 pb-6 text-center md:pb-8">
                  <div className="text-sm font-medium text-muted-foreground">
                    Starting at
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold md:text-5xl">$150</span>
                    <span className="text-muted-foreground">
                      /month per student
                    </span>
                  </div>
                </div>

                {/* Family Discount Tiers */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Family Discount Program</h3>
                  </div>
                  <div className="grid gap-3">
                    {[
                      { students: 2, price: 140, savings: 10 },
                      { students: 3, price: 135, savings: 15 },
                      { students: '4+', price: 130, savings: 20 },
                    ].map((tier) => (
                      <div
                        key={tier.students}
                        className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {tier.students}
                          </div>
                          <div>
                            <div className="font-medium">
                              {tier.students} Students
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Save ${tier.savings} each
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-medium">
                          ${tier.price}
                          <span className="text-sm text-muted-foreground">
                            /mo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 pt-6 md:pt-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">What's Included</h3>
                  </div>
                  <ul className="grid gap-3 text-sm md:grid-cols-2">
                    {[
                      'Comprehensive Islamic education',
                      'Expert instructors',
                      'University accredited program',
                      'Learning materials included',
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="space-y-4 pt-6 md:pt-8">
                  <Button
                    asChild
                    className="h-12 w-full gap-2 rounded-xl bg-primary text-base hover:bg-primary/90"
                  >
                    <Link href="/register">
                      Begin Registration
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Registration required before setting up monthly payments
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Contact Section - Mobile optimized */}
        <section
          id="contact"
          className="container space-y-8 px-4 py-12 md:space-y-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-2xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              Contact Us
            </h2>
            <p className="max-w-[85%] text-base leading-relaxed text-muted-foreground sm:text-lg">
              We're here to help. Get in touch with us.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-card/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <p className="text-base leading-relaxed">
                6520 Edenvale Blvd # 110, Eden Prairie, MN 55346
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <p className="text-base">umpp101@gmail.com</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-base">612-517-7466</p>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-base text-green-700">
                  <MessageCircle className="h-5 w-5" />
                  <span>WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-relaxed text-muted-foreground md:text-left">
            © 2024 Roots of Knowledge. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
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
