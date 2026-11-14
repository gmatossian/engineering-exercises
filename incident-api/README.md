# Incident API exercise

A small incident-management API, built in incremental, runnable checkpoints.
This history is a **reconstructed development walkthrough** of an existing,
agent-assisted exercise, not a record of the original edit sequence or an
independent/timed assessment. Commits retain their actual creation dates.

## Current checkpoint

**1. Create Spring Boot scaffold**

Each checkpoint is intended to compile and pass its applicable tests. The
complete sequence introduces the scaffold, model, database, list endpoint,
detail endpoint and status update in that order.

## Run

Prerequisite: a JDK 21 installation selected in `JAVA_HOME` (verified with
Temurin 21). Maven is supplied by the wrapper (3.10.0); Spring Boot is 4.1.2.
From this directory:

```sh
./mvnw test
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd`. The first run needs network access to download
Maven/dependencies. Subsequent runs can use `./mvnw --offline test` if cached.
The application binds to `127.0.0.1:8081`; `/actuator/health` verifies startup.
Use the requests available at this checkpoint in [requests.http](requests.http).

## Available at this checkpoint

- Java 21 / Spring Boot application, Web MVC, Validation and Actuator; one context-load test. No incident endpoint or database yet.

Checkpoint verification target: **1 passing tests**. Verification covers the current features, with further tests introduced alongside later endpoints.
