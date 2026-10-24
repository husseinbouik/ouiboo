import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY, Public } from '../decorators/public.decorator';

/**
 * JwtAuthGuard @Public() behaviour (#391).
 *
 * Routes marked @Public() carry their own credential and must skip the
 * passport JWT check entirely; every other route must delegate to it.
 */
describe('JwtAuthGuard', () => {
    const guard = new JwtAuthGuard(new Reflector());

    // The class JwtAuthGuard directly extends (the passport AuthGuard mixin).
    const passportPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
        canActivate: (...args: unknown[]) => unknown;
    };

    class SessionController {
        handler() {
            return null;
        }
    }

    class TokenController {
        @Public()
        handler() {
            return null;
        }
    }

    @Public()
    class PublicController {
        handler() {
            return null;
        }
    }

    function contextFor(handler: unknown, cls: unknown): ExecutionContext {
        return {
            getHandler: () => handler,
            getClass: () => cls,
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
                getResponse: () => ({}),
            }),
        } as unknown as ExecutionContext;
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('stores IS_PUBLIC metadata via the @Public() decorator', () => {
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, TokenController.prototype.handler)).toBe(true);
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, SessionController.prototype.handler)).toBeUndefined();
    });

    it('allows a @Public() handler without invoking passport', () => {
        const passport = jest.spyOn(passportPrototype, 'canActivate');
        const ctx = contextFor(TokenController.prototype.handler, TokenController);
        expect(guard.canActivate(ctx)).toBe(true);
        expect(passport).not.toHaveBeenCalled();
    });

    it('allows handlers on a @Public() controller without invoking passport', () => {
        const passport = jest.spyOn(passportPrototype, 'canActivate');
        const ctx = contextFor(PublicController.prototype.handler, PublicController);
        expect(guard.canActivate(ctx)).toBe(true);
        expect(passport).not.toHaveBeenCalled();
    });

    it('delegates unmarked routes to the passport JWT check', () => {
        const passport = jest
            .spyOn(passportPrototype, 'canActivate')
            .mockReturnValue(true as never);
        const ctx = contextFor(SessionController.prototype.handler, SessionController);
        expect(guard.canActivate(ctx)).toBe(true);
        expect(passport).toHaveBeenCalledTimes(1);
        expect(passport).toHaveBeenCalledWith(ctx);
    });
});
