/**
 * #873: leave the login page via a full document load to the
 * dashboard.
 *
 * A client-side router navigation issues an RSC fetch that the proxy
 * gates on the BFF session cookie; when that fetch raced the cookie's
 * arrival, the proxy's 307 was consumed as the navigation result and
 * a live session was stranded on /login with no retry. A document
 * load is issued by the browser after session establishment has
 * settled (the api-client refresh now awaits it), so the gate sees
 * the cookie it just issued.
 *
 * The target is a fixed literal on purpose: honouring the proxy's
 * ?redirect= parameter from client JS would feed user-visible URL
 * input to location.replace (Semgrep js-open-redirect, blocking).
 * The dashboard is where this page has always sent authenticated
 * users; deep-link return after a bounce is a possible server-side
 * follow-up, not part of this fix.
 */
export function leaveToApp() {
  window.location.replace('/dashboard');
}
