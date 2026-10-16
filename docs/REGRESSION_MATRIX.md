# Golden-Path Regression Matrix

## Critical User Journeys

### Traveler
| Journey | Steps | Expected |
|---------|-------|----------|
| Search trips | Search → Filter → View results | Results load < 2s, filters work |
| View trip detail | Click trip → View gallery, price, availability | All sections render |
| Book trip | Select date → Enter details → Pay → Confirm | Booking confirmed, email sent |
| User login | Enter credentials → Submit | Dashboard reached |

### Agency
| Journey | Steps | Expected |
|---------|-------|----------|
| Login | Enter credentials → Submit | Dashboard reached |
| Create trip | Fill form → Upload images → Publish | Trip visible to travelers |
| View bookings | Dashboard → Bookings | List loads with correct data |

### Admin
| Journey | Steps | Expected |
|---------|-------|----------|
| Login | Enter credentials → Submit | Dashboard reached |
| Moderate content | Review queue → Approve/Reject | Status updated |

## Test Coverage

- [ ] All journeys covered by browser E2E
- [ ] API E2E covers backend for each journey
- [ ] Mobile viewport tested (375×667)
- [ ] Keyboard navigation tested

## Run Frequency

- On every PR to staging
- Daily scheduled run
- Before production release
