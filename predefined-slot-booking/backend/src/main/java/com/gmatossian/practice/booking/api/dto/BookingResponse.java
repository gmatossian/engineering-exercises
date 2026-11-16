package com.gmatossian.practice.booking.api.dto;

import com.gmatossian.practice.booking.domain.BookingStatus;

// Initial DTO shape for the exercise; entities themselves are not HTTP responses.
public record BookingResponse(long id, SlotResponse slot, long applicantId,
                              BookingStatus status, long version) {}
