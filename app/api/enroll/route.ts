import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("API: Received request body:", body);

    const { total, email, firstName, lastName, phone, students } = body;

    // Create a Stripe Customer
    const customer = await stripe.customers.create({
      email: email,
      name: `${firstName} ${lastName}`,
      phone: phone,
      metadata: {
        students: JSON.stringify(students),
        totalAmount: total.toString(),
      },
    });

    console.log(`Stripe Customer Created: 
    ID: ${customer.id}, 
    Email: ${email}, 
    Name: ${firstName} ${lastName}, 
    Phone: ${phone}, 
    Total Amount: ${total}, 
    Students: ${students
      .map((student: { name: string }) => student.name)
      .join(", ")}`);

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          verification_method: "instant",
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Error creating SetupIntent:", error);
    return NextResponse.json(
      { error: "Failed to create SetupIntent" },
      { status: 500 }
    );
  }
}