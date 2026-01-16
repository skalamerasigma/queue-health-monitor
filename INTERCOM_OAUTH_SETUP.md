# Intercom OAuth Authentication Setup

This guide explains how to set up Intercom OAuth authentication for the Queue Health Monitor application.

## Overview

The application now requires users to authenticate with their Intercom credentials before accessing the dashboard. This ensures that:
- Each user uses their own Intercom access token
- API calls are made with proper user permissions
- Better security and auditability

## Prerequisites

1. An Intercom workspace with admin access
2. Ability to create OAuth apps in Intercom
3. Access to environment variables in your deployment platform (Vercel)

## Step 1: Create an OAuth App in Intercom

1. **Log in to Intercom**
   - Go to https://app.intercom.com
   - Log in with your admin account

2. **Navigate to Developer Hub**
   - Click on your profile icon (bottom left)
   - Go to **Settings** → **Developer** → **Developer Hub**
   - Or go directly to: https://app.intercom.com/a/apps/

3. **Create a New OAuth App**
   - Click **"New app"** or **"Create app"**
   - Give it a name (e.g., "Queue Health Monitor")
   - Click **"Create app"**

4. **Configure OAuth Settings**
   - Go to **"Authentication"** tab
   - Under **"OAuth"**, click **"Set up OAuth"** or **"Configure"**
   - Set the **Redirect URI** to:
     ```
     https://your-app-domain.vercel.app/api/auth/intercom/callback
     ```
     - Replace `your-app-domain` with your actual Vercel deployment domain
     - For local development, use: `http://localhost:3000/api/auth/intercom/callback`
   - Save the configuration

5. **Get OAuth Credentials**
   - Note down the **Client ID** and **Client Secret**
   - These will be used in environment variables

## Step 2: Configure Environment Variables

Add the following environment variables to your Vercel project (or `.env` file for local development):

### Required Variables

```bash
# Intercom OAuth Client ID (from Step 1)
INTERCOM_CLIENT_ID=your_client_id_here

# Intercom OAuth Client Secret (from Step 1)
INTERCOM_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI (must match what you configured in Intercom)
INTERCOM_REDIRECT_URI=https://your-app-domain.vercel.app/api/auth/intercom/callback
```

### Optional Variables

```bash
# CORS allowed origin (default: https://app.sigmacomputing.com)
ALLOWED_ORIGIN=https://app.sigmacomputing.com

# Fallback server token (for backward compatibility, optional)
INTERCOM_TOKEN=your_server_token_here
```

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `INTERCOM_CLIENT_ID`
   - **Value**: Your Client ID from Intercom (e.g., `762a71ed-ca92-46ee-b5c0-18a97c374ae5`)
   - **Environment**: Production, Preview, Development (as needed)
4. Repeat for `INTERCOM_CLIENT_SECRET` and `INTERCOM_REDIRECT_URI`
5. **Important**: After adding environment variables, you must redeploy your application for changes to take effect

## Step 3: Update Redirect URI in Intercom

Make sure the redirect URI in your Intercom OAuth app matches exactly:

- **Production**: `https://your-app-domain.vercel.app/api/auth/intercom/callback`
- **Development**: `http://localhost:3000/api/auth/intercom/callback`

**Important**: The redirect URI must match exactly, including the protocol (http vs https) and path.

## Step 4: Verify OAuth Scopes

The application requests the following OAuth scopes:
- `conversations.read` - Read conversations
- `conversations.list` - List/search conversations
- `teams.read` - Read team information
- `admins.read` - Read admin/user information

These scopes are automatically requested during the OAuth flow. Make sure your Intercom OAuth app has permission to request these scopes.

## Step 5: Test Authentication

1. **Deploy your application** to Vercel (or start locally)
2. **Visit your application URL**
3. **You should see a login page** with "Sign in with Intercom" button
4. **Click the button** - you'll be redirected to Intercom
5. **Authorize the application** - you'll be redirected back to your app
6. **You should now be authenticated** and see the dashboard

## Troubleshooting

### "OAuth not configured" Error

- Verify that `INTERCOM_CLIENT_ID` and `INTERCOM_CLIENT_SECRET` are set in environment variables
- Make sure you've deployed after adding the environment variables
- Check that the variables are set for the correct environment (Production/Preview/Development)

### "Invalid state parameter" Error

- This is a CSRF protection error
- Make sure cookies are enabled in your browser
- Try clearing cookies and logging in again
- Ensure your domain allows cookies (check SameSite cookie settings)

### "Failed to exchange authorization code" Error

- Verify that `INTERCOM_REDIRECT_URI` matches exactly what's configured in Intercom
- Check that the redirect URI includes the correct protocol (https in production)
- Ensure the Client Secret is correct

### "Authentication required" Error on API Calls

- The user's access token might have expired
- Try logging out and logging back in
- Check that cookies are being sent with API requests (check browser DevTools → Network → Cookies)

### Cookies Not Working

- In production, cookies require HTTPS
- Make sure your Vercel deployment uses HTTPS
- Check browser console for cookie-related errors
- Verify that `credentials: 'include'` is set in fetch requests (already configured in AuthContext)

### Redirect Loop

- Check that the redirect URI in Intercom matches your callback URL exactly
- Verify that the callback endpoint is accessible
- Check browser console and network tab for errors

## OAuth Flow Diagram

```
User → App → /api/auth/intercom/login → Intercom Authorization
                                              ↓
User Authorizes ← Intercom ← /api/auth/intercom/callback ← Intercom Redirects
                                              ↓
App Dashboard ← Cookie Set ← Token Exchange ← Authorization Code
```

## Security Considerations

1. **Cookies**: Access tokens are stored in httpOnly cookies, preventing JavaScript access
2. **HTTPS**: Always use HTTPS in production to protect cookies
3. **State Parameter**: CSRF protection via state parameter in OAuth flow
4. **Token Expiration**: Tokens expire based on Intercom's settings (default: 30 days)
5. **Scope Limitation**: Only request necessary scopes

## Fallback to Server Token

If a user token is not available, the API will fall back to using the server token (`INTERCOM_TOKEN`) if configured. This allows for backward compatibility but is not recommended for production use.

## Additional Resources

- [Intercom OAuth Documentation](https://developers.intercom.com/building-apps/docs/oauth)
- [Intercom API Documentation](https://developers.intercom.com/intercom-api-reference/reference)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
