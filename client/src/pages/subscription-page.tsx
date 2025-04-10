import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface PlanFeature {
  name: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  popular?: boolean;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Set the initial selected plan based on user's current plan
  useEffect(() => {
    if (user) {
      setSelectedPlan(user.plan);
    }
  }, [user]);

  // Mutation for creating a payment intent
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/create-payment-intent", { amount });
      return res.json();
    },
    onSuccess: (data) => {
      // In a real implementation, this would redirect to a checkout page
      // with the client secret from the payment intent
      setIsRedirecting(true);
      toast({
        title: "Processing payment",
        description: "Redirecting to checkout...",
      });
      
      // Simulate redirect
      setTimeout(() => {
        setIsRedirecting(false);
        if (selectedPlan === "premium") {
          toast({
            title: "Subscription successful",
            description: "Your account has been upgraded to Premium",
          });
        }
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment error",
        description: error.message,
        variant: "destructive",
      });
      setIsRedirecting(false);
    },
  });

  const plans: PricingPlan[] = [
    {
      name: "free",
      price: "£0",
      description: "For individual researchers getting started with grant applications",
      features: [
        { name: "5 AI proposal generations per month", included: true },
        { name: "Basic proposal critique", included: true },
        { name: "Grant finder with limited filters", included: true },
        { name: "Basic report templates", included: true },
        { name: "Email support", included: true },
        { name: "Advanced optimization tools", included: false },
        { name: "Unlimited proposals", included: false },
        { name: "Custom grant alerts", included: false },
      ],
      buttonText: "Current Plan",
    },
    {
      name: "premium",
      price: "£29",
      description: "For serious researchers who need comprehensive grant management",
      features: [
        { name: "Unlimited AI proposal generations", included: true },
        { name: "Advanced proposal critique and optimization", included: true },
        { name: "Full grant finder with all filters", included: true },
        { name: "All report templates and customization", included: true },
        { name: "Priority email and chat support", included: true },
        { name: "Advanced optimization tools", included: true },
        { name: "Unlimited proposals", included: true },
        { name: "Custom grant alerts", included: true },
      ],
      buttonText: "Upgrade to Premium",
      popular: true,
    },
    {
      name: "team",
      price: "£99",
      description: "For research teams and organizations with multiple users",
      features: [
        { name: "All Premium features", included: true },
        { name: "5 team member accounts", included: true },
        { name: "Team collaboration tools", included: true },
        { name: "Analytics dashboard", included: true },
        { name: "Dedicated account manager", included: true },
        { name: "API access", included: true },
        { name: "SSO integration", included: true },
        { name: "Custom onboarding", included: true },
      ],
      buttonText: "Contact Sales",
    },
  ];

  const handleSubscribe = (planName: string, amount: number) => {
    setSelectedPlan(planName);
    
    if (planName === "team") {
      // For team plan, we would redirect to a contact sales page
      window.open("mailto:sales@grantflowai.com?subject=Team Plan Inquiry", "_blank");
      return;
    }
    
    if (planName === "premium") {
      createPaymentIntentMutation.mutate(2900); // £29.00
    }
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            Choose the plan that best fits your research needs and enhance your grant success rate with our AI-powered tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`flex flex-col ${plan.popular ? 'border-primary shadow-md' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.price}</CardTitle>
                <CardDescription className="text-lg font-medium mt-1 capitalize">
                  {plan.name} Plan
                </CardDescription>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <span className={`mt-0.5 mr-2 ${feature.included ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                        {feature.included ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-muted-foreground opacity-50" />
                        )}
                      </span>
                      <span className={feature.included ? '' : 'text-muted-foreground line-through opacity-50'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isRedirecting || (user && user.plan === plan.name) || plan.name === "team"}
                  onClick={() => handleSubscribe(plan.name, plan.name === "premium" ? 2900 : 0)}
                >
                  {isRedirecting && selectedPlan === plan.name ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : user && user.plan === plan.name ? (
                    "Current Plan"
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-8">
            <div>
              <h3 className="font-medium text-lg mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade, downgrade, or cancel your subscription at any time through your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">How are AI generations counted?</h3>
              <p className="text-muted-foreground">
                Each unique proposal or report generation counts as one use. Edits to existing generations do not count as additional uses.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">Do you offer academic discounts?</h3>
              <p className="text-muted-foreground">
                Yes, we offer special pricing for academic institutions and non-profit organizations. Contact our sales team for details.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards, PayPal, and bank transfers for annual subscriptions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center bg-secondary/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-2">Need a custom plan?</h2>
          <p className="text-muted-foreground mb-6">
            We offer tailored solutions for larger research institutions and organizations with specific requirements.
          </p>
          <Button size="lg">Contact Our Team</Button>
        </div>
      </div>
    </MainLayout>
  );
}
