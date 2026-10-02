# API Documentation

## Authentication

All API endpoints require authentication via JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Endpoints

### Payments API

#### Initiate Payment
```
POST /payments/initiate
Content-Type: application/json

{
  "bookingId": "string",
  "amount": number,
  "travelerEmail": "string",
  "travelerName": "string",
  "provider": "CMI" | "STRIPE" | "PAYPAL"
}

Response:
{
  "redirectUrl": "string",
  "sessionId": "string",
  "expiresAt": "ISO8601 date"
}
```

#### Verify Payment
```
POST /payments/verify
Content-Type: application/json

{
  "transactionId": "string",
  "bookingId": "string",
  "provider": "CMI" | "STRIPE"
}

Response:
{
  "status": "success" | "failure" | "pending",
  "transactionId": "string",
  "errorMessage": "string"
}
```

#### Process Refund
```
POST /payments/refund
Content-Type: application/json

{
  "transactionId": "string",
  "amount": number,
  "provider": "CMI" | "STRIPE"
}

Response:
{
  "success": boolean,
  "refundId": "string",
  "error": "string"
}
```

### Reviews API

#### Create Review
```
POST /bookings/:bookingId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 1-5,
  "comment": "string (optional, max 500 chars)"
}

Response:
{
  "id": "string",
  "rating": number,
  "comment": "string",
  "createdAt": "ISO8601 date"
}
```

#### Get Trip Reviews
```
GET /trips/:tripId/reviews?page=1&limit=10

Response:
{
  "reviews": [...],
  "total": number,
  "page": number,
  "pages": number
}
```

#### Get Review Stats
```
GET /trips/:tripId/reviews/stats

Response:
{
  "averageRating": number,
  "totalReviews": number,
  "distribution": {
    "1": number,
    "2": number,
    "3": number,
    "4": number,
    "5": number
  }
}
```

### Wishlist API

#### Add to Wishlist
```
POST /users/wishlist/:tripId
Authorization: Bearer <token>

Response:
{
  "id": "string",
  "userId": "string",
  "tripTemplateId": "string",
  "createdAt": "ISO8601 date"
}
```

#### Get User Wishlist
```
GET /users/wishlist?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "wishlists": [...],
  "total": number,
  "page": number,
  "pages": number
}
```

### Analytics API

#### Get Revenue Trends
```
GET /analytics/revenue-trends?startDate=2024-01-01&endDate=2024-12-31&period=daily
Authorization: Bearer <token>

Response:
[
  {
    "date": "string",
    "amount": number
  }
]
```

#### Get Conversion Funnel
```
GET /analytics/conversion-funnel?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>

Response:
{
  "views": number,
  "bookingAttempts": number,
  "confirmed": number,
  "completed": number,
  "conversionRate": number
}
```

### Currency API

#### Get Exchange Rate
```
GET /currency/rates?target=USD&force=false

Response:
{
  "baseCurrency": "MAD",
  "targetCurrency": "USD",
  "rate": number
}
```

#### Convert Currency
```
GET /currency/convert?amount=1000&target=USD

Response:
{
  "amount": number,
  "baseCurrency": "MAD",
  "convertedAmount": number,
  "targetCurrency": "USD"
}
```

### Messages API

#### Send Message
```
POST /messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string",
  "attachmentUrl": "string (optional)",
  "recipientId": "string"
}
```

#### Get Conversations
```
GET /messages/conversations?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Messages in Conversation
```
GET /messages/conversations/:conversationId?page=1&limit=50
Authorization: Bearer <token>
```

## Webhooks

### Payment Webhooks

All payment providers send webhooks to `/payments/webhook/:provider`

**CMI Webhook**
```
POST /payments/webhook/CMI
X-Signature: <HMAC-SHA256 signature>

{
  "event": "payment.success" | "payment.failure" | "payment.pending",
  "transactionId": "string",
  "bookingId": "string",
  "amount": number,
  "status": "string"
}
```

**Stripe Webhook**
```
POST /payments/webhook/STRIPE
X-Signature: <Stripe signature>

Stripe Event JSON
```

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": number,
  "message": "string",
  "error": "string"
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

API requests are rate limited to 100 requests per minute per user.

## Versioning

Current API version: v1

All endpoints are prefixed with `/api/v1`
