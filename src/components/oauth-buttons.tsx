export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <a href="/api/auth/google" className="btn-secondary text-center">
        Continue with Google
      </a>
      <a href="/api/auth/apple" className="btn-secondary text-center">
        Continue with Apple
      </a>
    </div>
  );
}
