#!/usr/bin/env bash
set -euo pipefail

echo "Starting test DB via docker-compose..."
docker-compose -f $(dirname "$0")/../docker-compose.test.yml up -d
echo "Waiting for DB to be ready..."
sleep 10

echo "Test DB started. Ensure DATABASE_URL points to postgresql://test:test@localhost:5433/ouiboo_test"
