-- Prevents duplicate accounts for the same Apple/Google identity on a
-- double-submitted OAuth callback. NULL authProviderId (every
-- email/password user) is unconstrained by this index.
CREATE UNIQUE INDEX "User_authProvider_authProviderId_key" ON "User"("authProvider", "authProviderId");
