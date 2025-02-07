import Link from 'next/link'

import {
  ArrowRight,
  GraduationCap,
  Users,
  Clock,
  MapPin,
  Book,
  Scroll,
  Mail,
  Phone,
  ChevronDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeometricPattern } from '@/components/ui/geometric-pattern'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden scroll-smooth bg-background">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] animate-gradient-slow opacity-50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 blur-3xl" />
        </div>
        <div className="absolute -inset-[10px] animate-gradient-fast opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/30 via-primary/30 to-secondary/30 blur-3xl" />
        </div>
      </div>

      {/* Logo */}
      <div className="absolute left-4 top-4 z-10">
        <Logo size="sm" />
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] items-center">
        <div className="container px-4">
          <div className="animate-fade-in-up space-y-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Discover the Beauty of{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Islamic Knowledge
              </span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
              Join our vibrant community at Roots of Knowledge, where
              traditional Islamic education meets modern learning approaches.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg" className="group animate-fade-in">
                <Link href="/autopay" className="flex items-center gap-2">
                  Enroll Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="animate-fade-in [animation-delay:200ms]"
              >
                <Link href="#programs">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
        <GeometricPattern className="absolute left-0 top-0 -z-10 h-64 w-64 rotate-45 opacity-20" />
        <GeometricPattern className="absolute right-0 top-0 -z-10 h-64 w-64 -rotate-45 opacity-20" />

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <Link
            href="#programs"
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <span className="text-sm">Scroll to explore</span>
            <ChevronDown className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* About/Introduction Section */}
      <section className="relative bg-muted/50 py-24">
        <div className="container px-4">
          <div className="grid animate-fade-in-up gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground">
                  At Roots of Knowledge, we are dedicated to providing
                  comprehensive Islamic education that empowers individuals with
                  knowledge, understanding, and spiritual growth.
                </p>
              </div>
              <div className="space-y-4 rounded-lg border bg-card/50 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Book className="h-5 w-5" />
                  <span>Authentic Islamic Knowledge</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <GraduationCap className="h-5 w-5" />
                  <span>Qualified Instructors</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <Scroll className="h-5 w-5" />
                  <span>Comprehensive Curriculum</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <GeometricPattern className="absolute right-0 top-0 h-full w-full opacity-10" />
              <div className="relative rounded-lg bg-card p-6 shadow-lg">
                <h3 className="mb-4 text-2xl font-bold">Why Choose Us?</h3>
                <ul className="space-y-4 text-muted-foreground">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="relative py-24">
        <div className="container px-4">
          <div className="animate-fade-in-up space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Our Programs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Explore our diverse range of educational programs designed for
                all age groups and levels.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program, index) => (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-primary/10 transition-colors hover:border-primary/20"
                >
                  <GeometricPattern className="absolute right-0 top-0 h-full w-full opacity-5 transition-opacity group-hover:opacity-10" />
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold">{program.title}</h3>
                    <p className="mb-4 text-muted-foreground">
                      {program.description}
                    </p>
                    <Button asChild variant="outline" className="group w-full">
                      <Link
                        href="/autopay"
                        className="flex items-center justify-center gap-2"
                      >
                        Enroll Now
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Information Section */}
      <section className="relative py-24">
        <div className="container px-4">
          <div className="animate-fade-in-up space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Payment Information
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Clear and simple pricing with convenient payment options
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Pricing Card */}
              <Card className="relative overflow-hidden">
                <GeometricPattern className="absolute right-0 top-0 h-full w-full opacity-5" />
                <div className="p-6">
                  <h3 className="mb-4 text-2xl font-bold">Program Pricing</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">$150 per month</p>
                        <p className="text-sm text-muted-foreground">
                          Base price per student
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          Family Discount Available
                        </p>
                        <p className="text-sm text-muted-foreground">
                          $10 off per additional student
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Monthly Billing</p>
                        <p className="text-sm text-muted-foreground">
                          Processed first week of each month
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Details Card */}
              <Card className="relative overflow-hidden">
                <GeometricPattern className="absolute right-0 top-0 h-full w-full opacity-5" />
                <div className="p-6">
                  <h3 className="mb-4 text-2xl font-bold">Payment Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          US Bank Account (ACH) Only
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Safe and secure direct bank payments
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Flexible Policies</p>
                        <p className="text-sm text-muted-foreground">
                          Easy updates and cancellation available
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="mt-4 w-full">
                      <Link
                        href="/payment-faq"
                        className="flex items-center justify-center gap-2"
                      >
                        View Payment FAQ
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Location/Contact Section */}
      <section className="relative bg-muted/50 py-24">
        <div className="container px-4">
          <div className="animate-fade-in-up space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Visit Us
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We're conveniently located in the heart of the community.
              </p>
            </div>
            <div className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-card/50 p-8">
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
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 Roots of Knowledge. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Terms & Policies
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  'Flexible learning schedules that accommodate your needs',
  'Interactive teaching methods that enhance understanding',
  'Supportive learning environment for all students',
  'Cultural awareness and community integration',
]

const programs = [
  {
    title: 'Quran Memorization',
    description:
      'Comprehensive Hifz program with expert instructors and personalized attention.',
  },
  {
    title: 'Islamic Studies',
    description:
      'Learn about Islamic history, jurisprudence, and contemporary issues.',
  },
  {
    title: 'Arabic Language',
    description: 'Master Classical Arabic through our structured curriculum.',
  },
]
