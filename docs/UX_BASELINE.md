# UX/UI Quality Baseline

## Brand Palette Emphasis

One shared brand palette for every app; the canonical values live in
`packages/tokens/tokens.css`. Apps differentiate by emphasis, never by
separate brand colours: Traveller - sunset orange leads, deep blue
supports. Agency - deep blue leads, sunset orange only for actions and
accents. Admin and Landing follow the agency (operator) emphasis unless a
screen is traveller-facing marketing. The logo is unified across all apps
and is never recoloured per app.

## Cross-Portal Standards

### All Portals (Traveler, Agency, Admin)
- [ ] Consistent header/navigation structure
- [ ] Loading states for all async operations
- [ ] Empty states with actionable guidance
- [ ] Error states with retry options
- [ ] Success confirmations
- [ ] Mobile responsive (375px minimum)
- [ ] Keyboard navigable
- [ ] Visible focus indicators
- [ ] RTL support (Arabic)

### Traveler (Highest Priority)
- [ ] Homepage: clear value proposition, no empty catalog with conversion language
- [ ] Search: filters work, results load < 2s
- [ ] Trip detail: gallery, price, availability, reviews all render
- [ ] Booking flow: date selection → details → payment → confirmation
- [ ] All pages have proper meta tags, OG images

### Agency
- [ ] Dashboard: key metrics visible
- [ ] Trip management: create, edit, publish flows
- [ ] Booking management: list, filter, details
- [ ] No raw translation keys visible

### Admin
- [ ] Login: no infinite loading spinner
- [ ] Dashboard: operational metrics
- [ ] Moderation queues: approve/reject flows

## Non-Happy States Checklist
- [ ] Network error → retry button
- [ ] 404 → helpful message + navigation
- [ ] 500 → error ID for support
- [ ] Empty list → "no results" + clear filters
- [ ] Loading → skeleton or spinner (with timeout)

## Accessibility Baseline
- [ ] axe-core passes on key pages
- [ ] Color contrast WCAG AA
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader labels on icon buttons
