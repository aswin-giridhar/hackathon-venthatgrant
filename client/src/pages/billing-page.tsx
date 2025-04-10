import { useState, useEffect } from "react";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  CreditCardIcon,
  ReceiptIcon,
  HistoryIcon
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { loadStripe } from "@stripe/stripe-js";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
let stripePromise: Promise<any>;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
}

const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    billing: "forever",
    features: [
      "3 AI proposal generations per month",
      "Basic grant search",
      "Limited templates",
      "Community support"
    ],
    action: "Current Plan"
  },
  {
    id: "premium",
    name: "Premium",
    price: "$29",
    billing: "per month",
    features: [
      "Unlimited AI proposal generations",
      "Advanced grant search & filtering",
      "All templates & custom branding",
      "Priority email support",
      "Real-time proposal reviews"
    ],
    action: "Upgrade"
  },
  {
    id: "team",
    name: "Team",
    price: "$79",
    billing: "per month",
    features: [
      "Everything in Premium",
      "Up to 5 team members",
      "Team collaboration tools",
      "Analytics & reporting",
      "Dedicated account manager",
      "Custom integration options"
    ],
    action: "Upgrade"
  }
];

// No mock data - use real data from Stripe

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Debug user data
  useEffect(() => {
    if (user) {
      console.log("User data:", user);
      const userData = user.success ? user.data : user;
      console.log("Is admin?", userData.isAdmin);
    }
  }, [user]);
  const [activeTab, setActiveTab] = useState("subscription");
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Current subscription plan based on user data
  const userData = user?.success ? user.data : user;
  const userPlanId = userData?.plan || "free";
  
  // Get subscription details
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: !!user,
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/subscription");
        return await response.json();
      } catch (error) {
        // Return a default subscription if API fails
        return { 
          status: "active", 
          planId: userPlanId, 
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false
        };
      }
    }
  });
  
  // Handle subscription change
  const handleSubscriptionChange = async (planId: string) => {
    if (planId === userPlanId) {
      return;
    }
    
    setSelectedPlan(planId);
    setLoading(true);
    
    try {
      // Create checkout session
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        priceId: planId,
        isYearly: yearlyBilling
      });
      
      const { sessionId } = await response.json();
      
      // Redirect to Stripe checkout
      const stripe = await getStripe();
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  // Handle cancellation
  const handleCancelSubscription = async () => {
    setLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      const data = await response.json();
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the current billing period."
      });
      
      // Refresh subscription data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format subscription end date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case "canceled":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Ending Soon</Badge>;
      case "past_due":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and payment methods
        </p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoice-history">Invoice History</TabsTrigger>
        </TabsList>
        
        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your current subscription plan and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium">{
                    SUBSCRIPTION_PLANS.find(plan => plan.id === userPlanId)?.name || "Free"
                  }</h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionData?.status === "active" 
                      ? "Your subscription is active" 
                      : subscriptionData?.cancelAtPeriodEnd 
                        ? "Your subscription will end on the current billing period" 
                        : "No active subscription"}
                  </p>
                  <div className="mt-2">
                    {subscriptionData && getStatusBadge(subscriptionData.status || "active")}
                  </div>
                </div>
                <div className="text-right">
                  {subscriptionData?.currentPeriodEnd && (
                    <div>
                      <p className="text-sm text-muted-foreground">Current period ends</p>
                      <p className="font-medium">{formatDate(subscriptionData.currentPeriodEnd)}</p>
                    </div>
                  )}
                  {subscriptionData?.status === "active" && !subscriptionData?.cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleCancelSubscription}
                      disabled={loading || userPlanId === "free"}
                    >
                      Cancel Plan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Available Plans */}
          <div className="flex justify-end items-center space-x-2 mb-4">
            <Label htmlFor="yearly-billing">Monthly</Label>
            <Switch
              id="yearly-billing"
              checked={yearlyBilling}
              onCheckedChange={setYearlyBilling}
            />
            <Label htmlFor="yearly-billing" className="flex items-center">
              Yearly
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Save 20%
              </Badge>
            </Label>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card key={plan.id} className={`relative ${userPlanId === plan.id ? 'border-primary' : ''}`}>
                {userPlanId === plan.id && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge>Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">{yearlyBilling && plan.id !== "free" 
                      ? `$${parseInt(plan.price.replace('$', '')) * 10}`
                      : plan.price}</span>
                    <span className="text-muted-foreground ml-1">
                      {plan.id === "free" ? plan.billing : yearlyBilling ? "per year" : plan.billing}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2 list-disc pl-5">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm">{feature}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={userPlanId === plan.id ? "outline" : "default"}
                    disabled={loading || userPlanId === plan.id}
                    onClick={() => handleSubscriptionChange(plan.id)}
                  >
                    {userPlanId === plan.id ? "Current Plan" : `Get ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Test Account Button - Only visible for admins */}
          {((user?.success ? user.data : user)?.isAdmin) && (
            <Card className="mt-8 bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Create Test Account</CardTitle>
                <CardDescription>
                  Activate premium features for testing without payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get access to all premium features without requiring a real payment. 
                  This is for testing purposes only. The test account will be active for 1 year.
                </p>
                <Button 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await apiRequest("POST", "/api/create-test-account");
                      const data = await response.json();
                      
                      toast({
                        title: "Test Account Created",
                        description: "You now have access to premium features for testing.",
                      });
                      
                      // Refresh the page to reflect changes
                      window.location.reload();
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to create test account. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || userPlanId === "premium" || userPlanId === "team"}
                >
                  Create Test Account
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your saved payment methods
                </CardDescription>
              </div>
              <Button variant="outline">
                <CreditCardIcon className="w-4 h-4 mr-2" />
                Add New Method
              </Button>
            </CardHeader>
            <CardContent>
              {false ? ( // Only show real payment methods from Stripe
                <div className="space-y-4">
                  {/* Payment methods will be displayed here when fetched from Stripe */}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCardIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No payment methods found</p>
                  <Button className="mt-4" variant="outline">
                    Add New Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Invoice History Tab */}
        <TabsContent value="invoice-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {false ? ( // Only show real invoices from Stripe
                <Table>
                  <TableCaption>A list of your recent invoices.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Invoices will be displayed here when fetched from Stripe */}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No invoice history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}