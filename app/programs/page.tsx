'use client'

import Link from 'next/link'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Book,
  CheckCircle,
  Clock,
  GraduationCap,
  Users,
  AlertTriangle,
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
  { code: 'ISE100', title: 'Islamic Creed 1', credits: 3 },
  { code: 'ISE110', title: 'The History of Islamic Jurisprudence', credits: 3 },
  { code: 'ISE120', title: 'Rules of Quranic Recitation', credits: 3 },
  { code: 'ISE130', title: 'Introduction to Hadeeth Sciences', credits: 3 },
  { code: 'ISE140', title: 'Stories of the Prophets', credits: 3 },
  { code: 'ISE101', title: 'Islamic Creed 2', credits: 3 },
  { code: 'ISE111', title: 'Fiqh of Worship 1', credits: 3 },
  { code: 'ISE121', title: "Introduction to the Qur'anic Studies", credits: 3 },
  { code: 'ISE131', title: 'Purification of the Soul 1', credits: 3 },
  { code: 'ISE141', title: 'Prophetic Biography Makka Period', credits: 3 },
]

const secondYearCourses = [
  { code: 'ISE200', title: 'Prophetic Biography Madina Period', credits: 3 },
  { code: 'ISE210', title: 'Fiqh of Worship 2', credits: 3 },
  {
    code: 'ISE220',
    title: 'Usul At Tafseer - Analytical Quranic 1',
    credits: 3,
  },
  { code: 'ISE230', title: 'Islamic Manners', credits: 3 },
  {
    code: 'ISE240',
    title: 'Usul At Tafseer - Analytical Quranic 2',
    credits: 3,
  },
  {
    code: 'ISE201',
    title: 'The History of the Rightly Guided Caliphs',
    credits: 3,
  },
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
  { code: 'ISE231', title: 'Purification of the Soul 2', credits: 3 },
  { code: 'ISE241', title: 'Introduction to Islamic Education', credits: 3 },
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
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 1,
                ease: [0.21, 1.11, 0.81, 0.99],
              }}
              className="mb-6 text-5xl font-bold text-primary md:text-6xl lg:text-7xl"
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
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
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
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            >
              Discover a comprehensive Islamic education program that combines
              traditional knowledge with modern learning approaches.
            </motion.p>
          </div>

          {/* Content */}
          <div className="space-y-12">
            {/* Overview Section */}
            <section>
              <Card className="overflow-hidden p-6 md:p-8">
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <div className="mb-6 flex items-center gap-3">
                      <GraduationCap className="h-6 w-6 text-primary" />
                      <h2 className="text-2xl font-semibold">
                        Program Overview
                      </h2>
                    </div>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p>
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
                      <div className="mt-8 grid grid-cols-2 gap-6">
                        <div>
                          <h3 className="mb-4 text-lg font-medium">
                            What's included
                          </h3>
                          <ul className="space-y-3">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Comprehensive Islamic Studies</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Arabic Language</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Quranic Sciences</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <ul className="space-y-3">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Islamic History</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Islamic Jurisprudence</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Character Development</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-6 text-white dark:bg-slate-800">
                    <h3 className="mb-6 text-lg font-medium text-slate-200">
                      Full Program Details
                    </h3>
                    <div className="mb-6 text-center">
                      <div className="text-6xl font-bold">60</div>
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
                    <p className="mt-4 text-center text-sm text-slate-400">
                      Classes held at our Eden Prairie location
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Instructors & Materials */}
            <section className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Instructors</h3>
                </div>
                <ul className="space-y-3">
                  <li>
                    <div className="font-medium">Sheikh Ibrahim Ali</div>
                    <div className="text-sm text-muted-foreground">
                      ihanifali18@gmail.com
                    </div>
                  </li>
                  <li>
                    <div className="font-medium">Sheikh Mustafa Muse</div>
                    <div className="text-sm text-muted-foreground">
                      umpp101@gmail.com
                    </div>
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Book className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Required Materials</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
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
            <section>
              <Card className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Book className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">Curriculum</h2>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                  {/* First Year */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium">
                      First Year (30 credits)
                    </h3>
                    <div className="space-y-3">
                      {firstYearCourses.map((course, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{course.code}</span>
                            <span className="text-sm text-muted-foreground">
                              {course.credits} credits
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {course.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Second Year */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium">
                      Second Year (30 credits)
                    </h3>
                    <div className="space-y-3">
                      {secondYearCourses.map((course, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{course.code}</span>
                            <span className="text-sm text-muted-foreground">
                              {course.credits} credits
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {course.title}
                          </p>
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
                  <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-center gap-2 font-medium text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Academic Integrity</span>
                    </div>
                    <p className="mt-2 text-sm text-destructive">
                      Cheating of any kind is strictly prohibited and will
                      result in an automatic zero grade. Multiple violations may
                      lead to program dismissal.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* CTA */}
            <section className="mt-12 text-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/autopay">
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
