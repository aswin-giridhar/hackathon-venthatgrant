import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle requests for resources that don't exist (404 Not Found)
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.originalUrl}`,
      code: 'RESOURCE_NOT_FOUND'
    }
  });
}

/**
 * General error handler middleware for catching unhandled errors
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error for debugging
  console.error('Unhandled error:', err);
  
  // Default error values
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errorCode = err.code || 'SERVER_ERROR';
  
  // Send appropriate response to client
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

/**
 * Rate limiting error handler
 */
export function rateLimitHandler(req: Request, res: Response) {
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  });
}

/**
 * Bad JSON request handler
 */
export function invalidJsonHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON payload',
        code: 'INVALID_JSON'
      }
    });
  }
  next(err);
}

/**
 * Payload too large handler
 */
export function payloadTooLargeHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request entity too large',
        code: 'PAYLOAD_TOO_LARGE'
      }
    });
  }
  next(err);
}

/**
 * Database connection error handler
 */
export function dbConnectionErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.name === 'ConnectionError' || (err.message && err.message.includes('database'))) {
    console.error('Database connection error:', err);
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database service unavailable. Please try again later.',
        code: 'DATABASE_ERROR'
      }
    });
  }
  next(err);
}