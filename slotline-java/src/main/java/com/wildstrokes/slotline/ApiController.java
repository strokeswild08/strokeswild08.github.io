package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ApiController {
  private final Catalog catalog;
  private final QuoteService quotes;
  private final BookingService bookings;
  private final Clock clock;
  private final boolean demo;

  public ApiController(
      Catalog catalog,
      QuoteService quotes,
      BookingService bookings,
      Clock clock,
      @Value("${app.demo-data}") boolean demo) {
    this.catalog = catalog;
    this.quotes = quotes;
    this.bookings = bookings;
    this.clock = clock;
    this.demo = demo;
  }

  @ModelAttribute
  public void privateResponses(HttpServletResponse response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "application", "slotline");
  }

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @GetMapping("/session")
  public Map<String, Object> session(Authentication auth) {
    boolean active =
        auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    return Map.of("authenticated", active, "username", active ? auth.getName() : "");
  }

  @GetMapping("/catalog")
  public Map<String, Object> catalog() {
    return Map.of(
        "services",
        catalog.services(),
        "extras",
        catalog.extras(),
        "currency",
        "USD",
        "zone",
        clock.getZone().toString(),
        "today",
        LocalDate.now(clock),
        "lastDate",
        LocalDate.now(clock).plusDays(30),
        "demoData",
        demo);
  }

  @GetMapping("/availability")
  public Availability availability(@RequestParam LocalDate date) {
    return bookings.availability(date);
  }

  @PostMapping("/quotes")
  public ResponseEntity<QuoteView> quote(@Valid @RequestBody QuoteRequest request) {
    return ResponseEntity.status(201).body(quotes.create(request));
  }

  @PostMapping("/bookings")
  public ResponseEntity<CreatedBooking> book(
      @Valid @RequestBody BookingRequest request,
      @RequestHeader(value = "Idempotency-Key", required = false) String key) {
    return ResponseEntity.status(201).body(bookings.create(request, key));
  }

  @GetMapping("/bookings/{reference}")
  public BookingView track(
      @PathVariable String reference,
      @RequestHeader(value = "X-Booking-Token", required = false) String token) {
    return bookings.customerView(reference, token);
  }

  @GetMapping("/admin/bookings")
  public AdminPage list(
      @RequestParam(defaultValue = "") String status,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "0") int page) {
    return bookings.list(status, q, page);
  }

  @GetMapping("/admin/bookings/{reference}")
  public BookingView detail(@PathVariable String reference) {
    return bookings.byReference(reference);
  }

  @PatchMapping("/admin/bookings/{reference}")
  public BookingView update(
      @PathVariable String reference, @Valid @RequestBody StatusUpdate update) {
    return bookings.update(reference, update);
  }

  @GetMapping("/admin/export")
  public ResponseEntity<String> export() {
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .header("Content-Disposition", "attachment; filename=slotline-bookings.csv")
        .body(bookings.csv());
  }
}
