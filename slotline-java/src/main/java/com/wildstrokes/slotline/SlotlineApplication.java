package com.wildstrokes.slotline;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class SlotlineApplication {
  public static void main(String[] args) {
    SpringApplication.run(SlotlineApplication.class, args);
  }

  @Bean
  Clock clock(@Value("${app.zone}") String zone) {
    return Clock.system(ZoneId.of(zone));
  }
}
