# Validation record

Validated on 15 October 2026 using Java 17 and Spring Boot 3.5.16.

## Automated Java tests

`BookingApiTest`: **11 tests, 0 failures, 0 errors, 0 skipped**.

The suite covers decimal pricing and deposit rounding, scope multipliers, invalid catalogue entries and client price tampering, duplicate selections, CSRF and role checks, real session login, private tracking, retry idempotency, quote expiry, booking lifecycle versions, cancellation slot release, simultaneous slot contention, admin filtering and safe CSV output.

## Running application checks

The packaged application was started and exercised over HTTP with real cookies and session-bound CSRF tokens.

| Check | Result |
| --- | --- |
| Customer page, static assets and security headers | Passed |
| Server quote: $543.75, deposit $271.88, balance $271.87 | Passed |
| Booking creation and identical retry | Passed |
| Unauthenticated admin access rejected | Passed |
| Tracking without the private token rejected | Passed |
| Admin form login, fresh CSRF token and status update | Passed |
| Tracking tokens absent from CSV export | Passed |
| Admin logout | Passed |
| Confirmed booking and event history survive application restart | Passed |
| JavaScript syntax checks | Passed |

## Visual verification limit

Automated desktop/mobile browser verification could not run: the available Chromium processes failed to launch in the execution environment. Responsive styles and semantic controls are implemented, but desktop/mobile rendering and end-to-end browser interaction still need a manual pass. Follow the walkthrough in the root README at desktop and mobile widths before publishing a hosted demo.

This record does not claim payment processing, email delivery, production security certification or a public deployment.
