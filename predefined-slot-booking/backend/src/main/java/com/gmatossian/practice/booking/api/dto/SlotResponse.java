package com.gmatossian.practice.booking.api.dto;

import java.time.Instant;

public record SlotResponse(long id, Instant startTime, Instant endTime) {}
