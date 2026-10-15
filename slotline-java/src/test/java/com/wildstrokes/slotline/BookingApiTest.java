package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:slotline_test;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
      "app.admin-password=Test-only-password-42",
      "app.demo-data=false"
    })
@AutoConfigureMockMvc
@Import(BookingApiTest.FixedClock.class)
class BookingApiTest {
  @TestConfiguration
  static class FixedClock {
    @Bean
    @Primary
    Clock testClock() {
      return Clock.fixed(Instant.parse("2026-10-15T03:00:00Z"), ZoneId.of("Asia/Karachi"));
    }
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate db;
  @Autowired QuoteService quotes;
  @Autowired BookingService bookings;

  @BeforeEach
  void clean() {
    db.update("DELETE FROM booking_events");
    db.update("DELETE FROM bookings");
    db.update("DELETE FROM quotes");
  }

  private String basicQuote() {
    return "{\"items\":[{\"serviceId\":\"website\",\"quantity\":1}],\"scope\":\"standard\",\"extras\":[\"docs\"],\"priority\":false}";
  }

  private JsonNode quote() throws Exception {
    return json.readTree(
        mvc.perform(
                post("/api/quotes")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(basicQuote()))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private String request(String quote, String name, String time) throws Exception {
    return json.writeValueAsString(
        new BookingRequest(
            quote,
            name,
            "client@demo.example",
            "Demo Studio",
            "A small responsive website for our studio.",
            LocalDate.of(2026, 10, 20),
            time));
  }

  private JsonNode book(String quote, String name, String time, String key) throws Exception {
    return json.readTree(
        mvc.perform(
                post("/api/bookings")
                    .with(csrf())
                    .header("Idempotency-Key", key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(request(quote, name, time)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  @Test
  void pricesAreCalculatedOnServerWithExactDepositRounding() throws Exception {
    String body =
        "{\"items\":[{\"serviceId\":\"website\",\"quantity\":1},{\"serviceId\":\"api\",\"quantity\":1}],\"scope\":\"standard\",\"extras\":[\"docs\"],\"priority\":true}";
    mvc.perform(
            post("/api/quotes").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtotal").value(435.00))
        .andExpect(jsonPath("$.priorityFee").value(108.75))
        .andExpect(jsonPath("$.total").value(543.75))
        .andExpect(jsonPath("$.deposit").value(271.88))
        .andExpect(jsonPath("$.balance").value(271.87));
  }

  @Test
  void advancedScopeMultipliesServicesButNotExtras() throws Exception {
    mvc.perform(
            post("/api/quotes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(basicQuote().replace("standard", "advanced")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.total").value(395.00));
  }

  @Test
  void rejectsClientSuppliedTotalAndInvalidCatalogEntries() throws Exception {
    for (String body :
        List.of(
            basicQuote().replace("website", "unknown"),
            basicQuote().replace("\"quantity\":1", "\"quantity\":0"),
            basicQuote().replace("\"priority\":false", "\"priority\":false,\"total\":1")))
      mvc.perform(
              post("/api/quotes")
                  .with(csrf())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(body))
          .andExpect(status().isBadRequest());
  }

  @Test
  void rejectsDuplicateServicesAndExtras() throws Exception {
    mvc.perform(
            post("/api/quotes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(basicQuote().replace("[\"docs\"]", "[\"docs\",\"docs\"]")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/quotes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    basicQuote()
                        .replace(
                            "\"quantity\":1}]",
                            "\"quantity\":1},{\"serviceId\":\"website\",\"quantity\":1}]")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void writesRequireCsrfAndAdminDataRequiresLogin() throws Exception {
    mvc.perform(post("/api/quotes").contentType(MediaType.APPLICATION_JSON).content(basicQuote()))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/bookings")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/export")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/bookings").with(user("viewer").roles("VIEWER")))
        .andExpect(status().isForbidden());
  }

  @Test
  void actualSessionLoginWorksAndWrongPasswordDoesNot() throws Exception {
    mvc.perform(
            post("/api/session").with(csrf()).param("username", "admin").param("password", "wrong"))
        .andExpect(status().isUnauthorized());
    MvcResult login =
        mvc.perform(
                post("/api/session")
                    .with(csrf())
                    .param("username", "admin")
                    .param("password", "Test-only-password-42"))
            .andExpect(status().isOk())
            .andReturn();
    var session =
        (org.springframework.mock.web.MockHttpSession) login.getRequest().getSession(false);
    mvc.perform(get("/api/admin/bookings").session(session)).andExpect(status().isOk());
    mvc.perform(post("/api/logout").session(session).with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  void retryIsIdempotentAndPrivateTrackingRequiresCorrectToken() throws Exception {
    String q = quote().get("id").asText(), key = UUID.randomUUID().toString();
    JsonNode first = book(q, "Alex Example", "09:30", key),
        second = book(q, "Alex Example", "09:30", key);
    assertThat(second.get("booking").get("reference"))
        .isEqualTo(first.get("booking").get("reference"));
    assertThat(db.queryForObject("SELECT COUNT(*) FROM bookings", Long.class)).isEqualTo(1);
    String ref = first.at("/booking/reference").asText();
    mvc.perform(get("/api/bookings/" + ref)).andExpect(status().isNotFound());
    mvc.perform(get("/api/bookings/" + ref).header("X-Booking-Token", "wrong"))
        .andExpect(status().isNotFound());
    mvc.perform(
            get("/api/bookings/" + ref)
                .header("X-Booking-Token", first.get("accessToken").asText()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.clientName").value("Alex Example"));
    mvc.perform(
            post("/api/bookings")
                .with(csrf())
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(request(q, "Different Person", "09:30")))
        .andExpect(status().isConflict());
  }

  @Test
  void expiredQuotesCannotReserveAndInvalidDatesCannotBook() throws Exception {
    String id = quote().get("id").asText();
    db.update("UPDATE quotes SET expires_at='2026-10-14T03:00:00Z' WHERE id=?", id);
    mvc.perform(
            post("/api/bookings")
                .with(csrf())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(request(id, "Alex Example", "09:30")))
        .andExpect(status().isGone());
    mvc.perform(get("/api/availability?date=2026-10-17"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slots").isEmpty());
    mvc.perform(get("/api/availability?date=2026-10-01")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/availability?date=2026-12-01")).andExpect(status().isBadRequest());
  }

  @Test
  void transitionsAreVersionedAndCancellationReleasesTheSlot() throws Exception {
    String q = quote().get("id").asText();
    JsonNode created = book(q, "Alex Example", "11:00", UUID.randomUUID().toString());
    String ref = created.at("/booking/reference").asText();
    mvc.perform(
            patch("/api/admin/bookings/" + ref)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\",\"version\":0}"))
        .andExpect(status().isConflict());
    mvc.perform(
            patch("/api/admin/bookings/" + ref)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONFIRMED\",\"version\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.version").value(1));
    mvc.perform(
            patch("/api/admin/bookings/" + ref)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\",\"version\":0}"))
        .andExpect(status().isConflict());
    mvc.perform(
            patch("/api/admin/bookings/" + ref)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\",\"version\":1}"))
        .andExpect(status().isOk());
    assertThat(bookings.availability(LocalDate.of(2026, 10, 20)).slots()).contains("11:00");
    assertThat(bookings.byReference(ref).events()).hasSize(3);
  }

  @Test
  void concurrentBookingsCannotClaimTheSameSlot() throws Exception {
    QuoteRequest quoteRequest =
        new QuoteRequest(List.of(new Item("website", 1)), "standard", List.of(), false);
    String a = quotes.create(quoteRequest).id(), b = quotes.create(quoteRequest).id();
    CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    try {
      List<Future<Boolean>> results = new ArrayList<>();
      for (String q : List.of(a, b))
        results.add(
            pool.submit(
                () -> {
                  ready.countDown();
                  start.await();
                  try {
                    bookings.create(
                        new BookingRequest(
                            q,
                            "Concurrent Client",
                            "client@demo.example",
                            "Studio",
                            "A concurrent booking test project.",
                            LocalDate.of(2026, 10, 20),
                            "14:00"),
                        UUID.randomUUID().toString());
                    return true;
                  } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    return false;
                  }
                }));
      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      start.countDown();
      int successes = 0;
      for (var f : results) if (f.get(15, TimeUnit.SECONDS)) successes++;
      assertThat(successes).isEqualTo(1);
      assertThat(db.queryForObject("SELECT COUNT(*) FROM bookings", Long.class)).isEqualTo(1);
      assertThat(db.queryForObject("SELECT COUNT(*) FROM quotes WHERE used=TRUE", Long.class))
          .isEqualTo(1);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void adminSearchStatsAndCsvDoNotExposeTrackingSecrets() throws Exception {
    String q = quote().get("id").asText();
    JsonNode created = book(q, "=IMPORTXML(1)", "16:00", UUID.randomUUID().toString());
    mvc.perform(get("/api/admin/bookings?q=IMPORTXML").with(user("admin").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.stats.requests").value(1));
    String csv =
        mvc.perform(get("/api/admin/export").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(csv).contains("'=IMPORTXML(1)").doesNotContain(created.get("accessToken").asText());
    String list =
        mvc.perform(get("/api/admin/bookings").with(user("admin").roles("ADMIN")))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(list).doesNotContain("accessToken").doesNotContain("idempotency");
  }
}
