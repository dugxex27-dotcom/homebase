import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

export async function setupGoogleAuth(app: Express) {
  // Only set up Google OAuth if credentials are provided
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not found. Skipping Google authentication setup.");
    return;
  }

  // Get the callback URL based on environment
  const getCallbackURL = () => {
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      return `https://${domains[0]}/auth/google/callback`;
    }
    return 'http://localhost:5000/auth/google/callback';
  };

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL(),
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔵 Google OAuth callback triggered');
          
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value || null;

          console.log('🔵 Google profile data:', { email, firstName, lastName });

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user already exists
          let user = await storage.getUserByEmail(email);
          console.log('🔵 Existing user check:', user ? 'FOUND' : 'NOT FOUND');

          if (user) {
            console.log('🔵 Updating existing user:', user.id);
            // Update existing user with latest Google profile info
            user = await storage.upsertUser({
              ...user,
              firstName: firstName || user.firstName,
              lastName: lastName || user.lastName,
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
            console.log('🔵 User updated successfully');
          } else {
            console.log('🔵 Creating new user from Google profile');
            const newUserData = {
              id: `google_${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
              role: 'homeowner' as const,
              zipCode: null,
            };
            console.log('🔵 New user data:', newUserData);
            
            user = await storage.upsertUser(newUserData);
            console.log('🔵 User created successfully:', user.id);
          }

          // Verify user was saved to database
          const verifyUser = await storage.getUser(user.id);
          console.log('🔵 Database verification:', verifyUser ? 'SUCCESS' : 'FAILED');

          return done(null, user);
        } catch (error) {
          console.error('🔴 Google OAuth error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth routes
  app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signin' }),
    async (req: any, res) => {
      try {
        const user = req.user;

        if (!user) {
          return res.redirect('/signin');
        }

        // Create session in the same format as email/password login
        req.session.isAuthenticated = true;
        req.session.user = user;

        // Save session before redirecting
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.redirect('/signin');
          }

          // Check if user needs to complete profile (add zip code or role)
          if (!user.zipCode) {
            return res.redirect('/complete-profile');
          }

          // Redirect to appropriate dashboard based on role
          const redirectPath =
            user.role === 'contractor'
              ? '/contractor-dashboard'
              : '/';
          res.redirect(redirectPath);
        });
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/signin');
      }
    }
  );

  console.log('Google OAuth authentication configured');
}
