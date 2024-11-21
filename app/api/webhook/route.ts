// /api/webhook.js

import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  console.log("Webhook handler invoked");
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`Received event: ${event.type}`);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    if (event.type === 'setup_intent.succeeded') {
      console.log("Handling setup_intent.succeeded event");
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const customerId = setupIntent.customer as string;
      const paymentMethodId = setupIntent.payment_method as string;

      // Retrieve customer metadata if needed
      const customer = await stripe.customers.retrieve(customerId);

      if ((customer as Stripe.DeletedCustomer).deleted) {
        console.error(`Customer ${customerId} has been deleted.`);
        return NextResponse.json(
          { error: "Customer has been deleted" },
          { status: 400 }
        );
      }

      const customerData = customer as Stripe.Customer;
      const metadata = customerData.metadata;

      // Parse the total amount from metadata
      const totalAmount = parseInt(metadata.totalAmount || "0", 10);
      console.log(`Total amount from metadata: ${totalAmount}`);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.error("Invalid total amount");
        return NextResponse.json(
          { error: "Invalid total amount" },
          { status: 400 }
        );
      }

      // Create a Price dynamically
      try {
        console.log(`Creating price for amount: ${totalAmount}`);
        const price = await stripe.prices.create({
          unit_amount: totalAmount * 100, // Amount in cents
          currency: "usd",
          recurring: { interval: "month" },
          product_data: {
            name: "Tutoring Subscription",
          },
        });

        console.log(`Price created: ${price.id}`);

        // Get Unix timestamp for 1st of next month
        const now = new Date();
        const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const billingAnchor = Math.floor(firstOfNextMonth.getTime() / 1000);

        // Create the subscription
        console.log(`Creating subscription for customer ${customerId}`);
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          default_payment_method: paymentMethodId,
          items: [{ price: price.id }],
          billing_cycle_anchor: billingAnchor, // Start billing on 1st of next month
          proration_behavior: 'none',          // No partial charges
          metadata: {
            students: metadata.students || "",
            totalAmount: metadata.totalAmount || "",
          },
        });

        console.log("Subscription created:", subscription.id);
      } catch (error) {
        console.error("Error creating price or subscription:", error);
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}