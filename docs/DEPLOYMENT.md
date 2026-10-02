# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Kubernetes cluster (for production)
- Helm 3+ (for chart-based deployments)
- kubectl configured to access cluster
- AWS/Azure account for storage and services
- Git for version control

## Local Development

### Setup

```bash
# Clone repository
git clone https://github.com/husseinbouik/ouiboo.git
cd ouiboo

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start services with Docker Compose
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ouiboo_dev

# API
API_PORT=3001
API_URL=http://localhost:3001

# Frontend URLs
TRAVELER_URL=http://localhost:3000
AGENCY_URL=http://localhost:3001
ADMIN_URL=http://localhost:3002

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Payment Providers
CMI_MERCHANT_ID=your-merchant-id
CMI_API_KEY=your-api-key
CMI_BASE_URL=https://api.cmipay.com
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_PUBLISHABLE_KEY=your-publishable-key

# Email Service
SENDGRID_API_KEY=your-sendgrid-key

# Storage
AWS_S3_BUCKET=ouiboo-uploads
AWS_S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Currency API
EXCHANGERATE_API_KEY=your-api-key

# Redis
REDIS_URL=redis://localhost:6379
```

## Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ouiboo_dev
      POSTGRES_USER: ouiboo
      POSTGRES_PASSWORD: ouiboo
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://ouiboo:ouiboo@postgres:5432/ouiboo_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  traveler:
    build: ./apps/traveler
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001

volumes:
  postgres_data:
```

## Staging Deployment

### Using Kubernetes

```bash
# Create namespace
kubectl create namespace ouiboo-staging

# Create configmaps and secrets
kubectl create configmap api-config \
  --from-file=./k8s/config/staging/api.env \
  -n ouiboo-staging

kubectl create secret generic api-secrets \
  --from-file=./k8s/secrets/staging/api.env \
  -n ouiboo-staging

# Deploy using Helm
helm install ouiboo ./helm/ouiboo \
  -n ouiboo-staging \
  -f helm/values-staging.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s \
  deployment/ouiboo-api -n ouiboo-staging
```

### Database Migrations

```bash
# Connect to staging database
kubectl run -it --rm --image=migrate/migrate \
  --restart=Never migrate -- \
  -path=/migrations \
  -database=postgresql://user:pass@host:5432/ouiboo_staging \
  up

# Or using Prisma
npm run db:migrate:deploy
```

## Production Deployment

### 1. Pre-Deployment Checks

```bash
# Build and test images
docker build -t ouiboo-api:latest apps/api
docker build -t ouiboo-traveler:latest apps/traveler

# Run security scan
trivy image ouiboo-api:latest
trivy image ouiboo-traveler:latest

# Run tests
npm run test
npm run test:e2e

# Check for vulnerabilities
npm audit
```

### 2. Database Backup

```bash
# Create backup before deployment
pg_dump ouiboo_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
psql ouiboo_prod < backup_*.sql
```

### 3. Deploy to Production

```bash
# Tag images
docker tag ouiboo-api:latest registry.example.com/ouiboo-api:v1.0.0
docker tag ouiboo-traveler:latest registry.example.com/ouiboo-traveler:v1.0.0

# Push to registry
docker push registry.example.com/ouiboo-api:v1.0.0
docker push registry.example.com/ouiboo-traveler:v1.0.0

# Deploy with blue-green strategy
helm upgrade ouiboo ./helm/ouiboo \
  -n ouiboo-prod \
  -f helm/values-prod.yaml \
  --set image.tag=v1.0.0 \
  --wait

# Verify deployment
kubectl rollout status deployment/ouiboo-api -n ouiboo-prod
```

### 4. Health Checks & Smoke Tests

```bash
# Check deployment status
kubectl get deployments -n ouiboo-prod

# View logs
kubectl logs -f deployment/ouiboo-api -n ouiboo-prod

# Run smoke tests
npm run test:smoke -- --env=production

# Monitor metrics
kubectl top nodes
kubectl top pods -n ouiboo-prod
```

## Database Migrations

### Running Migrations

```bash
# Generate migration
npx prisma migrate dev --name add_new_field

# Deploy migration to production
npm run db:migrate:deploy

# View migration status
npm run db:migrate:status

# Rollback to previous state (development only)
npm run db:migrate:resolve -- --rolled-back
```

### Backup & Recovery

```bash
# Create backup
aws s3 cp s3://ouiboo-backups/latest.sql backup_$(date +%Y%m%d).sql

# Restore from backup
psql ouiboo_prod < backup_2024-01-15.sql

# Verify restore
psql ouiboo_prod -c "SELECT COUNT(*) FROM bookings;"
```

## Scaling

### Horizontal Scaling

```bash
# Scale API replicas
kubectl scale deployment/ouiboo-api --replicas=3 -n ouiboo-prod

# Scale frontend replicas
kubectl scale deployment/ouiboo-traveler --replicas=2 -n ouiboo-prod

# View HPA status
kubectl get hpa -n ouiboo-prod
```

### Vertical Scaling

Update resource requests/limits in `helm/values-prod.yaml`:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

## Rollback Procedure

```bash
# Check rollout history
kubectl rollout history deployment/ouiboo-api -n ouiboo-prod

# Rollback to previous version
kubectl rollout undo deployment/ouiboo-api -n ouiboo-prod

# Rollback to specific revision
kubectl rollout undo deployment/ouiboo-api -n ouiboo-prod --to-revision=5

# Monitor rollback
kubectl rollout status deployment/ouiboo-api -n ouiboo-prod
```

## Monitoring & Alerts

### Prometheus Metrics

```bash
# Port forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n ouiboo-prod

# Query metrics
curl http://localhost:9090/api/v1/query?query=ouiboo_requests_total
```

### Log Aggregation

```bash
# View logs from all pods
kubectl logs -l app=ouiboo-api -n ouiboo-prod --all-containers=true

# Stream logs
kubectl logs -f deployment/ouiboo-api -n ouiboo-prod
```

## Troubleshooting

### Common Issues

#### Pod CrashLoopBackOff

```bash
# Check pod status
kubectl describe pod <pod-name> -n ouiboo-prod

# Check recent logs
kubectl logs --previous <pod-name> -n ouiboo-prod

# Check events
kubectl get events -n ouiboo-prod --sort-by='.lastTimestamp'
```

#### Database Connection Issues

```bash
# Test database connection
kubectl run -it --rm --image=postgres:15 --restart=Never \
  psql -- psql -h db-host -U user -d ouiboo_prod

# Check database logs
kubectl logs -f deployment/postgres -n ouiboo-prod
```

#### Out of Memory

```bash
# Check resource usage
kubectl top pods -n ouiboo-prod

# Increase memory limits
kubectl set resources deployment/ouiboo-api \
  -n ouiboo-prod \
  --limits=memory=2Gi
```

## Security Checklist

- [ ] All passwords changed from defaults
- [ ] SSL/TLS certificates configured
- [ ] Network policies applied
- [ ] Pod security policies enabled
- [ ] Image scanning complete
- [ ] Secrets encrypted at rest
- [ ] Audit logging enabled
- [ ] RBAC configured
- [ ] Backup strategy tested
- [ ] Disaster recovery plan documented

## Performance Optimization

### Enable Caching

```bash
# Enable Redis
kubectl set env deployment/ouiboo-api \
  CACHE_ENABLED=true \
  REDIS_URL=redis://redis-master:6379 \
  -n ouiboo-prod
```

### Database Optimization

```bash
# Analyze queries
EXPLAIN ANALYZE SELECT * FROM bookings WHERE status='CONFIRMED';

# Create indexes
CREATE INDEX idx_bookings_status ON bookings(status);
```

## Support & Troubleshooting

For issues, check:
1. Container logs: `kubectl logs -f <pod> -n ouiboo-prod`
2. Events: `kubectl describe pod <pod> -n ouiboo-prod`
3. Metrics: Check Prometheus/Grafana dashboard
4. Application health: `curl http://api:3001/health`
