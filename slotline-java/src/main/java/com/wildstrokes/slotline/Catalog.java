package com.wildstrokes.slotline;

import static com.wildstrokes.slotline.ApiModels.*;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class Catalog {
  private final List<ServiceOption> services =
      List.of(
          new ServiceOption(
              "website",
              "Website build",
              "A responsive website with a clear, focused structure.",
              new BigDecimal("240.00"),
              "window"),
          new ServiceOption(
              "game-ui",
              "Game UI implementation",
              "Menus, HUDs and interface behaviour for your game.",
              new BigDecimal("180.00"),
              "game"),
          new ServiceOption(
              "api",
              "API integration",
              "Connect your app to the tools your business uses.",
              new BigDecimal("160.00"),
              "link"),
          new ServiceOption(
              "support",
              "Support sprint",
              "A focused round of fixes on an existing project.",
              new BigDecimal("90.00"),
              "bolt"));
  private final List<ExtraOption> extras =
      List.of(
          new ExtraOption("docs", "Handover documentation", new BigDecimal("35.00")),
          new ExtraOption("training", "Team walkthrough", new BigDecimal("45.00")),
          new ExtraOption("revision", "Extra revision round", new BigDecimal("25.00")));

  public List<ServiceOption> services() {
    return services;
  }

  public List<ExtraOption> extras() {
    return extras;
  }

  public ServiceOption service(String id) {
    return services.stream()
        .filter(s -> s.id().equals(id))
        .findFirst()
        .orElseThrow(
            () ->
                new ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Unknown service."));
  }

  public ExtraOption extra(String id) {
    return extras.stream()
        .filter(s -> s.id().equals(id))
        .findFirst()
        .orElseThrow(
            () ->
                new ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Unknown extra."));
  }
}
