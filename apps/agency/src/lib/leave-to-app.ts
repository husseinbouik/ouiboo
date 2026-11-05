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
 *
 * Open-redirect defence: the parameter is only honoured when it
 * resolves to this origin, and navigation uses the reconstructed
 * path — never the raw value — so scheme/host tricks (//evil,
 * /\evil, javascript:) cannot leave the app.
 */
export function leaveToApp() {
  const raw = new URLSearchParams(window.location.search).get('redirect');
  let target = '/dashboard';
  if (raw) {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin === window.location.origin) {
        target = `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Unparseable target: fall back to the dashboard.
    }
  }
  window.location.replace(target);
}
