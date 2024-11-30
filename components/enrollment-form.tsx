"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Appearance, loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Student } from "@/lib/types"
import { calculateTotal, calculateStudentPrice } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { StripePaymentForm } from "./stripe-payment-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Steps, Step } from "@/components/ui/steps"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { STUDENTS } from "@/lib/data"
import { Check, ChevronsUpDown, GraduationCap, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TermsModal } from "@/components/terms-modal"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface EnrollmentResponse {
  clientSecret: string
}

export function EnrollmentForm() {
  const [step, setStep] = React.useState(1)
  const [open, setOpen] = React.useState(false)
  const [selectedStudents, setSelectedStudents] = React.useState<Student[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [clientSecret, setClientSecret] = React.useState<string>()
  const [termsModalOpen, setTermsModalOpen] = React.useState(false)
  const [hasViewedTerms, setHasViewedTerms] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const formSchema = z.object({
    students: z.array(z.string()).min(1, "Please select at least one student"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    termsAccepted: z.boolean()
      .refine((val) => val === true, {
        message: "You must accept the terms and conditions",
      })
      .refine(() => hasViewedTerms, {
        message: "Please review the Terms and Conditions before accepting",
      }),
  })

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      students: [],
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      termsAccepted: false,
    },
    mode: "onChange"
  })

  const handleStudentSelect = (student: Student) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      const newStudents = [...selectedStudents, student]
      setSelectedStudents(newStudents)
      form.setValue("students", newStudents.map(s => s.id), {
        shouldValidate: true
      })
    }
    setOpen(false)
  }

  const handleStudentRemove = (studentId: string) => {
    const newStudents = selectedStudents.filter(s => s.id !== studentId)
    setSelectedStudents(newStudents)
    form.setValue("students", newStudents.map(s => s.id), {
      shouldValidate: true
    })
  }

  const handleContinue = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one student",
        variant: "destructive",
      })
      return
    }
    setStep(2)
  }

  async function onSubmit(values: FormValues) {
    if (step === 1) {
      handleContinue()
      return
    }

    try {
      setIsProcessing(true)

      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: calculateTotal(selectedStudents),
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          students: selectedStudents,
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to create SetupIntent")
      }

      const { clientSecret } = await response.json() as EnrollmentResponse
      setClientSecret(clientSecret)
      setStep(3)
    } catch (error) {
      console.error("Enrollment error:", error)
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const appearance: Appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0F172A',
      fontFamily: 'Inter var, sans-serif',
      borderRadius: '0.5rem',
      fontWeightNormal: '400',
      fontWeightBold: '600',
      colorBackground: '#fff',
      colorText: '#0F172A',
      colorDanger: '#ef4444',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e2e8f0',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: '2px solid #0F172A',
        boxShadow: 'none',
      },
      '.Label': {
        fontWeight: '500',
        color: '#475569',
      },
      '.Error': {
        color: '#ef4444',
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-2 sm:p-4 space-y-6 sm:space-y-8">
      <Steps className="mb-6 sm:mb-8">
        <Step isActive={step === 1}>Select Students</Step>
        <Step isActive={step === 2}>Payment Details</Step>
      </Steps>

      {clientSecret ? (
        <Card className="border-0 sm:border">
          <CardContent className="p-4 sm:p-6">
            <Elements 
              stripe={stripePromise} 
              options={{
                clientSecret,
                appearance,
                loader: "auto",
              }}
            >
              <StripePaymentForm 
                clientSecret={clientSecret}
                customerName={`${form.getValues("firstName")} ${form.getValues("lastName")}`}
                customerEmail={form.getValues("email")}
                onSuccess={() => router.push("/payment-success")}
                onError={(error) => {
                  toast({
                    title: "Payment Setup Failed",
                    description: "There was an issue connecting your bank account. Please try again.",
                    variant: "destructive",
                  })
                  
                  setClientSecret(undefined)
                  setIsProcessing(false)
                  
                  setStep(2)
                  
                  console.error("Bank connection error:", error)
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
            {step === 1 && (
              <Card className="border-0 sm:border">
                <CardHeader className="p-4 sm:p-6 space-y-2">
                  <CardTitle className="text-xl sm:text-2xl">Select Your Name</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Choose the students you want to enroll in the tutoring program
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="students"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-4">
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={open}
                                  className="w-full justify-between h-12 sm:h-10"
                                >
                                  <span className="text-muted-foreground text-sm sm:text-base truncate">
                                    Search students...
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                  <div className="flex items-center border-b px-3">
                                    <Search className="h-4 w-4 shrink-0 opacity-50" />
                                    <CommandInput 
                                      placeholder="Type a name to search..." 
                                      className="h-12 sm:h-11 flex-1 text-base sm:text-sm" 
                                    />
                                  </div>
                                  <CommandEmpty>No student found.</CommandEmpty>
                                  <CommandGroup className="max-h-[300px] overflow-auto p-1">
                                    {STUDENTS.map((student) => (
                                      <CommandItem
                                        key={student.id}
                                        onSelect={() => handleStudentSelect(student)}
                                        className="py-3 sm:py-2 px-2 text-base sm:text-sm"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedStudents.find(s => s.id === student.id)
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {student.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            <FormMessage />

                            <div className="space-y-3">
                              {selectedStudents.map((student) => {
                                const { price } = calculateStudentPrice(student)
                                return (
                                  <div
                                    key={student.id}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm sm:text-base">{student.name}</span>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {student.familyId ? (
                                          <>
                                            <span className="text-xs sm:text-sm text-muted-foreground line-through">${student.monthlyRate}</span>
                                            <span className="text-xs sm:text-sm font-medium">${price}</span>
                                            <Badge variant="secondary" className="text-xs">Family Discount</Badge>
                                          </>
                                        ) : (
                                          <span className="text-xs sm:text-sm font-medium">${student.monthlyRate}</span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStudentRemove(student.id)}
                                      className="h-8 w-8"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>

                            {selectedStudents.length > 0 && (
                              <div className="pt-4 border-t space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Total Students Selected</span>
                                  <span className="font-medium">{selectedStudents.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm sm:text-base">Your Monthly Tuition Total</span>
                                  <div className="text-right">
                                    <span className="text-lg sm:text-xl font-bold">${calculateTotal(selectedStudents)}</span>
                                    <span className="block text-xs sm:text-sm text-muted-foreground">per month</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="p-4 sm:p-6">
                  <Button 
                    type="button"
                    className="w-full h-12 text-base font-medium" 
                    disabled={selectedStudents.length === 0}
                    onClick={handleContinue}
                  >
                    Continue to Payment Details
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 2 && (
              <Card className="border-0 sm:border">
                <CardHeader className="p-4 sm:p-6 space-y-2">
                  <CardTitle className="text-xl sm:text-2xl">Payment Information</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Enter your payment details to complete enrollment
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Your First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Your Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Your Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Your WhatsApp Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Enter phone number" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              if (checked && !hasViewedTerms) {
                                setTermsModalOpen(true)
                                return
                              }
                              field.onChange(checked)
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-base font-normal">
                            I agree to the{" "}
                            <Button
                              variant="link"
                              className="h-auto p-0 text-primary underline decoration-primary underline-offset-4 hover:text-primary/80"
                              onClick={(e) => {
                                e.preventDefault()
                                setTermsModalOpen(true)
                              }}
                            >
                              Terms and Conditions
                            </Button>
                            {!hasViewedTerms && (
                              <span className="ml-1 text-xs text-muted-foreground">(click to review)</span>
                            )}
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-12 text-base font-medium" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-white text-black hover:bg-gray-100"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Confirm and Proceed to Payment"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </form>
        </Form>
      )}

      <TermsModal 
        open={termsModalOpen}
        onOpenChange={(open) => {
          setTermsModalOpen(open)
          if (!open && !hasViewedTerms) {
            form.setValue("termsAccepted", false)
          }
        }}
        onAgree={() => {
          setHasViewedTerms(true)
          form.setValue("termsAccepted", true, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
        }}
      />
    </div>
  )
}
