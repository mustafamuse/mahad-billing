// EnrollmentForm.jsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Appearance, loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StudentSelect } from "./student-select";
import { PaymentOptions } from "./payment-options";
import { PayerInformation } from "./payer-information";
import { useToast } from "@/components/ui/use-toast";
import { Student } from "@/lib/types";
import { calculateTotal } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { StripePaymentForm } from "./stripe-payment-form";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const formSchema = z.object({
  students: z.array(z.string()).min(1, "Please select at least one student"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function EnrollmentForm() {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();
  const { toast } = useToast();
  const router = useRouter();
  const [formData, setFormData] = useState<FormValues>();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      students: [],
      termsAccepted: false,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsProcessing(true);
      setFormData(values);

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
      });

      if (!response.ok) {
        throw new Error("Failed to create SetupIntent");
      }

      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (error) {
      console.error("Enrollment error:", error);
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }

  const appearance: Appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0F172A',
    },
  };

  return (
    <div className="space-y-8">
      {!clientSecret ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-8 p-6 bg-card rounded-lg shadow-lg">
              <StudentSelect
                form={form}
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
              />
              
              <PaymentOptions total={calculateTotal(selectedStudents)} />
              
              <PayerInformation form={form} />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...form.register("termsAccepted")}
                    id="terms"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">
                      Terms and Conditions
                    </a>{" "}
                    and authorize monthly charges for the tutoring program.
                  </label>
                </div>
                {form.formState.errors.termsAccepted && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.termsAccepted.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Continue to Payment"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
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
            customerName={`${formData?.firstName} ${formData?.lastName}`}
            customerEmail={formData?.email || ''}
            onSuccess={() => router.push("/payment-success")}
            onError={(error) => {
              toast({
                title: "Payment Failed",
                description: error.message,
                variant: "destructive",
              });
              setClientSecret(undefined);
              setIsProcessing(false);
            }}
          />
        </Elements>
      )}
    </div>
  );
}
