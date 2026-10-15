package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class QuoteService {
  private final Catalog catalog;
  private final JdbcTemplate db;
  private final ObjectMapper json;
  private final Clock clock;

  public QuoteService(Catalog catalog, JdbcTemplate db, ObjectMapper json, Clock clock) {
    this.catalog = catalog;
    this.db = db;
    this.json = json;
    this.clock = clock;
  }

  public QuoteView create(QuoteRequest request) {
    BigDecimal multiplier =
        switch (request.scope()) {
          case "standard" -> BigDecimal.ONE;
          case "advanced" -> new BigDecimal("1.50");
          default -> throw new ApiException(BAD_REQUEST, "Choose a valid project scope.");
        };
    Set<String> used = new HashSet<>();
    List<QuoteLine> lines = new ArrayList<>();
    for (Item item : request.items()) {
      if (!used.add(item.serviceId()))
        throw new ApiException(BAD_REQUEST, "A service can only appear once.");
      ServiceOption s = catalog.service(item.serviceId());
      BigDecimal unit = money(s.price().multiply(multiplier));
      lines.add(
          new QuoteLine(
              s.name(),
              item.quantity(),
              unit,
              money(unit.multiply(BigDecimal.valueOf(item.quantity())))));
    }
    used.clear();
    for (String id : request.extras()) {
      if (!used.add(id)) throw new ApiException(BAD_REQUEST, "An extra can only appear once.");
      ExtraOption e = catalog.extra(id);
      lines.add(new QuoteLine(e.name(), 1, e.price(), e.price()));
    }
    BigDecimal subtotal =
        money(lines.stream().map(QuoteLine::total).reduce(BigDecimal.ZERO, BigDecimal::add));
    BigDecimal priority =
        money(request.priority() ? subtotal.multiply(new BigDecimal("0.25")) : BigDecimal.ZERO);
    BigDecimal total = subtotal.add(priority);
    BigDecimal deposit = money(total.multiply(new BigDecimal("0.50")));
    String now = clock.instant().toString(),
        expiry = clock.instant().plus(Duration.ofHours(24)).toString();
    QuoteView quote =
        new QuoteView(
            UUID.randomUUID().toString(),
            List.copyOf(lines),
            subtotal,
            priority,
            total,
            deposit,
            total.subtract(deposit),
            "USD",
            request.scope(),
            request.priority(),
            expiry);
    db.update(
        "INSERT INTO quotes(id,payload,created_at,expires_at) VALUES(?,?,?,?)",
        quote.id(),
        encode(quote),
        now,
        expiry);
    return quote;
  }

  QuoteView decode(String value) {
    try {
      return json.readValue(value, QuoteView.class);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Stored quote could not be read.", e);
    }
  }

  private String encode(QuoteView value) {
    try {
      return json.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  private BigDecimal money(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }
}
