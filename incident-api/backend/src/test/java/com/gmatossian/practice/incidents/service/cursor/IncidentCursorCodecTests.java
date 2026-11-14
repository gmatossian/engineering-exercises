package com.gmatossian.practice.incidents.service.cursor;

import com.gmatossian.practice.incidents.repository.Cursor;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentSearchException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class IncidentCursorCodecTests {

    private final IncidentCursorCodec codec = new IncidentCursorCodec();
    private final Cursor cursor = new Cursor(42, Instant.parse("2026-11-12T18:30:00.123456789Z"));

    @Test
    void roundTripsIdAndNanosecondTimestampUsingOnlyBase64() {
        String token = codec.encode(cursor);

        assertTrue(token.matches("[A-Za-z0-9_-]+"));
        assertEquals("42|2026-11-12T18:30:00.123456789Z",
                new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8));
        assertEquals(cursor, codec.decode(token));

        for (long id : new long[]{0, -1}) {
            Cursor position = new Cursor(id, cursor.lastOccurredAt());
            assertEquals(position, codec.decode(codec.encode(position)));
        }
    }

    @Test
    void rejectsMalformedTokensAndInvalidPositions() {
        for (String token : List.of("", " ", "###", "a.b.c", "not-a-cursor")) {
            assertThrows(InvalidIncidentSearchException.class, () -> codec.decode(token));
        }
        for (String payload : List.of("42", "42|bad-time", "not-an-id|2026-11-12T18:30:00Z",
                "42|2026-11-12T18:30:00Z|extra", "42|+1000000000-12-31T23:59:59.999999999Z")) {
            String token = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
            assertThrows(InvalidIncidentSearchException.class, () -> codec.decode(token));
        }
        assertThrows(InvalidIncidentSearchException.class, () -> codec.decode(null));
    }

    @Test
    void decodingNeedsNoKeyOrInstanceState() {
        assertEquals(cursor, new IncidentCursorCodec().decode(codec.encode(cursor)));
    }
}
