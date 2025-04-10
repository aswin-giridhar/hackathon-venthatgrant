import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { LoaderCircle, CheckCircle, XCircle, ArrowRight, BookOpen, Lightbulb, Target, Award, List, PenSquare } from "lucide-react";
import { useState } from "react";
import { MainLayout } from "@/components/ui/layout/main-layout";

// Define schemas for the form
const coachingRequestSchema = z.object({
  grantType: z.string().min(1, { message: "Grant type is required" }),
  orgDescription: z.string().min(10, { message: "Organization description should be at least 10 characters" }),
  projectIdea: z.string().min(10, { message: "Project idea should be at least 10 characters" }),
  pastExperience: z.string().optional(),
  targetAudience: z.string().optional(),
  budget: z.string().optional(),
  challenges: z.string().optional(),
});

type CoachingRequest = z.infer<typeof coachingRequestSchema>;

interface CoachingResponse {
  strategy: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  resources: string[];
}

export default function CoachingPage() {
  const { toast } = useToast();
  const [coachingResponse, setCoachingResponse] = useState<CoachingResponse | null>(null);

  // Define form
  const form = useForm<CoachingRequest>({
    resolver: zodResolver(coachingRequestSchema),
    defaultValues: {
      grantType: "",
      orgDescription: "",
      projectIdea: "",
      pastExperience: "",
      targetAudience: "",
      budget: "",
      challenges: "",
    },
  });

  // Define mutation
  const coachingMutation = useMutation({
    mutationFn: async (data: CoachingRequest) => {
      const response = await apiRequest("POST", "/api/coaching", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Coaching Strategy Generated",
        description: "Your personalized grant writing strategy is ready!",
      });
      setCoachingResponse(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate coaching strategy",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: CoachingRequest) {
    coachingMutation.mutate(data);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Coaching for Grant Writing</h1>
          <p className="text-muted-foreground">
            Get personalized coaching and strategic advice to improve your grant writing approach.
          </p>
        </div>
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Tell us about your grant project</CardTitle>
                <CardDescription>
                  Provide details about your organization and grant needs to receive personalized strategies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="grantType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grant Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Research, Education, Community Development" {...field} />
                          </FormControl>
                          <FormDescription>
                            The type of grant you're applying for
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orgDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Briefly describe your organization, its mission, and structure" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectIdea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Idea</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your project idea and its goals" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Additional Details (Optional)</h3>
                      
                      <FormField
                        control={form.control}
                        name="pastExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Past Experience</FormLabel>
                            <FormControl>
                              <Input placeholder="Any previous grant experience or relevant background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetAudience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Audience</FormLabel>
                            <FormControl>
                              <Input placeholder="Who will benefit from your project" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget</FormLabel>
                            <FormControl>
                              <Input placeholder="Estimated project budget" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="challenges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Challenges</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any specific challenges you're facing" 
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={coachingMutation.isPending}
                    >
                      {coachingMutation.isPending ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          Generating Coaching...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Generate Strategy
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div>
            {coachingMutation.isPending ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing your information and generating coaching advice...</p>
                  <p className="text-sm text-muted-foreground">This may take a minute or two.</p>
                </div>
              </div>
            ) : coachingResponse ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Your Grant Writing Strategy</CardTitle>
                  <CardDescription>
                    Personalized coaching based on your project details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                      <h3 className="text-lg font-medium">Strategy Overview</h3>
                    </div>
                    <p className="text-sm">{coachingResponse.strategy}</p>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="strengths">
                      <AccordionTrigger className="flex items-center">
                        <div className="flex items-center">
                          <Award className="h-5 w-5 mr-2 text-green-500" />
                          <span>Strengths to Highlight</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 ml-7 list-disc">
                          {coachingResponse.strengths.map((strength, index) => (
                            <li key={index} className="text-sm">{strength}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="improvements">
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <Target className="h-5 w-5 mr-2 text-amber-500" />
                          <span>Areas for Improvement</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 ml-7 list-disc">
                          {coachingResponse.improvements.map((improvement, index) => (
                            <li key={index} className="text-sm">{improvement}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="nextSteps">
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <ArrowRight className="h-5 w-5 mr-2 text-blue-500" />
                          <span>Next Steps</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 ml-7 list-disc">
                          {coachingResponse.nextSteps.map((step, index) => (
                            <li key={index} className="text-sm">{step}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="resources">
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <BookOpen className="h-5 w-5 mr-2 text-purple-500" />
                          <span>Recommended Resources</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 ml-7 list-disc">
                          {coachingResponse.resources.map((resource, index) => (
                            <li key={index} className="text-sm">{resource}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      form.reset();
                      setCoachingResponse(null);
                    }}
                  >
                    <PenSquare className="mr-2 h-4 w-4" />
                    Create New Session
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="flex h-full items-center justify-center p-8 border rounded-lg border-dashed">
                <div className="text-center space-y-2">
                  <List className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Your coaching strategy will appear here</h3>
                  <p className="text-sm text-muted-foreground">
                    Fill out the form to get personalized grant writing advice from our AI coach.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}