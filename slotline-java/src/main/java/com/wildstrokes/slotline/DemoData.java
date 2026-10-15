package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;

import java.time.*;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.demo-data", havingValue = "true")
public class DemoData implements ApplicationRunner {
  private final JdbcTemplate db;
  private final QuoteService quotes;
  private final BookingService bookings;
  private final Clock clock;

  public DemoData(JdbcTemplate db, QuoteService quotes, BookingService bookings, Clock clock) {
    this.db = db;
    this.quotes = quotes;
    this.bookings = bookings;
    this.clock = clock;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (db.queryForObject("SELECT COUNT(*) FROM bookings", Long.class) > 0) return;
    String[] names = {
      "Rowan Studio (demo)", "Northstar Games (demo)", "Juniper Co. (demo)", "Orbit Lab (demo)"
    };
    String[] services = {"website", "game-ui", "api", "support"};
    LocalDate date = LocalDate.now(clock).plusDays(1);
    for (int i = 0; i < names.length; i++) {
      while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY)
        date = date.plusDays(1);
      QuoteView q =
          quotes.create(
              new QuoteRequest(
                  List.of(new Item(services[i], 1)),
                  i == 1 ? "advanced" : "standard",
                  List.of("docs"),
                  i == 0));
      var created =
          bookings.create(
              new BookingRequest(
                  q.id(),
                  names[i],
                  "client" + i + "@demo.example",
                  names[i],
                  "Sample project brief for portfolio demonstration only.",
                  date,
                  "11:00"),
              UUID.randomUUID().toString());
      BookingView b = created.booking();
      if (i > 0) b = bookings.update(b.reference(), new StatusUpdate("CONFIRMED", b.version()));
      if (i > 1) b = bookings.update(b.reference(), new StatusUpdate("IN_PROGRESS", b.version()));
      if (i > 2) bookings.update(b.reference(), new StatusUpdate("COMPLETED", b.version()));
      date = date.plusDays(1);
    }
  }
}
