import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";
import { z } from "zod";

// Extend Express User interface without circular reference
declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Make sure SESSION_SECRET is defined
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
    console.warn("SESSION_SECRET not found, using a random value for this session.");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          
          if (!user) {
            return done(null, false, { message: "Incorrect username or password" });
          }
          
          const isValid = await comparePasswords(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: "Incorrect username or password" });
          }
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration validation schema
  const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long").max(50, "Username cannot exceed 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    fullName: z.string().optional(),
    organization: z.string().optional(),
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      // First check if request body is present
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Missing request body",
            code: "INVALID_REQUEST"
          }
        });
      }
      
      // Validate the input data
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: validationResult.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }
        });
      }
      
      const data = validationResult.data;
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(409).json({ 
          success: false,
          error: {
            message: "Username is already taken",
            code: "USERNAME_EXISTS"
          }
        });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(409).json({ 
          success: false,
          error: {
            message: "Email is already registered",
            code: "EMAIL_EXISTS"
          }
        });
      }
      
      // Hash the password and create the user
      const hashedPassword = await hashPassword(data.password);
      
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = user;
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          success: true,
          data: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    // First check if request body is present
    if (!req.body || !req.body.username || !req.body.password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Missing credentials. Username and password are required.",
          code: "MISSING_CREDENTIALS"
        }
      });
    }
    
    passport.authenticate("local", (err: Error | null, user: any, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: {
            message: info?.message || "Authentication failed. Invalid username or password.",
            code: "AUTHENTICATION_FAILED"
          }
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return next(err);
        }
        
        // Remove password from the response
        const { password, ...userWithoutPassword } = user;
        
        return res.json({
          success: true,
          data: userWithoutPassword
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({
        success: true,
        message: "No active session to logout"
      });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      res.status(200).json({ 
        success: true,
        message: "Logged out successfully" 
      });
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated. Please log in to access this resource.",
          code: "NOT_AUTHENTICATED"
        }
      });
    }
    
    try {
      // Remove password from the response
      const { password, ...userWithoutPassword } = req.user!;
      
      res.json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      console.error("Error retrieving user data:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "An unexpected error occurred while retrieving user data",
          code: "USER_DATA_ERROR"
        }
      });
    }
  });
  
  // Update user profile route
  app.patch("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated. Please log in to update your profile.",
          code: "NOT_AUTHENTICATED"
        }
      });
    }
    
    try {
      const { fullName, organization, profilePicture, preferredLlmModel } = req.body;
      
      // Update user in database
      storage.updateUser(req.user!.id, {
        fullName,
        organization,
        profilePicture,
        preferredLlmModel
      }).then(updatedUser => {
        // Create activity for profile update
        storage.createActivity({
          userId: req.user!.id,
          type: "profile_update",
          description: "Updated profile information",
          entityId: req.user!.id,
          entityType: "user"
        }).catch(err => {
          console.error("Error creating activity:", err);
        });
        
        // Return updated user data
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
          success: true,
          data: userWithoutPassword
        });
      }).catch(err => {
        console.error("Error updating user:", err);
        res.status(500).json({
          success: false,
          error: {
            message: "An unexpected error occurred while updating user data",
            code: "USER_UPDATE_ERROR"
          }
        });
      });
    } catch (error) {
      console.error("Error in profile update:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "An unexpected error occurred while processing your request",
          code: "PROFILE_UPDATE_ERROR"
        }
      });
    }
  });
}
