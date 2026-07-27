import { type Request, type Response, type NextFunction } from "express";

/**
 * Security headers middleware.
 * Sets HTTP security headers per OWASP recommendations for the API server.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Enable browser XSS filter (legacy)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (non-blocking for API; enforced on frontend)
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;");

  // Permissions Policy (disallow sensitive features)
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // Remove the X-Powered-By header
  res.removeHeader("X-Powered-By");

  next();
}
