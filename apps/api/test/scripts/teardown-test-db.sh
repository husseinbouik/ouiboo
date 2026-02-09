#!/usr/bin/env bash
set -euo pipefail

echo "Stopping test DB..."
docker-compose -f $(dirname "$0")/../docker-compose.test.yml down
echo "Test DB stopped."
