# Deployment Orchestrator Contract

The staging and production GitHub workflows publish five images to GitHub
Container Registry and then call one environment-specific deployment hook.

## Required secret values

- `DEPLOY_HOOK_URL`: HTTPS endpoint owned by the hosting platform or deployment
  orchestrator.
- `DEPLOY_HOOK_TOKEN`: bearer token accepted by that endpoint.

## Request

The workflow sends:

```json
{
  "environment": "production",
  "commit": "<full git commit sha>",
  "imageTag": "sha-<full git commit sha>"
}
```

`environment` is either `staging` or `production`.

## Images

The orchestrator must deploy the same `imageTag` for all services:

- `ghcr.io/<repository-owner>/ouiboo-api`
- `ghcr.io/<repository-owner>/ouiboo-traveler`
- `ghcr.io/<repository-owner>/ouiboo-agency`
- `ghcr.io/<repository-owner>/ouiboo-admin`
- `ghcr.io/<repository-owner>/ouiboo-landing`

The API image also runs the worker with:

```text
node dist/apps/api/src/worker
```

The worker container health check must run:

```text
node dist/apps/api/src/worker-healthcheck
```

This command fails if the worker heartbeat is stale or Redis does not answer
`PING`. The defaults are a 15-second heartbeat and a 45-second maximum age;
they can be tuned with `WORKER_HEARTBEAT_INTERVAL_MS` and
`WORKER_HEARTBEAT_MAX_AGE_MS`.

## Success contract

The hook must:

1. authenticate the bearer token;
2. validate the environment and immutable SHA tag;
3. update API, worker, traveler, agency, admin, and landing;
4. wait for each service health check, including the worker probe, to pass;
5. return a successful HTTP status only after the rollout is complete.

If rollout fails, return a non-2xx response. The GitHub workflow will stop before
smoke verification and publish rollback guidance.

## Rollback

Keep the last known-good SHA tag. Rollback deploys that tag to every service as
one release unit, then reruns the same health and smoke checks.
