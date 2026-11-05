/**
 * #873: leave the login page via a full document load, honouring the
 * proxy's ?redirect= target.
 *
 * A client-side router navigation issues an RSC fetch that the proxy
 * gates on the BFF session cookie; when that fetch raced the cookie's
 * arrival, the proxy's 307 was consumed as the navigation result and
 * a live session was stranded on /login with no retry. A document
 * load is issued by the browser after session establishment has
 * settled (the api-client refresh now awaits it), so the gate sees
 * the cookie it just issued.
 */
export function leaveToApp() {
  const raw = new URLSearchParams(window.location.search).get('redirect');
  const target =
    raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  window.location.replace(target);
}
