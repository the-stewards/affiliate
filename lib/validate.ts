// Deliberately loose - just enough to reject obvious garbage
// ("asdf", "test", no @ or domain), not full RFC 5322 compliance.
// The browser's type="email" input already catches most bad input;
// this is the server-side backstop for direct API calls that skip it.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
