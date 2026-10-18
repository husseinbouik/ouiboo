/**
 * BFF session route (#208, #252).
 *
 * Thin wrapper over the shared @ouiboo/session package (#252).
 * Portal role isolation (#257): only AGENCY sessions are created here.
 */
import { createSessionRoute } from '@ouiboo/session';

const { POST, GET, DELETE } = createSessionRoute({
  allowedRole: 'AGENCY',
});

export { POST, GET, DELETE };
