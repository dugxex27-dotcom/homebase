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
              // Start a 14-day trial for every new homeowner, mirroring replitAuth.ts
              subscriptionStatus: 'trialing' as const,
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            };
            
            user = await storage.upsertUser(newUserData);
            // Temporary flag — consumed in the callback route to detect brand-new signups
            return done(null, { ...user, _isNewOAuthUser: true });
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
      if (req.query.ref) {
        req.session.oauthRef = req.query.ref;
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
        const rawUser = req.user;

        if (!rawUser) {
          return res.redirect('/signin');
        }

        // Detect new Google OAuth user (temp flag set in the verify callback)
        const isNewOAuthUser = !!(rawUser as any)._isNewOAuthUser;
        // Strip the temporary flag before storing in session
        const { _isNewOAuthUser: _flag, ...user } = rawUser as any;

        // Consume and clear flags stored before the OAuth redirect.
        const oauthIntent: string | undefined = req.session.oauthIntent;
        const oauthRef: string | undefined = req.session.oauthRef as string | undefined;
        delete req.session.oauthIntent;
        delete req.session.oauthRef;

        // Create session in the same format as email/password login
        req.session.isAuthenticated = true;
        req.session.user = user;

        // Helper — redirects through /referral-entry for brand-new signups so
        // they can optionally enter the referral code of whoever invited them.
        const goTo = (dest: string) => {
          if (isNewOAuthUser) {
            const refParam = oauthRef
              ? `&ref=${encodeURIComponent(String(oauthRef))}`
              : '';
            return res.redirect(
              `/referral-entry?next=${encodeURIComponent(dest)}${refParam}`
            );
          }
          return res.redirect(dest);
        };

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
              return goTo('/complete-profile?intent=contractor');
            }

            // User has a zip code but is still a homeowner — upgrade role and
            // send through contractor onboarding to collect company details.
            if (user.role !== 'contractor') {
              try {
                const upgraded = await storage.upsertUser({ ...user, role: 'contractor' });
                req.session.user = upgraded;
              } catch (err) {
                console.error('Failed to update user role to contractor:', err);
              }
              return goTo('/contractor-onboarding?fromOAuth=true');
            }

            // User is already a contractor — send to onboarding if they have no
            // company yet, or to pricing if they need to subscribe.
            if (!user.companyId) {
              return goTo('/contractor-onboarding?fromOAuth=true');
            }

            // Has company — go to pricing if not yet subscribed, else dashboard.
            const needsSubscription =
              !user.subscriptionStatus || user.subscriptionStatus === 'inactive';
            if (needsSubscription) {
              return goTo('/contractor-pricing?trial=true');
            }
            return goTo('/contractor-dashboard');
          }

          // ── Agent intent ─────────────────────────────────────────────────
          if (oauthIntent === 'agent') {
            // User needs a zip code first — send to complete-profile with the
            // agent intent pre-selected so they don't have to pick a role.
            if (!user.zipCode) {
              return goTo('/complete-profile?intent=agent');
            }

            // User has a zip code but is not yet an agent — upgrade role and
            // send to the agent dashboard.
            if (user.role !== 'agent') {
              try {
                const upgraded = await storage.upsertUser({ ...user, role: 'agent' });
                req.session.user = upgraded;
              } catch (err) {
                console.error('Failed to update user role to agent:', err);
              }
            }

            return goTo('/agent-dashboard');
          }

          // ── Default routing ──────────────────────────────────────────────
          // Check if user needs to complete profile (add zip code or role)
          if (!user.zipCode) {
            return goTo('/complete-profile');
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
          return goTo(redirectPath);
        });
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/signin');
      }
    }
  );

  console.log('Google OAuth authentication configured');
}
