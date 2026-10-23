import { BadRequestException, Injectable } from '@nestjs/common';
import { PspAdapter } from './psp-adapter.interface';
import { ManualPspAdapter } from './manual-psp.adapter';
import { SandboxPspAdapter } from './sandbox-psp.adapter';

/**
 * #373 — registry of the payment-provider adapters OuiBoo can orchestrate.
 * Adding a real PSP from the Phase 3 RFP = one new adapter class + one
 * entry here; nothing else in the payment flow changes.
 */
@Injectable()
export class PspAdapterRegistry {
    private readonly adapters: Map<string, PspAdapter>;

    constructor(manual: ManualPspAdapter, sandbox: SandboxPspAdapter) {
        this.adapters = new Map<string, PspAdapter>([
            [manual.providerKey, manual],
            [sandbox.providerKey, sandbox],
        ]);
    }

    get(providerKey: string): PspAdapter {
        const adapter = this.adapters.get(providerKey);
        if (!adapter) {
            throw new BadRequestException(`Unknown payment provider: ${providerKey}`);
        }
        return adapter;
    }

    has(providerKey: string): boolean {
        return this.adapters.has(providerKey);
    }

    keys(): string[] {
        return [...this.adapters.keys()];
    }
}

/**
 * Resolve a provider webhook secret from environment configuration.
 *
 * The AgencyPaymentProfile stores only `webhookSecretRef` — the NAME of
 * an environment variable — never the secret itself. Profiles without a
 * ref fall back to the provider-level variable PSP_<PROVIDER>_WEBHOOK_SECRET.
 * Returns null when nothing is configured; callers must fail closed.
 */
export function resolveWebhookSecret(providerKey: string, webhookSecretRef?: string | null): string | null {
    const ref = webhookSecretRef || `PSP_${providerKey.toUpperCase()}_WEBHOOK_SECRET`;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref)) {
        return null;
    }
    return process.env[ref] || null;
}
