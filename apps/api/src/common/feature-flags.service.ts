import { Injectable } from '@nestjs/common';

/**
 * Simple env-based feature flags / kill switches (#254).
 *
 * Flags are loaded once at startup from environment variables:
 *   FEATURE_<NAME>=true   enables the flag
 *   FEATURE_<NAME>=false (or unset) disables it (fail-closed)
 *
 * Example:
 *   FEATURE_NEW_CHECKOUT=true
 *
 * Usage:
 *   constructor(private readonly flags: FeatureFlagsService) {}
 *
 *   if (this.flags.isEnabled('NEW_CHECKOUT')) {
 *     // new behavior
 *   }
 *
 * Convention: flag names are uppercase SNAKE_CASE. Reading the value
 * is case-insensitive ('true', '1', 'yes', 'on' all enable).
 *
 * Env-based only for now — no database or admin UI. Sufficient for
 * kill switches and safe rollouts pre-launch.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly flags = new Map<string, boolean>();

  constructor() {
    const prefix = 'FEATURE_';
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(prefix) || value === undefined) continue;
      const name = key.slice(prefix.length);
      this.flags.set(name, FeatureFlagsService.parse(value));
    }
  }

  private static parse(value: string): boolean {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  /**
   * Returns true only when the flag was explicitly enabled.
   * Unknown or unset flags return false (fail-closed), so new
   * features stay off unless deliberately switched on.
   */
  isEnabled(name: string): boolean {
    return this.flags.get(name.trim().toUpperCase()) ?? false;
  }

  /** Names of all known flags (enabled or not), for diagnostics. */
  getKnownFlags(): string[] {
    return [...this.flags.keys()];
  }
}
