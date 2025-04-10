import { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize Stripe with API key
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
if (!stripeApiKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will not work properly.');
}
// Using latest API version available as of April 2025
const stripe = new Stripe(stripeApiKey || '', {
  apiVersion: "2025-03-31.basil" as any,
});

// Price ID constants for different subscription tiers
const SUBSCRIPTION_PRICES = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_ID, // Fallback to legacy STRIPE_PRICE_ID
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID
  },
  team: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID
  }
};

export function setupStripe(app: Express) {
  // Create a testing account without payment requirement
  app.post("/api/create-test-account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user!;
      
      // Update the user to have premium plan features without requiring payment
      await db.update(users)
        .set({ 
          plan: "premium", 
          planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        })
        .where(eq(users.id, user.id));
      
      // Create an activity log
      await storage.createActivity({
        userId: user.id,
        type: "account_upgraded",
        description: "Test account upgraded to Premium (No payment required)"
      });
      
      res.json({ 
        success: true, 
        message: "Test account created successfully with Premium features", 
        plan: "premium",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating test account: " + error.message });
    }
  });
  // Create a payment intent for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { amount } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: "Amount is required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user!.id.toString(),
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Create a subscription for recurring payments
  app.post("/api/get-or-create-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user!;
      
      // If user already has a subscription, retrieve it
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Get the payment intent client secret if available
        let clientSecret: string | undefined;
        if (typeof subscription.latest_invoice === 'string') {
          // If it's just the ID, we need to retrieve the invoice
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice, {
            expand: ['payment_intent']
          });
          
          // Access payment_intent from the invoice (using any to bypass type checking)
          const paymentIntent = (invoice as any).payment_intent;
          clientSecret = paymentIntent?.client_secret;
        } else {
          // If it's an expanded invoice object, access payment_intent
          const expandedInvoice = subscription.latest_invoice as any;
          const paymentIntent = expandedInvoice?.payment_intent;
          clientSecret = paymentIntent?.client_secret;
        }
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
        });
        
        return;
      }
      
      // Create a new customer if needed
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        
        stripeCustomerId = customer.id;
      }
      
      // Create a subscription with the appropriate price
      const priceId = process.env.STRIPE_PRICE_ID;
      
      if (!priceId) {
        return res.status(500).json({ message: "Stripe price ID not configured" });
      }
      
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });
      
      // Update user with Stripe information
      await storage.updateStripeInfo(
        user.id, 
        stripeCustomerId, 
        subscription.id
      );
      
      // Get the payment intent client secret from the expanded invoice
      let clientSecret: string | undefined;
      if (typeof subscription.latest_invoice === 'string') {
        // If it's just the ID, we need to retrieve the invoice
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice, {
          expand: ['payment_intent']
        });
        
        // Access payment_intent from the invoice (using any to bypass type checking)
        const paymentIntent = (invoice as any).payment_intent;
        clientSecret = paymentIntent?.client_secret;
      } else {
        // If it's an expanded invoice object, access payment_intent
        const expandedInvoice = subscription.latest_invoice as any;
        const paymentIntent = expandedInvoice?.payment_intent;
        clientSecret = paymentIntent?.client_secret;
      }
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Get current subscription details
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user!;
      
      if (!user.stripeSubscriptionId) {
        return res.json({
          status: "inactive",
          planId: user.plan || "free"
        });
      }
      
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      return res.json({
        status: subscription.status,
        planId: user.plan || "free",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error retrieving subscription: " + error.message 
      });
    }
  });
  
  // Cancel subscription (will end at current period end)
  app.post("/api/cancel-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user!;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }
      
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      return res.json({
        status: "canceled",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error canceling subscription: " + error.message 
      });
    }
  });
  
  // Create a checkout session for subscription management
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { priceId, isYearly } = req.body;
      const user = req.user!;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }
      
      // Determine which price ID to use based on plan and billing cycle
      let actualPriceId;
      
      if (priceId === "premium") {
        actualPriceId = isYearly 
          ? SUBSCRIPTION_PRICES.premium.yearly 
          : SUBSCRIPTION_PRICES.premium.monthly;
      } else if (priceId === "team") {
        actualPriceId = isYearly 
          ? SUBSCRIPTION_PRICES.team.yearly 
          : SUBSCRIPTION_PRICES.team.monthly;
      } else {
        // If a specific price ID was provided, use that
        actualPriceId = priceId;
      }
      
      if (!actualPriceId) {
        return res.status(400).json({ 
          message: "Invalid price ID or pricing not configured for this plan" 
        });
      }
      
      // Create or get customer
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        
        stripeCustomerId = customer.id;
        
        // Update user with customer ID
        await storage.updateUser(user.id, { stripeCustomerId });
      }
      
      // Create the checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: actualPriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/billing?success=true`,
        cancel_url: `${req.headers.origin}/billing?canceled=true`,
        metadata: {
          userId: user.id.toString(),
        },
      });
      
      res.json({ sessionId: session.id });
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error creating checkout session: " + error.message 
      });
    }
  });
  
  // Get payment methods
  app.get("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user!;
      
      if (!user.stripeCustomerId) {
        return res.json({ paymentMethods: [] });
      }
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });
      
      res.json({ 
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year
        }))
      });
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error retrieving payment methods: " + error.message 
      });
    }
  });
  
  // Get invoice history
  app.get("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user!;
      
      if (!user.stripeCustomerId) {
        return res.json({ invoices: [] });
      }
      
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });
      
      res.json({ 
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          date: new Date(invoice.created * 1000).toISOString(),
          amount: (invoice.total / 100).toFixed(2),
          currency: invoice.currency,
          status: invoice.status,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          pdfUrl: invoice.invoice_pdf
        }))
      });
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error retrieving invoices: " + error.message 
      });
    }
  });

  // Webhook to handle Stripe events
  app.post("/api/webhook", async (req, res) => {
    const payload = req.body;
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      if (endpointSecret) {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      } else {
        event = payload;
      }
      
      // Handle the event
      switch (event.type) {
        case "invoice.payment_succeeded":
          const invoice = event.data.object as any; // Use any to avoid type checking issues
          // Update user subscription status if needed
          const invoiceSubscriptionId = typeof invoice.subscription === 'string' ? 
            invoice.subscription : 
            (invoice.subscription?.id || null);
            
          if (invoiceSubscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(invoiceSubscriptionId);
            const customerId = typeof subscription.customer === 'string' ? 
              subscription.customer : 
              (subscription.customer as Stripe.Customer).id;
              
            // Find user by customer ID directly from database
            try {
              // Query database for user with this stripe customer ID
              // Query directly with a proper SQL condition 
              const matchingUsers = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
              const matchingUser = matchingUsers.length > 0 ? matchingUsers[0] : undefined;
              
              if (matchingUser) {
                await storage.updateUser(matchingUser.id, { plan: "premium" });
              }
            } catch (dbError) {
              console.error("Database error in webhook handler:", dbError);
            }
          }
          break;
          
        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string' ? 
            subscription.customer : 
            (subscription.customer as Stripe.Customer).id;
          
          // Find user by customer ID directly from database
          try {
            // Query database for user with this stripe customer ID
            // Query directly with a proper SQL condition
            const matchingUsers = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
            const matchingUser = matchingUsers.length > 0 ? matchingUsers[0] : undefined;
            
            if (matchingUser) {
              await storage.updateUser(matchingUser.id, { plan: "free" });
            }
          } catch (dbError) {
            console.error("Database error in webhook handler:", dbError);
          }
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error: any) {
      res.status(400).json({ message: `Webhook error: ${error.message}` });
    }
  });
}
