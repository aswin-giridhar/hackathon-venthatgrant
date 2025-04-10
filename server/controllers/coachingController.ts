import { Request, Response } from "express";
import { getGrantWritingCoaching, CoachingRequest } from "../services/coachingService";
import { z } from "zod";

// Zod schema for request validation
const coachingRequestSchema = z.object({
  grantType: z.string().min(1, "Grant type is required"),
  orgDescription: z.string().min(1, "Organization description is required"),
  projectIdea: z.string().min(1, "Project idea is required"),
  pastExperience: z.string().optional(),
  targetAudience: z.string().optional(),
  budget: z.string().optional(),
  challenges: z.string().optional(),
});

/**
 * Controller to handle requests for AI coaching on grant writing strategy
 * 
 * @param req Express request object
 * @param res Express response object
 */
export async function getCoaching(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = coachingRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validationResult.error.format(),
      });
    }

    const coachingRequest = validationResult.data as CoachingRequest;
    
    // Get coaching from AI service
    const coachingResponse = await getGrantWritingCoaching(coachingRequest);
    
    // Return the coaching response
    return res.status(200).json(coachingResponse);
  } catch (error: any) {
    console.error("Error in coaching controller:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}