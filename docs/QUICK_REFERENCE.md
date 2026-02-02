# Quick Reference Guide

## Module File Locations

### Payments Module
```
apps/api/src/payments/
├── interfaces/
│   └── payment-provider.interface.ts
├── providers/
│   ├── cmi-payment.provider.ts
│   ├── stripe-payment.provider.ts
│   └── payment-provider.factory.ts
├── dto/
│   └── payment.dto.ts
├── payments.service.ts
├── payments.controller.ts
└── payments.module.ts
```

### Notifications Module
```
apps/api/src/notifications/
├── dto/
│   └── notification-preference.dto.ts
├── notifications.service.ts
├── notification-jobs.service.ts
└── notifications.module.ts
```

### Reviews Module
```
apps/api/src/reviews/
├── dto/
│   └── create-review.dto.ts
├── reviews.service.ts
├── reviews.controller.ts
└── reviews.module.ts
```

### Wishlist Module
```
apps/api/src/wishlist/
├── wishlist.service.ts
├── wishlist.controller.ts
└── wishlist.module.ts
```

### Analytics Module
```
apps/api/src/analytics/
├── analytics.service.ts
├── analytics.controller.ts
└── analytics.module.ts
```

### Currency Module
```
apps/api/src/currency/
├── currency.service.ts
├── currency.controller.ts
└── currency.module.ts
```

### WebSocket Module
```
apps/api/src/websocket/
├── websocket.gateway.ts
├── websocket.service.ts
└── websocket.module.ts
```

### Messages Module
```
apps/api/src/messages/
├── dto/
│   └── send-message.dto.ts
├── messages.service.ts
├── messages.controller.ts
└── messages.module.ts
```

## Key Endpoints

### Payments
- `POST /payments/initiate` - Start payment
- `POST /payments/verify` - Verify payment status
- `POST /payments/refund` - Process refund
- `POST /payments/webhook/:provider` - Webhook handler

### Reviews
- `POST /bookings/:bookingId/review` - Create review
- `GET /trips/:tripId/reviews` - Get reviews
- `GET /trips/:tripId/reviews/stats` - Get stats
- `POST /reviews/:reviewId/response` - Agency response
- `PATCH /reviews/:reviewId` - Update review
- `DELETE /reviews/:reviewId` - Delete review

### Wishlist
- `POST /users/wishlist/:tripId` - Add to wishlist
- `DELETE /users/wishlist/:tripId` - Remove from wishlist
- `GET /users/wishlist` - Get user's wishlist
- `GET /users/wishlist/:tripId/is-wishlisted` - Check if wishlisted

### Analytics
- `GET /analytics/revenue-trends` - Revenue trends
- `GET /analytics/conversion-funnel` - Conversion funnel
- `GET /analytics/top-trips` - Top performing trips
- `GET /analytics/payment-methods` - Payment distribution
- `GET /analytics/customer-demographics` - Customer data

### Currency
- `GET /currency/rates?target=USD` - Get exchange rate
- `GET /currency/convert?amount=1000&target=USD` - Convert currency
- `GET /currency/supported` - Supported currencies

### Messages
- `POST /messages` - Send message
- `GET /messages/conversations` - Get conversations
- `GET /messages/conversations/:conversationId` - Get messages
- `GET /messages/unread-count` - Unread count
- `GET /messages/search?q=query` - Search messages
- `DELETE /messages/:messageId` - Delete message

## Database Models Added

1. **Review** - Trip reviews with ratings
2. **Wishlist** - Trip favorites
3. **NotificationPreference** - User notification settings
4. **NotificationLog** - Sent notification tracking
5. **PaymentTransaction** - Payment records
6. **Conversation** - Message conversations
7. **Message** - Direct messages
8. **ExchangeRate** - Currency rate cache

## Enums Added

1. **PaymentMethod** - MANUAL, GATEWAY
2. **BookingPaymentStatus** - UNPAID, PAID, REFUNDED
3. **SessionStatus** - OPEN, FULL, CANCELLED
4. **NotificationType** - PAYMENT_REMINDER, TRIP_REMINDER, etc.
5. **RefundStatus** - PENDING, PROCESSED, FAILED

## Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Payment Reminders | Every 12 hours | Remind unpaid bookings |
| Trip Reminder (7d) | Daily at 9 AM | Remind travelers 7 days before |
| Trip Reminder (1d) | Daily at 8 AM | Remind travelers 1 day before |
| Auto-cancel Unpaid | Every 12 hours | Cancel bookings unpaid 24h |
| Update Exchange Rates | Daily at midnight | Refresh currency rates |

## API Response Examples

### Payment Initiation
```json
{
  "redirectUrl": "https://payment-gateway.com/pay/...",
  "sessionId": "session_123",
  "expiresAt": "2024-01-15T10:30:00Z"
}
```

### Review Statistics
```json
{
  "averageRating": 4.5,
  "totalReviews": 42,
  "distribution": {
    "1": 2,
    "2": 1,
    "3": 5,
    "4": 15,
    "5": 19
  }
}
```

### Currency Conversion
```json
{
  "amount": 1000,
  "baseCurrency": "MAD",
  "convertedAmount": 92.50,
  "targetCurrency": "USD"
}
```

### Wishlist
```json
{
  "wishlists": [
    {
      "id": "w123",
      "userId": "u456",
      "tripTemplate": {
        "id": "t789",
        "title": "Morocco Desert Adventure",
        "averageRating": 4.8,
        "sessions": [
          {
            "startDate": "2024-02-15",
            "price": 1200
          }
        ]
      }
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

## Environment Variables

```env
# Payments
CMI_MERCHANT_ID=your_merchant_id
CMI_API_KEY=your_api_key
CMI_BASE_URL=https://api.cmipay.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Cache
REDIS_URL=redis://localhost:6379

# Services
EXCHANGERATE_API_KEY=your_key
SENDGRID_API_KEY=your_key
AWS_S3_BUCKET=bucket_name

# JWT
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret

# URLs
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

## Testing Commands

```bash
# Unit tests
npm run test

# Integration tests
npm run test:api

# E2E tests
npm run test:e2e

# With coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Deployment Commands

```bash
# Build
npm run build

# Prisma migration
npx prisma migrate deploy

# Docker build
docker build -t ouiboo-api:latest apps/api

# Kubernetes deploy
kubectl apply -f k8s/

# Helm deploy
helm install ouiboo ./helm/ouiboo -f values-prod.yaml
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Modules not found | Import in app.module.ts |
| Migration error | Check DB connection, run `npx prisma migrate reset` |
| WebSocket connection fails | Check JWT token, verify CORS origin |
| Payment verification fails | Verify provider credentials |
| Exchange rates not updating | Check Cron jobs are running |

## Performance Optimization Tips

1. **Implement Caching**
   - Cache popular searches with Redis
   - Cache exchange rates (already done)
   - Cache trending trips

2. **Database Optimization**
   - Indexes on startDate, endDate (already done)
   - Indexes on status, category
   - Denormalize popular aggregations

3. **API Optimization**
   - Implement pagination (already done)
   - Use projection to select only needed fields
   - Implement request compression

4. **Frontend Optimization**
   - Lazy load reviews component
   - Cache wishlist status
   - Implement virtual scrolling for lists

## Security Checklist

- [ ] All payment provider credentials in .env
- [ ] JWT secrets strong and unique
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all DTOs
- [ ] Sensitive data encrypted at database
- [ ] HTTPS enforced in production
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Backups configured and tested

## Documentation Files

- `docs/API.md` - Full API reference
- `docs/ARCHITECTURE.md` - System design
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/CONTRIBUTING.md` - Development guidelines
- `docs/TROUBLESHOOTING.md` - Problem solving
- `docs/IMPLEMENTATION_CHECKLIST.md` - Status tracking
- `docs/IMPLEMENTATION_SUMMARY.md` - Overview of changes

## Support & Resources

- **Bug Reports**: GitHub Issues
- **Questions**: GitHub Discussions
- **Documentation**: `/docs` folder
- **Examples**: API endpoints in controllers
- **Tests**: Unit & integration tests

## Version Information

- **Node.js**: 18+
- **NestJS**: 10+
- **Prisma**: 5+
- **PostgreSQL**: 14+
- **Redis**: 7+
- **Docker**: 20+
- **Kubernetes**: 1.24+

## Success Criteria

✅ All modules created and exported
✅ Database schema updated with all models
✅ 8 enums added for type safety
✅ Scheduled jobs configured
✅ Controllers and services implemented
✅ DTOs with validation
✅ Comprehensive documentation
✅ API endpoints documented
✅ Troubleshooting guide provided
✅ Implementation checklist created

**Status: Ready for integration and testing**
