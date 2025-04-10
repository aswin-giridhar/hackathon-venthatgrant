import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { createLazyComponent } from "./lib/lazy-loader";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth";

// Eagerly loaded components - essential for initial render
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";

// Lazily loaded components - loaded on demand
const DashboardPage = createLazyComponent(() => import("@/pages/dashboard-page"), {
  preload: true // Preload dashboard as it's commonly accessed
});

const GrantFinderPage = createLazyComponent(() => import("@/pages/grant-finder-page"));
const SavedGrantsPage = createLazyComponent(() => import("@/pages/saved-grants-page"));
const ProposalPreparationPage = createLazyComponent(() => import("@/pages/proposal-preparation-page"));
const ProposalCritiquePage = createLazyComponent(() => import("@/pages/proposal-critique-page"));
const GrantReportingPage = createLazyComponent(() => import("@/pages/grant-reporting-page"));
const SubscriptionPage = createLazyComponent(() => import("@/pages/subscription-page"));
const BillingPage = createLazyComponent(() => import("@/pages/billing-page"));
const CoachingPage = createLazyComponent(() => import("@/pages/coaching-page"));
const SettingsPage = createLazyComponent(() => import("@/pages/settings-page"));
const ProfilePage = createLazyComponent(() => import("@/pages/profile-page"));
const SupportPage = createLazyComponent(() => import("@/pages/support-page"));

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {user ? <DashboardPage /> : <HomePage />}
      </Route>
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/grant-finder" component={GrantFinderPage} />
      <ProtectedRoute path="/saved-grants" component={SavedGrantsPage} />
      <ProtectedRoute path="/proposal-preparation" component={ProposalPreparationPage} />
      <ProtectedRoute path="/proposal-critique" component={ProposalCritiquePage} />
      <ProtectedRoute path="/grant-reporting" component={GrantReportingPage} />
      <ProtectedRoute path="/coaching" component={CoachingPage} />
      <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/support" component={SupportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
