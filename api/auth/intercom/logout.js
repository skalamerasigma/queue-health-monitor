/**
 * Logout endpoint - clears authentication cookies
 */
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Handle CORS
  const allowedOriginEnv = process.env.ALLOWED_ORIGIN || "https://app.sigmacomputing.com";
  const requestOrigin = req.headers.origin;
  
  let originToUse = allowedOriginEnv;
  if (allowedOriginEnv === "*") {
    originToUse = "*";
  } else if (requestOrigin) {
    const isAllowedOrigin = requestOrigin === allowedOriginEnv;
    const isSameDomain = requestOrigin.includes("vercel.app") || requestOrigin.includes("localhost");
    if (isAllowedOrigin || isSameDomain) {
      originToUse = requestOrigin;
    }
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", originToUse);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  // Clear authentication cookies
  // Use SameSite=None; Secure for cross-site cookie clearing (matches how cookies are set)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = isProduction 
    ? 'HttpOnly; SameSite=None; Secure; Path=/'
    : 'HttpOnly; SameSite=Lax; Path=/';
  
  res.setHeader('Set-Cookie', [
    `intercom_access_token=; ${cookieOptions}; Max-Age=0`,
    `oauth_state=; ${cookieOptions}; Max-Age=0`,
    `oauth_redirect=; ${cookieOptions}; Max-Age=0`,
    `oauth_popup=; ${cookieOptions}; Max-Age=0`,
  ]);

  res.setHeader("Access-Control-Allow-Origin", originToUse);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "GET") {
    // Redirect to home page
    res.redirect(302, '/?logged_out=true');
  } else {
    res.json({ success: true, message: "Logged out successfully" });
  }
}
