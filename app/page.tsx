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

import { GlobalHeader } from '@/components/layout/global-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <GlobalHeader variant="public" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90 px-6 py-12 lg:px-8 lg:py-20">
          {/* Gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-amber-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-0 lg:grid-cols-2 lg:gap-16">
              {/* Mobile Logo Section - Moved to top */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex justify-center lg:hidden"
              >
                <Logo
                  className="w-full max-w-md transform transition-transform duration-300 hover:scale-105"
                  size="xl"
                  showText={false}
                />
              </motion.div>

              {/* Main Content */}
              <div className="flex flex-col justify-center text-center lg:text-left">
                <motion.h1
                  className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  Discover the Beauty of{' '}
                  <motion.span
                    className="relative inline-block bg-gradient-to-r from-emerald-600 via-primary to-amber-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-primary-foreground dark:to-amber-400"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3, type: 'spring' }}
                  >
                    Islamic Knowledge
                    {/* Enhanced gradient background */}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-amber-500/20 blur-xl" />
                  </motion.span>
                </motion.h1>

                <motion.p
                  className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Join our vibrant community where traditional Islamic education
                  meets modern learning approaches.
                </motion.p>

                {/* Stats */}
                <motion.div
                  className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <Users2 className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      100+ Students Enrolled
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Islamic University Instructors
                    </span>
                  </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  className="mt-10 flex flex-col gap-4 sm:flex-row"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <Button size="lg" className="group w-full sm:w-auto" asChild>
                    <Link href="/register">
                      Begin Registration{' '}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    asChild
                  >
                    <Link href="#programs">Explore Programs</Link>
                  </Button>
                </motion.div>
              </div>

              {/* Desktop Logo Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.4, type: 'spring' }}
                className="relative hidden flex-1 items-center justify-center lg:flex"
              >
                {/* Subtle decorative background - much more understated */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 blur-2xl" />

                {/* Logo completely free - no container */}
                <Logo
                  className="w-full max-w-2xl transform transition-transform duration-300 hover:scale-105"
                  size="xl"
                  showText={false}
                />
              </motion.div>
            </div>
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
