/**
 * BFF session route (#208, #252).
 *
 * Thin wrapper over the shared @ouiboo/session package (#252).
 * Portal role isolation (#257): only ADMIN sessions are created here.
 */
import { createSessionRoute } from '@ouiboo/session';

const { POST, GET, DELETE } = createSessionRoute({
  allowedRole: 'ADMIN',
});

export { POST, GET, DELETE };
