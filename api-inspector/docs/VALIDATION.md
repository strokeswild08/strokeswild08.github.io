# Validation

Validated on Linux with OpenJDK 17.0.20, JavaFX 21.0.6 and Gson 2.13.2.

- Main and test sources compiled with Eclipse ECJ 3.37.0 targeting Java 17.
- `CoreChecks` passed all 43 checks using real local HTTP servers and temporary workspace files.
- The actual JavaFX app launched in a Monocle headless display, sent a real request to the embedded `/users` endpoint and rendered a 200 response. `screenshot.png` is a snapshot of that scene.
- The headless framebuffer was configured at 1600×1100 to accommodate the 1280×850 scene; the run exited successfully without rendering exceptions.

The headless smoke run uses classpath JavaFX and prints the expected unnamed-module configuration warning. Maven normally supplies the JavaFX module path. A Maven test attempt was blocked while resolving its resources plugin because the environment could not resolve repo.maven.apache.org; the successful checks above used the directly compiled classes. Maven launch and operating-system window interactions (clipboard and native file dialogs) have not been verified in this environment. No Windows or macOS runtime testing has been performed.
