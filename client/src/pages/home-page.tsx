import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/ui/auth/auth-modal";
import { Header } from "@/components/ui/layout/header";
import {
  SearchIcon,
  FileEditIcon,
  FileSearchIcon,
  FileTextIcon,
  PlayCircleIcon,
  ArrowRightIcon,
  Star,
  BarChart3,
  Search,
  FileEdit,
  FileText,
} from "lucide-react";

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-primary-900 overflow-hidden mb-12">
          <div className="absolute inset-0 bg-grid-white/[0.2] [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))]"></div>
          <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 sm:px-6 lg:px-8 text-center sm:text-left">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 items-center">
              <div className="lg:col-span-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Streamline Your Grant Process with AI
                </h1>
                <p className="text-lg sm:text-xl text-white font-semibold mb-8 max-w-3xl">
                  Find, create, and optimize research proposals with our AI-powered platform. Get matched with the perfect grants for your needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                  <Button 
                    size="lg" 
                    onClick={() => setIsAuthModalOpen(true)} 
                    className="bg-white text-primary-700 hover:bg-gray-50"
                  >
                    Get Started
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white border-opacity-25 text-white bg-white bg-opacity-10 hover:bg-opacity-20"
                  >
                    <PlayCircleIcon className="mr-2 h-5 w-5" />
                    Watch Demo
                  </Button>
                </div>
              </div>
              
              <div className="hidden lg:block lg:col-span-2 mt-10 lg:mt-0">
                <div className="relative h-full">
                  <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 h-64 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden rotate-6 z-10">
                    <div className="h-full p-4 flex flex-col">
                      <div className="text-xs font-medium text-green-500 mb-1">OPEN FOR APPLICATIONS</div>
                      <h4 className="text-sm font-semibold mb-1">Research Innovation Fund</h4>
                      <p className="text-xs text-muted-foreground mb-2">Deadline: Oct 15, 2023</p>
                      <div className="flex items-center mb-3">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs text-blue-600">UK</span>
                        </div>
                        <span className="text-xs ml-1">UKRI</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 flex-grow">Supporting innovative research projects with funding up to £500,000...</p>
                      <Button size="sm" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </div>
                  <div className="absolute -right-4 top-1/3 transform -translate-y-1/2 h-64 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden -rotate-3">
                    <div className="h-full p-4 flex flex-col">
                      <div className="text-xs font-medium text-amber-500 mb-1">CLOSING SOON</div>
                      <h4 className="text-sm font-semibold mb-1">Global Health Initiative</h4>
                      <p className="text-xs text-muted-foreground mb-2">Deadline: Sep 30, 2023</p>
                      <div className="flex items-center mb-3">
                        <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-xs text-green-600">GF</span>
                        </div>
                        <span className="text-xs ml-1">Gates Foundation</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 flex-grow">Addressing critical health challenges in developing regions...</p>
                      <Button size="sm" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How VenThatGrant Works
              </h2>
              <p className="mt-4 max-w-2xl text-xl text-muted-foreground mx-auto">
                Our AI-powered platform simplifies every step of the grant process
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 flex items-center justify-center bg-primary/10 text-primary rounded-lg mb-4">
                    <SearchIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Find Grants</h3>
                  <p className="text-muted-foreground">
                    Discover relevant funding opportunities tailored to your research area and eligibility criteria.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-lg mb-4">
                    <FileEditIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Generate Proposals</h3>
                  <p className="text-muted-foreground">
                    Create compelling research proposals using our AI assistant to match grant requirements.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400 rounded-lg mb-4">
                    <FileSearchIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Optimize Research</h3>
                  <p className="text-muted-foreground">
                    Get expert critique and optimization of your research proposals to increase success rates.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400 rounded-lg mb-4">
                    <FileTextIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Manage Reporting</h3>
                  <p className="text-muted-foreground">
                    Generate comprehensive grant reports and track progress with structured templates.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="py-12 bg-secondary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              Success Stories
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground mb-4">
                    "VenThatGrant helped us secure a major UKRI grant by identifying opportunities we weren't aware of and optimizing our proposal with targeted feedback."
                  </blockquote>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">SJ</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Dr. Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">University of Cambridge</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                    ))}
                    <Star className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <blockquote className="text-muted-foreground mb-4">
                    "The critique feature was invaluable. It highlighted weaknesses in our methodology that we were able to address before submission, likely saving us from rejection."
                  </blockquote>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">ML</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Prof. Michael Lee</p>
                      <p className="text-xs text-muted-foreground">Oxford University</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground mb-4">
                    "As a small research organization, we couldn't afford specialized grant writers. VenThatGrant enabled us to compete with larger institutions and win significant funding."
                  </blockquote>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">AP</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Dr. Ahmed Patel</p>
                      <p className="text-xs text-muted-foreground">TechFuture Research</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl overflow-hidden">
              <div className="px-6 py-12 sm:px-12 lg:py-16">
                <div className="max-w-3xl">
                  <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                    Ready to increase your grant success rate?
                  </h2>
                  <p className="mt-4 text-lg text-primary-100">
                    Join thousands of researchers who use VenThatGrant to find relevant funding opportunities and create winning proposals.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg" 
                      onClick={() => setIsAuthModalOpen(true)} 
                      className="bg-white text-primary-700 hover:bg-gray-50"
                    >
                      Get started for free
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-transparent text-white bg-primary-700 bg-opacity-60 hover:bg-opacity-70"
                    >
                      Schedule a demo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-background border-t">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Security</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Resources
              </h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Blog</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Guides</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Webinars</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Company
              </h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Careers</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Partners</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Legal
              </h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Terms</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">Cookie Policy</a></li>
                <li><a href="#" className="text-base text-muted-foreground hover:text-foreground">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <p className="text-base text-muted-foreground">
              &copy; {new Date().getFullYear()} VenThatGrant. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
