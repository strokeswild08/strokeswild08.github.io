package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;
import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {
  private static final List<String> TIMES = List.of("09:30", "11:00", "14:00", "16:00");
  private static final Set<String> STATUSES =
      Set.of("REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED");
  private final JdbcTemplate db;
  private final QuoteService quotes;
  private final ObjectMapper json;
  private final Clock clock;

  public BookingService(JdbcTemplate db, QuoteService quotes, ObjectMapper json, Clock clock) {
    this.db = db;
    this.quotes = quotes;
    this.json = json;
    this.clock = clock;
  }

  public Availability availability(LocalDate date) {
    validateDate(date);
    List<String> slots =
        TIMES.stream()
            .filter(t -> validTime(date, t))
            .filter(
                t ->
                    db.queryForObject(
                            "SELECT COUNT(*) FROM bookings WHERE slot_key=?",
                            Long.class,
                            slot(date, t))
                        == 0)
            .toList();
    return new Availability(date, clock.getZone().toString(), slots);
  }

  private void validateDate(LocalDate date) {
    LocalDate today = LocalDate.now(clock);
    if (date.isBefore(today) || date.isAfter(today.plusDays(30)))
      throw new ApiException(BAD_REQUEST, "Choose a kickoff within the next 30 days.");
  }

  private boolean validTime(LocalDate date, String time) {
    return date.getDayOfWeek() != DayOfWeek.SATURDAY
        && date.getDayOfWeek() != DayOfWeek.SUNDAY
        && TIMES.contains(time)
        && LocalDateTime.of(date, LocalTime.parse(time))
            .atZone(clock.getZone())
            .toInstant()
            .isAfter(clock.instant().plus(Duration.ofHours(2)));
  }

  private String slot(LocalDate date, String time) {
    return date + "T" + time;
  }

  @Transactional
  public CreatedBooking create(BookingRequest request, String key) {
    if (key == null || !key.matches("[A-Za-z0-9_-]{16,80}"))
      throw new ApiException(
          BAD_REQUEST,
          "Send a valid Idempotency-Key header (16–80 letters, numbers, underscores or hyphens).");
    String hash = hash(request);
    CreatedBooking replay = replay(key, hash);
    if (replay != null) return replay;
    var rows =
        db.queryForList(
            "SELECT payload,expires_at,used FROM quotes WHERE id=? FOR UPDATE", request.quoteId());
    if (rows.isEmpty())
      throw new ApiException(NOT_FOUND, "Quote not found. Please create a fresh quote.");
    // Recheck after the row lock: another request may have finished while this one waited.
    replay = replay(key, hash);
    if (replay != null) return replay;
    var row = rows.get(0);
    if (Boolean.TRUE.equals(row.get("USED")))
      throw new ApiException(CONFLICT, "This quote already has a booking.");
    if (!Instant.parse(row.get("EXPIRES_AT").toString()).isAfter(clock.instant()))
      throw new ApiException(GONE, "This quote has expired. Please create a fresh quote.");
    validateDate(request.date());
    if (!validTime(request.date(), request.time()))
      throw new ApiException(BAD_REQUEST, "That kickoff time is not available.");
    QuoteView quote =
        quotes.decode(
            db.queryForObject(
                "SELECT payload FROM quotes WHERE id=?", String.class, request.quoteId()));
    String id = UUID.randomUUID().toString();
    String reference =
        "SL-"
            + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 12)
                .toUpperCase(Locale.ROOT);
    String token =
        UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    String now = clock.instant().toString();
    db.update(
        """
INSERT INTO bookings(id,reference,access_token,quote_id,idempotency_key,request_hash,
client_name,email,company,brief,kickoff_date,kickoff_time,slot_key,status,total,deposit,created_at,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'REQUESTED',?,?,?,?)
""",
        id,
        reference,
        token,
        request.quoteId(),
        key,
        hash,
        request.clientName().strip(),
        request.email().toLowerCase(Locale.ROOT),
        request.company().strip(),
        request.brief().strip(),
        request.date(),
        request.time(),
        slot(request.date(), request.time()),
        quote.total(),
        quote.deposit(),
        now,
        now);
    db.update("UPDATE quotes SET used=TRUE WHERE id=?", request.quoteId());
    db.update(
        "INSERT INTO booking_events(booking_id,status,created_at) VALUES(?,'REQUESTED',?)",
        id,
        now);
    return new CreatedBooking(byReference(reference), token);
  }

  private CreatedBooking replay(String key, String hash) {
    var rows =
        db.queryForList(
            "SELECT reference,access_token,request_hash FROM bookings WHERE idempotency_key=?",
            key);
    if (rows.isEmpty()) return null;
    var row = rows.get(0);
    if (!hash.equals(row.get("REQUEST_HASH")))
      throw new ApiException(
          CONFLICT, "This request key was already used for different booking details.");
    return new CreatedBooking(
        byReference(row.get("REFERENCE").toString()), row.get("ACCESS_TOKEN").toString());
  }

  private String hash(Object request) {
    try {
      return HexFormat.of()
          .formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(request)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public BookingView customerView(String reference, String token) {
    var tokens =
        db.queryForList(
            "SELECT access_token FROM bookings WHERE reference=?", String.class, reference);
    if (token == null
        || tokens.isEmpty()
        || !MessageDigest.isEqual(
            tokens.get(0).getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8)))
      throw new ApiException(
          NOT_FOUND, "Booking not found. Use the complete private tracking link.");
    return byReference(reference);
  }

  public BookingView byReference(String reference) {
    var list =
        db.query(
            "SELECT b.*,q.payload FROM bookings b JOIN quotes q ON q.id=b.quote_id WHERE"
                + " b.reference=?",
            this::map,
            reference);
    if (list.isEmpty()) throw new ApiException(NOT_FOUND, "Booking not found.");
    return list.get(0);
  }

  private BookingView map(ResultSet r, int index) throws SQLException {
    var events =
        db.query(
            "SELECT status,created_at FROM booking_events WHERE booking_id=? ORDER BY id",
            (rs, n) -> new Event(rs.getString(1), rs.getString(2)),
            r.getString("id"));
    return new BookingView(
        r.getString("reference"),
        r.getString("client_name"),
        r.getString("email"),
        r.getString("company"),
        r.getString("brief"),
        r.getDate("kickoff_date").toLocalDate(),
        r.getString("kickoff_time"),
        clock.getZone().toString(),
        r.getString("status"),
        quotes.decode(r.getString("payload")),
        r.getString("created_at"),
        r.getString("updated_at"),
        r.getLong("version"),
        events);
  }

  @Transactional
  public BookingView update(String reference, StatusUpdate change) {
    if (!STATUSES.contains(change.status()))
      throw new ApiException(BAD_REQUEST, "Unknown booking status.");
    BookingView before = byReference(reference);
    if (before.version() != change.version())
      throw new ApiException(CONFLICT, "This booking changed. Refresh before saving again.");
    if (before.status().equals(change.status())) return before;
    Set<String> allowed =
        switch (before.status()) {
          case "REQUESTED" -> Set.of("CONFIRMED", "CANCELLED");
          case "CONFIRMED" -> Set.of("IN_PROGRESS", "CANCELLED");
          case "IN_PROGRESS" -> Set.of("COMPLETED", "CANCELLED");
          default -> Set.of();
        };
    if (!allowed.contains(change.status()))
      throw new ApiException(CONFLICT, "That status transition is not allowed.");
    String now = clock.instant().toString();
    int changed =
        db.update(
            "UPDATE bookings SET status=?,updated_at=?,version=version+1,slot_key=CASE WHEN"
                + " ?='CANCELLED' THEN NULL ELSE slot_key END WHERE reference=? AND version=?",
            change.status(),
            now,
            change.status(),
            reference,
            change.version());
    if (changed == 0)
      throw new ApiException(CONFLICT, "This booking changed. Refresh before saving again.");
    db.update(
        "INSERT INTO booking_events(booking_id,status,created_at) SELECT id,?,? FROM bookings WHERE"
            + " reference=?",
        change.status(),
        now,
        reference);
    return byReference(reference);
  }

  public AdminPage list(String status, String search, int page) {
    if (!status.isEmpty() && !STATUSES.contains(status))
      throw new ApiException(BAD_REQUEST, "Unknown status filter.");
    if (page < 0 || page > 1000 || search.length() > 100)
      throw new ApiException(BAD_REQUEST, "Invalid search or page.");
    String where =
        " WHERE (?='' OR b.status=?) AND (LOWER(b.client_name) LIKE ? OR LOWER(b.email) LIKE ? OR"
            + " LOWER(b.reference) LIKE ? OR LOWER(b.company) LIKE ?)";
    String term = "%" + search.toLowerCase(Locale.ROOT) + "%";
    Object[] params = {status, status, term, term, term, term};
    Long total = db.queryForObject("SELECT COUNT(*) FROM bookings b" + where, Long.class, params);
    List<Object> args = new ArrayList<>(Arrays.asList(params));
    args.add(20);
    args.add(page * 20);
    var items =
        db.query(
            "SELECT b.*,q.payload FROM bookings b JOIN quotes q ON q.id=b.quote_id"
                + where
                + " ORDER BY b.created_at DESC,b.reference DESC LIMIT ? OFFSET ?",
            this::map,
            args.toArray());
    return new AdminPage(items, total, page, 20, stats());
  }

  private long count(String status) {
    return db.queryForObject("SELECT COUNT(*) FROM bookings WHERE status=?", Long.class, status);
  }

  private AdminStats stats() {
    BigDecimal value =
        db.queryForObject(
            "SELECT COALESCE(SUM(total),0) FROM bookings WHERE status IN"
                + " ('REQUESTED','CONFIRMED','IN_PROGRESS')",
            BigDecimal.class);
    return new AdminStats(
        count("REQUESTED"),
        count("CONFIRMED"),
        count("IN_PROGRESS"),
        count("COMPLETED"),
        count("CANCELLED"),
        value);
  }

  public String csv() {
    StringBuilder out =
        new StringBuilder(
            "Reference,Client,Email,Company,Date,Time,Timezone,Status,Total USD,Deposit USD\r\n");
    db.query(
        "SELECT * FROM bookings ORDER BY created_at DESC",
        (org.springframework.jdbc.core.RowCallbackHandler)
            r -> {
              List<String> fields =
                  List.of(
                      r.getString("reference"),
                      r.getString("client_name"),
                      r.getString("email"),
                      r.getString("company"),
                      r.getDate("kickoff_date").toString(),
                      r.getString("kickoff_time"),
                      clock.getZone().toString(),
                      r.getString("status"),
                      r.getBigDecimal("total").toPlainString(),
                      r.getBigDecimal("deposit").toPlainString());
              out.append(String.join(",", fields.stream().map(this::csvField).toList()))
                  .append("\r\n");
            });
    return out.toString();
  }

  private String csvField(String value) {
    String trimmed = value.stripLeading();
    if ((!value.isEmpty() && "=+-@\t\r\n".indexOf(value.charAt(0)) >= 0)
        || (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0)) value = "'" + value;
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }
}
