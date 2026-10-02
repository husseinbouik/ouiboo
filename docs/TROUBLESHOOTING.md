# Troubleshooting Guide

## Common Issues & Solutions

### Database Connection

#### Error: `connect ECONNREFUSED 127.0.0.1:5432`

**Cause**: PostgreSQL server not running

**Solutions**:
1. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   # or with Docker
   docker ps | grep postgres
   ```

2. Start PostgreSQL:
   ```bash
   sudo systemctl start postgresql
   # or restart Docker container
   docker-compose up -d postgres
   ```

3. Verify connection string in `.env.local`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/ouiboo_dev
   ```

#### Error: `FATAL: role "user" does not exist`

**Cause**: Database user not created

**Solutions**:
1. Connect to PostgreSQL as admin:
   ```bash
   psql -U postgres
   ```

2. Create user:
   ```sql
   CREATE USER ouiboo WITH PASSWORD 'ouiboo';
   CREATE DATABASE ouiboo_dev OWNER ouiboo;
   ```

3. Grant permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE ouiboo_dev TO ouiboo;
   ```

### Migrations & Schema

#### Error: `The migration "20240101000000_init" already exists in the migration history`

**Cause**: Migration already applied

**Solutions**:
1. Check migration status:
   ```bash
   npm run db:migrate:status
   ```

2. If safe to reset (dev only):
   ```bash
   npm run db:migrate:reset
   ```

3. For production, rollback carefully:
   ```bash
   npm run db:migrate:resolve -- --rolled-back
   ```

#### Error: `Prisma schema validation error`

**Cause**: Invalid schema syntax

**Solutions**:
1. Check for syntax errors in `schema.prisma`
2. Validate using Prisma tools:
   ```bash
   npx prisma validate
   ```

3. Format schema:
   ```bash
   npx prisma format
   ```

### Authentication Issues

#### Error: `JWT malformed`

**Cause**: Invalid or expired token

**Solutions**:
1. Check token format - should start with `Bearer `
2. Verify JWT secret in `.env.local`:
   ```env
   JWT_SECRET=your-super-secret-key
   ```

3. Clear stored tokens and re-login:
   ```bash
   # In browser console
   localStorage.removeItem('token');
   localStorage.removeItem('refreshToken');
   ```

#### Error: `Unauthorized - Invalid credentials`

**Cause**: Wrong email/password

**Solutions**:
1. Verify credentials are correct
2. Check if account exists in database:
   ```sql
   SELECT * FROM "User" WHERE email = 'user@example.com';
   ```

3. Reset password if needed:
   - Use "Forgot Password" flow
   - Or update directly (dev only):
     ```sql
     UPDATE "User" SET password = '$2b$10$...' WHERE email = 'user@example.com';
     ```

### API Issues

#### Error: `500 Internal Server Error`

**Solutions**:
1. Check API logs:
   ```bash
   npm run dev
   # or
   docker logs ouiboo-api
   ```

2. Look for specific error messages
3. Check database connectivity
4. Verify environment variables are set

#### Error: `CORS error in browser`

**Cause**: Frontend and API have different origins

**Solutions**:
1. Check CORS configuration in `main.ts`:
   ```typescript
   app.enableCors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true,
   });
   ```

2. Verify frontend URL in `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. Clear browser cache and try again

#### Error: `Request timeout`

**Cause**: Server or database too slow

**Solutions**:
1. Check database performance:
   ```sql
   SELECT query, calls, mean_time FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;
   ```

2. Optimize slow queries with indexes:
   ```sql
   CREATE INDEX idx_bookings_status ON bookings(status);
   ```

3. Increase timeout in API configuration

### Payment Gateway Issues

#### Error: `CMI payment initiation failed`

**Cause**: Missing or invalid credentials

**Solutions**:
1. Verify CMI credentials in `.env.local`:
   ```env
   CMI_MERCHANT_ID=your-id
   CMI_API_KEY=your-key
   CMI_BASE_URL=https://api.cmipay.com
   ```

2. Test CMI API connectivity:
   ```bash
   curl https://api.cmipay.com/health
   ```

3. Check CMI documentation for specific error codes

#### Error: `Stripe webhook validation failed`

**Cause**: Invalid webhook signature

**Solutions**:
1. Verify webhook secret in `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. Check webhook URL in Stripe dashboard
3. Verify request headers include `x-signature`

### File Upload Issues

#### Error: `File upload failed - Access Denied`

**Cause**: S3/Storage credentials invalid

**Solutions**:
1. Verify AWS credentials in `.env.local`:
   ```env
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_S3_BUCKET=your-bucket
   AWS_S3_REGION=eu-west-1
   ```

2. Check S3 bucket permissions:
   ```bash
   aws s3api get-bucket-policy --bucket ouiboo-uploads
   ```

3. Verify bucket exists and is accessible:
   ```bash
   aws s3 ls s3://ouiboo-uploads
   ```

#### Error: `File too large`

**Cause**: File size exceeds limit

**Solutions**:
1. Check file size limits in API configuration
2. Compress image before uploading
3. Use multiple uploads for large files

### Email/Notification Issues

#### Error: `Failed to send email`

**Cause**: Email service not configured

**Solutions**:
1. Verify email credentials:
   ```env
   SENDGRID_API_KEY=your-key
   ```

2. Check email templates exist
3. Verify recipient email is valid:
   ```sql
   SELECT email FROM "User" WHERE id = 'user-id';
   ```

4. Check email service logs

#### Error: `SMS notification failed`

**Cause**: Twilio not configured

**Solutions**:
1. Set up Twilio account and credentials
2. Verify phone number format (international)
3. Check Twilio balance and permissions

### Performance Issues

#### Slow API Response

**Cause**: Database queries or heavy processing

**Solutions**:
1. Enable query profiling:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. Identify slow queries:
   ```sql
   SELECT query, calls, total_time FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;
   ```

3. Add indexes:
   ```sql
   CREATE INDEX idx_bookings_session_id ON bookings(session_id);
   ```

4. Optimize N+1 queries with Prisma `include`

#### High Memory Usage

**Cause**: Memory leak or large result set

**Solutions**:
1. Check for memory leaks:
   ```bash
   node --inspect=0.0.0.0:9229 src/main.ts
   ```

2. Implement pagination
3. Use streaming for large result sets
4. Restart application:
   ```bash
   npm run dev
   ```

### Deployment Issues

#### Error: `ErrImagePull` in Kubernetes

**Cause**: Container image not found

**Solutions**:
1. Verify image exists in registry:
   ```bash
   docker images | grep ouiboo
   ```

2. Push image to registry:
   ```bash
   docker push registry.example.com/ouiboo-api:v1.0.0
   ```

3. Update deployment image reference

#### Error: `CrashLoopBackOff`

**Cause**: Application crashes on startup

**Solutions**:
1. Check pod logs:
   ```bash
   kubectl logs pod-name -n ouiboo-prod
   ```

2. Check previous logs:
   ```bash
   kubectl logs --previous pod-name -n ouiboo-prod
   ```

3. Verify environment variables are set:
   ```bash
   kubectl describe pod pod-name -n ouiboo-prod
   ```

#### Error: `Pod Pending`

**Cause**: Insufficient resources

**Solutions**:
1. Check node resources:
   ```bash
   kubectl top nodes
   ```

2. Check pod requirements:
   ```bash
   kubectl describe pod pod-name
   ```

3. Scale down other pods or add nodes

### Redis Issues

#### Error: `Redis connection refused`

**Cause**: Redis not running

**Solutions**:
1. Start Redis:
   ```bash
   docker-compose up -d redis
   ```

2. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

3. Check Redis URL in `.env.local`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Getting Help

If issue persists:

1. Check GitHub issues for similar problems
2. Search documentation and guides
3. Create detailed bug report with:
   - Error message and stack trace
   - Steps to reproduce
   - Environment details (OS, versions)
   - Relevant logs
4. Contact support or maintainers

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment
export DEBUG=ouiboo:*
npm run dev
```

Or in `.env.local`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Database Debugging

```bash
# Connect to database directly
psql $DATABASE_URL

# List tables
\dt

# View table structure
\d table_name

# Check row count
SELECT count(*) FROM bookings;

# Export data for analysis
\COPY (SELECT * FROM bookings) TO 'output.csv' WITH CSV HEADER;
```
