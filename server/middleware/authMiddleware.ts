import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware to verify user is logged in
 * Used to protect routes that require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Please log in to access this resource.',
        code: 'AUTHENTICATION_REQUIRED'
      }
    });
  }
  
  next();
}

/**
 * Role-based authorization middleware
 * Verifies that a user has a specific role (e.g., admin)
 * @param role - The role required to access the route
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please log in to access this resource.',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }
    
    // Check user roles (add role property to the User schema if needed)
    const userRole = (req.user as any).role || 'user';
    
    if (userRole !== role) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. ${role} role required.`,
          code: 'ACCESS_DENIED'
        }
      });
    }
    
    next();
  };
}

/**
 * Input validation middleware
 * @param validator - Validation function that returns true if valid, false if invalid
 * @param errorMessage - Error message to return if validation fails
 */
export function validateInput(validator: (req: Request) => boolean, errorMessage: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!validator(req)) {
      return res.status(400).json({
        success: false,
        error: {
          message: errorMessage,
          code: 'VALIDATION_ERROR'
        }
      });
    }
    
    next();
  };
}

/**
 * Error handler middleware
 * Catches any errors thrown in route handlers
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Request error:', err);
  
  // Determine status code based on error type
  let statusCode = 500;
  let errorCode = 'SERVER_ERROR';
  let message = 'An unexpected error occurred';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message || 'Validation error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message || 'Resource not found';
  }
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
      ...(err.details && { details: err.details })
    }
  });
}

/**
 * Request validation error type
 * Used to standardize validation errors
 */
export class ValidationError extends Error {
  details: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Not found error type
 * Used to standardize not found errors
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error type
 * Used to standardize unauthorized errors
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error type
 * Used to standardize forbidden errors
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}