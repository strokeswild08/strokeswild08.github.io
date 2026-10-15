package com.wildstrokes.slotline;

import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService users(
      @Value("${app.admin-password}") String password, BCryptPasswordEncoder encoder) {
    if (password.isBlank()) {
      password = "SL-" + UUID.randomUUID();
      LoggerFactory.getLogger(SecurityConfig.class)
          .warn(
              "Temporary local admin password: {} (username: admin). Set ADMIN_PASSWORD to keep it"
                  + " across restarts.",
              password);
    }
    if (password.length() < 12)
      throw new IllegalArgumentException("ADMIN_PASSWORD must contain at least 12 characters.");
    return new InMemoryUserDetailsManager(
        User.withUsername("admin").password(encoder.encode(password)).roles("ADMIN").build());
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers(
                        HttpMethod.GET,
                        "/",
                        "/*.html",
                        "/*.css",
                        "/*.js",
                        "/favicon.svg",
                        "/api/catalog",
                        "/api/csrf",
                        "/api/session",
                        "/api/availability",
                        "/api/bookings/*",
                        "/api/health")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/quotes", "/api/bookings")
                    .permitAll()
                    .requestMatchers("/error")
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .formLogin(
            form ->
                form.loginProcessingUrl("/api/session")
                    .successHandler(
                        (req, res, auth) -> {
                          res.setContentType("application/json");
                          res.getWriter().write("{\"authenticated\":true}");
                        })
                    .failureHandler(
                        (req, res, e) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter()
                              .write("{\"message\":\"Username or password is incorrect.\"}");
                        })
                    .permitAll())
        .logout(
            logout ->
                logout
                    .logoutUrl("/api/logout")
                    .logoutSuccessHandler((req, res, auth) -> res.setStatus(204)))
        .exceptionHandling(
            errors ->
                errors
                    .authenticationEntryPoint(
                        (req, res, e) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"message\":\"Sign in to continue.\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, e) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter()
                              .write(
                                  "{\"message\":\"Session check failed. Refresh the page and try"
                                      + " again.\"}");
                        }))
        .headers(
            headers ->
                headers.contentSecurityPolicy(
                    csp ->
                        csp.policyDirectives(
                            "default-src 'self'; script-src 'self'; style-src 'self'; img-src"
                                + " 'self' data:; connect-src 'self'; object-src 'none'; base-uri"
                                + " 'self'; frame-ancestors 'none'; form-action 'self'")));
    // Session-based CSRF protection stays enabled for public writes, login, admin writes and
    // logout.
    return http.build();
  }
}
