'use client'

import Link from 'next/link'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Book,
  BookOpenCheck,
  BookText,
  CheckCircle,
  Clock,
  Compass,
  GraduationCap,
  Heart,
  History,
  Lightbulb,
  Scroll,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GeometricPattern } from '@/components/ui/geometric-pattern'
import { Logo } from '@/components/ui/logo'

const semesters = [
  {
    name: 'Fall Semester 2024',
    dates: 'July 7 - October 19, 2024',
    notes: 'Final Exams: October 18-19',
  },
  {
    name: 'Winter Semester 2024-2025',
    dates: 'November 1, 2024 - February 2, 2025',
    notes: 'Winter Break: January 3-16',
  },
  {
    name: 'Spring Semester 2025',
    dates: 'February 15 - May 25, 2025',
    notes: 'Ramadan & Eid Break: March 21-30',
  },
]

const firstYearCourses = [
  {
    id: 1,
    name: 'Quranic Studies',
    description:
      'Learn proper recitation, memorization techniques, and basic Quranic interpretation.',
    icon: BookOpenCheck,
    detailedCourses: [
      { code: 'ISE120', title: 'Rules of Quranic Recitation', credits: 3 },
      {
        code: 'ISE121',
        title: "Introduction to the Qur'anic Studies",
        credits: 3,
      },
    ],
  },
  {
    id: 2,
    name: 'Islamic Creed & Jurisprudence',
    description:
      'Study fundamental Islamic beliefs and practical religious rulings.',
    icon: BookText,
    detailedCourses: [
      { code: 'ISE100', title: 'Islamic Creed 1', credits: 3 },
      { code: 'ISE101', title: 'Islamic Creed 2', credits: 3 },
      {
        code: 'ISE110',
        title: 'The History of Islamic Jurisprudence',
        credits: 3,
      },
      { code: 'ISE111', title: 'Fiqh of Worship 1', credits: 3 },
    ],
  },
  {
    id: 3,
    name: 'Prophetic Studies',
    description:
      'Learn about the life of Prophet Muhammad ﷺ and authentic hadith.',
    icon: History,
    detailedCourses: [
      { code: 'ISE130', title: 'Introduction to Hadeeth Sciences', credits: 3 },
      { code: 'ISE140', title: 'Stories of the Prophets', credits: 3 },
      { code: 'ISE141', title: 'Prophetic Biography Makka Period', credits: 3 },
    ],
  },
  {
    id: 4,
    name: 'Spiritual Development',
    description: 'Focus on character development and spiritual purification.',
    icon: Heart,
    detailedCourses: [
      { code: 'ISE131', title: 'Purification of the Soul 1', credits: 3 },
    ],
  },
]

const secondYearCourses = [
  {
    id: 1,
    name: 'Advanced Quranic Studies',
    description:
      'Deep dive into Quranic exegesis and advanced interpretation methods.',
    icon: Scroll,
    detailedCourses: [
      {
        code: 'ISE220',
        title: 'Usul At Tafseer - Analytical Quranic 1',
        credits: 3,
      },
      {
        code: 'ISE240',
        title: 'Usul At Tafseer - Analytical Quranic 2',
        credits: 3,
      },
    ],
  },
  {
    id: 2,
    name: 'Advanced Islamic Studies',
    description: 'Study advanced topics in Islamic law and jurisprudence.',
    icon: BookText,
    detailedCourses: [
      { code: 'ISE210', title: 'Fiqh of Worship 2', credits: 3 },
      {
        code: 'ISE211',
        title: 'Introduction to the Principles of Jurisprudence',
        credits: 3,
      },
      {
        code: 'ISE221',
        title: 'An Understanding of Heretical Innovation',
        credits: 3,
      },
    ],
  },
  {
    id: 3,
    name: 'Islamic History',
    description: 'Study the history of early Islam and its development.',
    icon: Compass,
    detailedCourses: [
      {
        code: 'ISE200',
        title: 'Prophetic Biography Madina Period',
        credits: 3,
      },
      {
        code: 'ISE201',
        title: 'The History of the Rightly Guided Caliphs',
        credits: 3,
      },
    ],
  },
  {
    id: 4,
    name: 'Character & Education',
    description: 'Focus on Islamic manners and educational principles.',
    icon: Lightbulb,
    detailedCourses: [
      { code: 'ISE230', title: 'Islamic Manners', credits: 3 },
      { code: 'ISE231', title: 'Purification of the Soul 2', credits: 3 },
      {
        code: 'ISE241',
        title: 'Introduction to Islamic Education',
        credits: 3,
      },
    ],
  },
]

const gradeScale = [
  { letter: 'A', range: '90 - 100%' },
  { letter: 'B', range: '80 - 89%' },
  { letter: 'C', range: '70 - 79%' },
  { letter: 'D', range: '60 - 69%' },
  { letter: 'F', range: 'Below 60%' },
]

const gradeComponents = [
  { name: 'Class Participation', weight: 10 },
  { name: 'Homework & Assignments', weight: 30 },
  { name: 'Quizzes', weight: 20 },
  { name: 'Final Exam', weight: 40 },
]

const studentExpectations = [
  {
    title: 'Academic Responsibilities',
    items: [
      'Attend all classes punctually',
      'Complete assignments with integrity',
      'Submit work on time',
      'Actively participate in discussions',
    ],
  },
  {
    title: 'Personal Conduct',
    items: [
      'Maintain respectful behavior',
      'Practice good time management',
      'Adhere to Islamic etiquette',
      "Follow Ma'had's code of conduct",
    ],
  },
]

export default function ProgramsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] animate-gradient-slow opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl" />
        </div>
      </div>

      <div className="container relative px-4 py-8 md:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Back Button and Logo */}
          <div className="mb-8 flex items-center justify-between md:mb-12">
            <Button
              asChild
              variant="ghost"
              className="h-12 gap-2 rounded-xl text-base hover:bg-transparent hover:text-primary md:h-10"
            >
              <Link href="/">
                <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
                <span className="hidden md:inline">Back to Home</span>
                <span className="md:hidden">Back</span>
              </Link>
            </Button>
            <Logo size="sm" />
          </div>

          {/* Header */}
          <div className="relative mb-12 text-center md:mb-16">
            <GeometricPattern className="absolute left-0 top-0 -z-10 h-64 w-64 rotate-90 opacity-10" />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 1,
                ease: [0.21, 1.11, 0.81, 0.99],
              }}
              className="mb-4 text-4xl font-bold text-primary md:mb-6 md:text-5xl lg:text-7xl"
            >
              Roots of Knowledge
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
              }}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-6xl"
            >
              Ma'had Program
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.6,
              }}
              className="mx-auto mt-4 max-w-2xl px-4 text-base leading-relaxed text-muted-foreground md:mt-6 md:text-lg"
            >
              Discover a comprehensive Islamic education program that combines
              traditional knowledge with modern learning approaches.
            </motion.p>
          </div>

          {/* Content */}
          <div className="space-y-8 md:space-y-12">
            {/* Overview Section */}
            <section>
              <Card className="overflow-hidden p-4 md:p-6 lg:p-8">
                <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                  <div className="md:col-span-2">
                    <div className="mb-4 flex items-center gap-3 md:mb-6">
                      <GraduationCap className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-semibold md:text-2xl">
                        Program Overview
                      </h2>
                    </div>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p className="text-sm leading-relaxed md:text-base">
                        Our flagship program offers a structured curriculum in
                        Islamic Studies, Arabic language, and Quranic Sciences.
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
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-6">
                        <div>
                          <h3 className="mb-3 text-base font-medium md:text-lg">
                            What's included
                          </h3>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Comprehensive Islamic Studies
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Arabic Language
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Quranic Sciences
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Islamic History
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Islamic Jurisprudence
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-sm md:text-base">
                                Character Development
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4 text-white dark:bg-slate-800 md:p-6">
                    <h3 className="mb-4 text-base font-medium text-slate-200 md:mb-6 md:text-lg">
                      Full Program Details
                    </h3>
                    <div className="mb-4 text-center md:mb-6">
                      <div className="text-4xl font-bold md:text-6xl">60</div>
                      <div className="text-sm text-slate-300">credit hours</div>
                    </div>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full gap-2 bg-white text-slate-900 hover:bg-slate-100"
                      asChild
                    >
                      <Link href="#curriculum">
                        View Full Curriculum
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="mt-3 text-center text-xs text-slate-400 md:text-sm">
                      Classes held at our Eden Prairie location
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Instructors & Materials */}
            <section className="grid gap-4 md:grid-cols-2 md:gap-6">
              <Card className="p-4 md:p-6">
                <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold md:text-lg">
                    Instructors
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium md:text-base">
                      Sheikh Nuur Hassan
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium md:text-base">
                      Sheikh Abdiaziz Omar
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium md:text-base">
                      Sheikh Ibrahim Ali
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium md:text-base">
                      Sheikh Mustafa Muse
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
                  <Book className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold md:text-lg">
                    Required Materials
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground md:text-sm">
                  <li>
                    Islamic Studies: Islamic University Minnesota curriculum
                  </li>
                  <li>Arabic: Imam University's Arabic Ma'had Books</li>
                </ul>
              </Card>
            </section>

            {/* Academic Calendar */}
            <section>
              <Card className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">
                    Academic Calendar 2024-2025
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {semesters.map((semester, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">{semester.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {semester.dates}
                      </p>
                      {semester.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {semester.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* Curriculum */}
            <section id="curriculum">
              <Card className="p-4 md:p-6 lg:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Book className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold md:text-2xl">
                    Curriculum
                  </h2>
                </div>

                {/* First Year */}
                <div className="space-y-6 md:space-y-8">
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-medium md:text-xl">
                        First Year
                      </h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        30 credits
                      </span>
                    </div>
                    <div className="space-y-4">
                      {firstYearCourses.map((course, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-xl border bg-card/50"
                        >
                          <div className="border-b p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <course.icon className="h-5 w-5 text-primary" />
                              <h4 className="font-medium">{course.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {course.description}
                            </p>
                          </div>
                          <div className="divide-y">
                            {course.detailedCourses.map((detailed, j) => (
                              <div
                                key={j}
                                className="flex items-center justify-between p-3 hover:bg-muted/50"
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                                      {detailed.code}
                                    </code>
                                    <span className="text-xs font-medium md:text-sm">
                                      {detailed.credits} cr
                                    </span>
                                  </div>
                                  <div className="text-sm md:text-base">
                                    {detailed.title}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Second Year */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-medium md:text-xl">
                        Second Year
                      </h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        30 credits
                      </span>
                    </div>
                    <div className="space-y-4">
                      {secondYearCourses.map((course, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-xl border bg-card/50"
                        >
                          <div className="border-b p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <course.icon className="h-5 w-5 text-primary" />
                              <h4 className="font-medium">{course.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {course.description}
                            </p>
                          </div>
                          <div className="divide-y">
                            {course.detailedCourses.map((detailed, j) => (
                              <div
                                key={j}
                                className="flex items-center justify-between p-3 hover:bg-muted/50"
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                                      {detailed.code}
                                    </code>
                                    <span className="text-xs font-medium md:text-sm">
                                      {detailed.credits} cr
                                    </span>
                                  </div>
                                  <div className="text-sm md:text-base">
                                    {detailed.title}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Grading & Assessment */}
            <section>
              <Card className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">
                    Grading & Assessment
                  </h2>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Grade Scale</h3>
                    <div className="space-y-2">
                      {gradeScale.map((grade, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium">{grade.letter}</span>
                          <span className="text-muted-foreground">
                            {grade.range}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-4 text-lg font-medium">
                      Grade Components
                    </h3>
                    <div className="space-y-2">
                      {gradeComponents.map((component, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span>{component.name}</span>
                          <span className="text-muted-foreground">
                            {component.weight}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Student Expectations */}
            <section>
              <Card className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">
                    Student Expectations
                  </h2>
                </div>
                <div className="space-y-6">
                  <p className="text-muted-foreground">
                    Students in the two-year Ma'had Program are expected to
                    maintain high academic and behavioral standards:
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {studentExpectations.map((category, i) => (
                      <div key={i} className="rounded-lg border bg-card p-4">
                        <h3 className="mb-3 text-lg font-medium">
                          {category.title}
                        </h3>
                        <ul className="space-y-2">
                          {category.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="text-muted-foreground">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* CTA */}
            <section className="mt-12 text-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/register">
                  Begin Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
