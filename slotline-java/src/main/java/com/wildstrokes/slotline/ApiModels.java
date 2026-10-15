package com.wildstrokes.slotline;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class ApiModels {
  private ApiModels() {}

  public record Item(@NotBlank String serviceId, @Min(1) @Max(5) int quantity) {}

  public record QuoteRequest(
      @NotEmpty @Size(max = 4) List<@Valid Item> items,
      @NotBlank String scope,
      @NotNull @Size(max = 3) List<@NotBlank String> extras,
      boolean priority) {}

  public record ServiceOption(
      String id, String name, String description, BigDecimal price, String icon) {}

  public record ExtraOption(String id, String name, BigDecimal price) {}

  public record QuoteLine(String label, int quantity, BigDecimal unitPrice, BigDecimal total) {}

  public record QuoteView(
      String id,
      List<QuoteLine> lines,
      BigDecimal subtotal,
      BigDecimal priorityFee,
      BigDecimal total,
      BigDecimal deposit,
      BigDecimal balance,
      String currency,
      String scope,
      boolean priority,
      String expiresAt) {}

  public record BookingRequest(
      @NotBlank @Pattern(regexp = "[0-9a-f-]{36}") String quoteId,
      @NotBlank @Size(max = 100) String clientName,
      @NotBlank @Email @Size(max = 254) String email,
      @NotNull @Size(max = 120) String company,
      @NotBlank @Size(min = 15, max = 3000) String brief,
      @NotNull LocalDate date,
      @NotBlank @Pattern(regexp = "\\d{2}:\\d{2}") String time) {}

  public record StatusUpdate(@NotBlank String status, @Min(0) long version) {}

  public record BookingView(
      String reference,
      String clientName,
      String email,
      String company,
      String brief,
      LocalDate date,
      String time,
      String zone,
      String status,
      QuoteView quote,
      String createdAt,
      String updatedAt,
      long version,
      List<Event> events) {}

  public record CreatedBooking(BookingView booking, String accessToken) {}

  public record Event(String status, String createdAt) {}

  public record Availability(LocalDate date, String zone, List<String> slots) {}

  public record AdminStats(
      long requests,
      long confirmed,
      long inProgress,
      long completed,
      long cancelled,
      BigDecimal pipelineValue) {}

  public record AdminPage(
      List<BookingView> bookings, long total, int page, int pageSize, AdminStats stats) {}
}
