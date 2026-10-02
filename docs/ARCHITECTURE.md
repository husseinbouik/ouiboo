# Architecture Overview

## System Architecture

The Ouiboo platform follows a modular, multi-tier architecture designed for scalability, maintainability, and independent deployment.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │  Traveler   │  │   Agency    │  │    Admin     │         │
│  │   (Next.js) │  │  (Next.js)  │  │   (Next.js)  │         │
│  └─────────────┘  └─────────────┘  └──────────────┘         │
└────────────────┬──────────────────────────────────────────────┘
                 │  HTTP/REST + WebSocket
┌────────────────┼──────────────────────────────────────────────┐
│  API Layer (NestJS)                                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Controllers │ Guards │ Interceptors │ Filters        │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────────┘
                 │
┌────────────────┼──────────────────────────────────────────────┐
│  Business Logic Layer (Services)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Auth        │  │  Bookings    │  │  Payments    │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │  Trips       │  │  Reviews     │  │  Analytics   │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │  Messages    │  │  Wishlist    │  │  Notifications       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────┬──────────────────────────────────────────────┘
                 │
┌────────────────┼──────────────────────────────────────────────┐
│  Data Layer                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │     Prisma ORM (Database Abstraction)                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │    Redis     │  │  External    │       │
│  │  (Primary DB)│  │   (Cache)    │  │    APIs      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
apps/api/src/
├── auth/                    # Authentication & Authorization
├── users/                   # User Management
├── trips/                   # Trip Templates & Sessions
├── bookings/                # Booking Management
├── payments/                # Payment Gateway Integration
├── reviews/                 # Reviews & Ratings
├── wishlist/                # Wishlist Management
├── analytics/               # Analytics & Reporting
├── notifications/           # Notifications & Reminders
├── messages/                # Direct Messaging
├── currency/                # Currency Conversion
├── websocket/               # Real-time Communication
├── email/                   # Email Service
├── admin/                   # Admin Panel
├── agency/                  # Agency Management
├── wallet/                  # Wallet & Payouts
├── upload/                  # File Upload
├── common/                  # Common Utilities
└── app.module.ts            # Main Application Module
```

## Database Schema

The data model is built with Prisma ORM and uses PostgreSQL. Key entities:

### Core Entities
- **User**: Platform users (TRAVELER, AGENCY, ADMIN)
- **AgencyProfile**: Agency details and verification
- **TripTemplate**: Trip offerings
- **TripSession**: Specific trip departures
- **Booking**: Trip bookings by travelers

### Business Entities
- **Review**: Trip reviews and ratings
- **Wishlist**: Saved trips by travelers
- **Message**: Direct messages between travelers and agencies
- **Conversation**: Conversation threads

### Financial Entities
- **Booking**: Payment information
- **Wallet**: Agency balance tracking
- **WalletTransaction**: Transaction history
- **PaymentTransaction**: Payment gateway transactions

### Support Entities
- **NotificationPreference**: User notification settings
- **NotificationLog**: Sent notification tracking
- **ExchangeRate**: Cached currency rates
- **AuditLog**: System action tracking

## Authentication & Authorization

### JWT-based Authentication
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Token Rotation**: Automatic rotation of refresh tokens on each use

### Role-Based Access Control (RBAC)
- **TRAVELER**: Can book trips, leave reviews, manage wishlist
- **AGENCY**: Can create/manage trips, view bookings, access analytics
- **ADMIN**: Full platform access, approval workflows

## API Versioning

Current version: **v1**

All endpoints are prefixed with `/api/v1`. Future versions can coexist.

## External Integrations

### Payment Providers
- **CMI (Crédit Mutuel Irland)**: Primary payment gateway for Morocco
- **Stripe**: International payments (USD, EUR, GBP)
- **PayPal**: Alternative payment method (future)

### Email Service
- **SendGrid** or **AWS SES**: Transactional emails

### File Storage
- **AWS S3** or **Azure Blob Storage**: Trip images, payment proofs, documents

### Real-time Communication
- **Socket.io**: WebSocket server for real-time notifications

### Currency Exchange
- **ExchangeRate API**: Daily exchange rate updates

## Deployment Architecture

### Containerization
- Docker containers for each service
- Multi-stage builds for optimized images
- Docker Compose for local development

### Orchestration (Kubernetes)
- Deployment manifests for each service
- Auto-scaling based on CPU/memory
- Service mesh for inter-service communication (future)

### CI/CD Pipeline
- GitHub Actions for automated testing
- Automated builds on push
- Staging deployment with approval gates
- Production deployment with blue-green strategy

## Security Architecture

### Network Security
- HTTPS/TLS for all communications
- CORS configuration for web clients
- Rate limiting on sensitive endpoints
- DDoS protection

### Application Security
- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection
- CSRF tokens for state-changing operations

### Data Protection
- Field-level encryption for sensitive data
- Data at rest encryption (database)
- Data in transit encryption (TLS)
- Secure password reset tokens
- PII data retention policies

## Performance Optimization

### Caching Strategy
- **Redis Cache**: Session data, exchange rates, popular searches
- **Database Query Caching**: Expensive queries cached
- **CDN**: Static assets (images, CSS, JS)

### Query Optimization
- Database indexes on frequently queried fields
- Query result pagination
- N+1 query prevention
- Denormalization for read-heavy operations

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization (WebP, responsive images)
- Font optimization and preloading
- Service worker for offline support

## Monitoring & Observability

### Logging
- Centralized logging (ELK stack or CloudWatch)
- Structured JSON logging
- Log aggregation and analysis

### Monitoring
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Real-time alerting
- Custom metrics

### Tracing
- Distributed tracing for request tracking
- Correlation IDs for multi-service requests
- Performance profiling

## Disaster Recovery

### Backup Strategy
- Daily database backups
- Backup retention: 30 days
- Point-in-time recovery capability

### High Availability
- Database replication
- Load balancing across API instances
- Auto-failover for critical services
- Multi-region deployment (future)

## Development Workflow

### Git Flow
- `master`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `hotfix/*`: Production hotfixes

### Code Standards
- TypeScript for type safety
- ESLint for code style
- Prettier for formatting
- Unit tests with Jest
- E2E tests with Cypress/Playwright

### Testing Strategy
- Unit tests for services (>80% coverage)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Load testing with k6
