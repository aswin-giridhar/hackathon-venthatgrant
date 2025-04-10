import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { LoginForm } from '@/components/ui/auth/login-form';
import { RegisterForm } from '@/components/ui/auth/register-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileEdit, BarChart3, FileText } from 'lucide-react';

export default function AuthPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Auth Form Column */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center">
              <div className="h-10 w-10 rounded-md bg-gradient-to-r from-primary to-emerald-500 flex items-center justify-center text-white font-bold text-2xl mr-3">
                V
              </div>
              <span className="text-2xl font-semibold">VenThatGrant</span>
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to your account or create a new one
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm 
                    onSuccess={() => setLocation('/dashboard')}
                  />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm 
                    onSuccess={() => setLocation('/dashboard')}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hero Column */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
        <div className="max-w-xl mx-auto flex flex-col justify-center p-12">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold tracking-tight">
              Streamline Your Grant Management with AI
            </h2>
            <p className="text-xl text-white/80">
              Find grants, generate proposals, optimize research, and meet reporting requirements - all powered by AI.
            </p>

            <div className="grid grid-cols-1 gap-4 mt-8">
              <div className="flex space-x-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Find Relevant Grants</h3>
                  <p className="text-white/70">
                    Discover grants that match your research profile and expertise
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <FileEdit className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">AI-Powered Proposals</h3>
                  <p className="text-white/70">
                    Generate high-quality research proposals tailored to requirements
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Track Your Success</h3>
                  <p className="text-white/70">
                    Monitor your grant activities and improve success rates
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Simplified Reporting</h3>
                  <p className="text-white/70">
                    Generate comprehensive reports to meet funder requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
