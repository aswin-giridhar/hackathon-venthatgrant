import { useState } from "react";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  HelpCircleIcon, 
  LifeBuoyIcon, 
  MessageCircleIcon, 
  BookOpenIcon,
  CheckCircleIcon,
  FileTextIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SupportPage() {
  const { toast } = useToast();
  const [contactFormData, setContactFormData] = useState({
    subject: "",
    message: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!contactFormData.subject.trim() || !contactFormData.message.trim() || !contactFormData.email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Support request submitted",
        description: "We'll get back to you as soon as possible.",
      });
      
      // Reset form
      setContactFormData({
        subject: "",
        message: "",
        email: "",
      });
    }, 1000);
  };

  const faqs = [
    {
      question: "How do I find grants matching my organization?",
      answer: "Navigate to the Grant Finder page, where you can filter grants by category, funding amount, deadline, and keywords related to your organization's focus area. You can also use advanced filters to narrow down results based on eligibility criteria, geographical restrictions, and more."
    },
    {
      question: "What information does the AI use to generate proposals?",
      answer: "Our AI uses the grant details combined with your organization profile information to generate tailored proposals. It considers the grant requirements, your organization's mission, past projects, target audience, and specific project ideas you've provided. For best results, ensure your organization profile is complete and provide specific project details when requesting a proposal."
    },
    {
      question: "How can I improve my AI-generated proposals?",
      answer: "After receiving an AI-generated proposal, use our Proposal Critique feature to get detailed feedback. You can also edit the generated content to add more specific information about your organization, include concrete examples of past successes, and tailor the language to better match the grant provider's values and priorities."
    },
    {
      question: "Can I save and edit my proposals?",
      answer: "Yes, all generated proposals are automatically saved to your account. You can access, edit, and export them at any time from the Proposals section. Changes are saved in real-time, and you can create multiple versions of the same proposal to try different approaches."
    },
    {
      question: "How does the subscription plan work?",
      answer: "We offer three tiers: Free, Premium, and Team. The Free plan includes limited grant searches and AI proposal generations. Premium unlocks unlimited proposal generations, advanced grant filtering, and AI coaching. The Team plan adds collaboration features, workflow management, and detailed analytics. You can upgrade or downgrade your plan at any time from the Subscription page."
    },
    {
      question: "How frequently is the grant database updated?",
      answer: "Our grant database is updated daily to ensure you have access to the most current opportunities. We source information directly from grant providers, government databases, and other reliable sources. Each grant listing includes the date it was added or last updated for your reference."
    },
    {
      question: "What support options are available?",
      answer: "Free users can access our documentation, FAQs, and community forums. Premium and Team users receive priority email support with 24-hour response times. Team plan subscribers also get access to scheduled consultation calls with our grant experts."
    }
  ];

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">
          Get help with VenThatGrant and learn how to make the most of our platform
        </p>
      </div>

      <Tabs defaultValue="faqs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="faqs">
            <HelpCircleIcon className="mr-2 h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="contact">
            <MessageCircleIcon className="mr-2 h-4 w-4" />
            Contact Support
          </TabsTrigger>
          <TabsTrigger value="documentation">
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircleIcon className="mr-2 h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions about VenThatGrant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LifeBuoyIcon className="mr-2 h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Get in touch with our support team for personalized assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contactFormData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="subject" className="block text-sm font-medium">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="What's your inquiry about?"
                    value={contactFormData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="block text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Describe your issue or question in detail..."
                    rows={6}
                    value={contactFormData.message}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>Submitting...</>
                    ) : (
                      <>Submit Support Request</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alternative Support Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <MessageCircleIcon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Live Chat Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Premium and Team plan users can access live chat support during business hours.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <LifeBuoyIcon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Team plan users can schedule phone consultations with our grant experts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpenIcon className="mr-2 h-5 w-5" />
                Documentation & Guides
              </CardTitle>
              <CardDescription>
                Learn how to use VenThatGrant effectively with our comprehensive guides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <FileTextIcon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium text-lg">Getting Started Guide</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Learn the basics of VenThatGrant and set up your account
                        </p>
                        <div className="flex items-center mt-4 text-xs text-muted-foreground">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          <span>5 min read</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <FileTextIcon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium text-lg">Finding the Right Grants</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Master the Grant Finder and optimize your search results
                        </p>
                        <div className="flex items-center mt-4 text-xs text-muted-foreground">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          <span>7 min read</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <FileTextIcon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium text-lg">AI Proposal Generation</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Learn how to get the best results from our AI proposal tools
                        </p>
                        <div className="flex items-center mt-4 text-xs text-muted-foreground">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          <span>10 min read</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <FileTextIcon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium text-lg">Improving Proposal Success</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Advanced techniques for optimizing grant proposals
                        </p>
                        <div className="flex items-center mt-4 text-xs text-muted-foreground">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          <span>12 min read</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}