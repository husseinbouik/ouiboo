# Keyboard checkout walkthrough (#332)

A full checkout completed with **keyboard input only** (Tab / Enter /
typing — no mouse, no programmatic clicks), recorded as the manual
walkthrough evidence for #332. The same traversal runs automatically on
every PR in the `lighthouse-a11y` workflow
(`.github/lighthouse/keyboard-checkout-walkthrough.mjs`), so regressions
(a new focus trap, a hidden file input dropping out of the Tab order, an
unnamed control) fail CI instead of waiting for the next manual pass.

First recorded run: 2026-10-23, against the traveler app + e2e mock API
(trip-1 → booking-1), Chromium. Result: **PASS** — zero traps, every
stop visible, booking submitted.

## What the pass covers

- Search → trip card link → trip detail (session picker is a
  keyboard-operable radio) → "Book Now" → checkout.
- Checkout: back button (named), session radio (named with dates +
  seats), guest count, full name, phone — all labelled and reachable in
  order (the document number field was removed in #466; the form now
  shows an "agency may check ID at departure" note instead, which the
  CI walkthrough asserts); the payment-proof file input is in the Tab
  order (sr-only, with a visible focus ring on its label — previously
  `hidden`, which removed it from the keyboard flow entirely).
- Submit via Enter on "Complete Booking" lands on
  `/checkout/confirmation` with "Booking submitted".
- Every stop is asserted visible (bounding box in viewport and a
  computed outline/box-shadow/text-decoration focus indicator), and
  consecutive identical focus targets abort the run as a trap.

## Recorded tab stops

- 01. [search] <a> "Skip to content"
- 02. [search] <a> "O
Ouiboo"
- 03. [search] <a> "Explore"
- 04. [search] <a> "Featured"
- 05. [search] <a> "Wishlist
1"
- 06. [search] <button> "Switch language current is EN"
- 07. [search] <button> "Toggle theme"
- 08. [search] <button> "Open profile menu"
- 09. [search] <a> "Profile"
- 10. [search] <a> "Wishlist"
- 11. [search] <a> "My Bookings"
- 12. [search] <button> "Sign Out"
- 13. [search] <input> "Destination, activity or keyword"
- 14. [search] <button> "Search"
- 15. [search] <button> "Adventure"
- 16. [search] <button> "Cultural"
- 17. [search] <button> "Luxury"
- 18. [search] <button> "Budget"
- 19. [search] <button> "Nature"
- 20. [search] <button> "Newest"
- 21. [search] <button> "Price"
- 22. [search] <button> "Rating"
- 23. [search] <button> "Popularity"
- 24. [search] <button> "More filters"
- 25. [search] <button> "Toggle sort order"
- 26. [search] <button> "Previous image"
- 27. [search] <button> "Next image"
- 28. [search] <button> "Add to wishlist"
- 29. [search] <a> "Atlas Weekend Escape
New
VERIFIED AGENCY
Marrakech"
- 30. [search] <a> "Atlas Weekend Escape
New
VERIFIED AGENCY
Marrakech" — press Enter
- 31. [trip] <a> "Back to Catalog"
- 32. [trip] <button> "View image 1"
- 33. [trip] <button> "View image 2"
- 34. [trip] <button> "View image 2"
- 35. [trip] <div> "May 10 - May 12
8 spots left"
- 36. [trip] <div> "May 10 - May 12
8 spots left" — press Enter to select the session
- 37. [trip] <button> "Book Now"
- 38. [trip] <button> "Book Now" — press Enter
- 39. [checkout] <button> "Go back"
- 40. [checkout] <button> "5/10/2027 - 5/12/2027, 8 seats left"
- 41. [checkout] <input#guest-count> "1"
- 42. [checkout] <input#full-name> "Test User"
- 43. [checkout] <input#full-name> "Test User" — typed full name
- 44. [checkout] <input#phone-number> "Include country code"
- 45. [checkout] <input#phone-number> "Include country code" — typed phone number
- 46. [checkout] <input#document-number> "Enter document number for insurance"
- 47. [checkout] <input#document-number> "Enter document number for insurance" — typed document number
- 48. [checkout] <input>
- 49. [checkout] <button> "Complete Booking"
- 50. [checkout] <button> "Complete Booking" — press Enter to submit the booking
