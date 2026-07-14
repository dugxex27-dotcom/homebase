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
    const productionDomain = 'gotohomebase.com';
    const callbackUrl = `https://${productionDomain}/auth/google/callback`;
    return callbackUrl;
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
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user already exists
          let user = await storage.getUserByEmail(email);

          if (user) {
            // Update existing user with latest Google profile info
            user = await storage.upsertUser({
              ...user,
              firstName: firstName || user.firstName,
              lastName: lastName || user.lastName,
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
          } else {
            const newUserData = {
              id: `google_${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
              role: 'homeowner' as const,
              zipCode: null,
            };
            
            user = await storage.upsertUser(newUserData);
          }

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
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
    (req: any, _res: any, next: any) => {
      // Persist any role intent (e.g. ?intent=contractor) in the session so the
      // callback can route the user correctly after Google redirects back.
      if (req.query.intent) {
        req.session.oauthIntent = req.query.intent;
      }
      next();
    },
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signin' }),
    async (req: any, res) => {
      try {
        let user = req.user;

        if (!user) {
          return res.redirect('/signin');
        }

        // Consume and clear the intent stored before the OAuth redirect.
        const oauthIntent: string | undefined = req.session.oauthIntent;
        delete req.session.oauthIntent;

        // Create session in the same format as email/password login
        req.session.isAuthenticated = true;
        req.session.user = user;

        // Save session before redirecting
        req.session.save(async (saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.redirect('/signin');
          }

          // ── Contractor intent ────────────────────────────────────────────
          if (oauthIntent === 'contractor') {
            // User needs a zip code first — send to complete-profile with the
            // contractor intent pre-selected so they don't have to pick a role.
            if (!user.zipCode) {
              return res.redirect('/complete-profile?intent=contractor');
            }

            // User has a zip code but is still a homeowner — upgrade role and
            // send through contractor onboarding to collect company details.
            if (user.role !== 'contractor') {
              try {
                user = await storage.upsertUser({ ...user, role: 'contractor' });
                req.session.user = user;
              } catch (err) {
                console.error('Failed to update user role to contractor:', err);
              }
              return res.redirect('/contractor-onboarding?fromOAuth=true');
            }

            // User is already a contractor — send to onboarding if they have no
            // company yet, or to pricing if they need to subscribe.
            if (!user.companyId) {
              return res.redirect('/contractor-onboarding?fromOAuth=true');
            }

            // Has company — go to pricing if not yet subscribed, else dashboard.
            const needsSubscription =
              !user.subscriptionStatus || user.subscriptionStatus === 'inactive';
            if (needsSubscription) {
              return res.redirect('/contractor-pricing?trial=true');
            }
            return res.redirect('/contractor-dashboard');
          }

          // ── Default routing ──────────────────────────────────────────────
          // Check if user needs to complete profile (add zip code or role)
          if (!user.zipCode) {
            return res.redirect('/complete-profile');
          }

          // Redirect to appropriate dashboard based on role
          // NOTE: Must use /dashboard (not /) because / serves index-selector.html
          // in production (static rewrite), not the React SPA.
          const redirectPath =
            user.role === 'contractor'
              ? '/contractor-dashboard'
              : user.role === 'agent'
              ? '/agent-dashboard'
              : '/dashboard';
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
