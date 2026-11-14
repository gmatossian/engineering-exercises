package com.gmatossian.practice.incidents.service.cursor;

import com.gmatossian.practice.incidents.repository.Cursor;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentSearchException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

/**
 * Simple exercise format: Base64URL of "id|timestamp". This is not encryption.
 * For real-world use, consider fingerprints to bind search filters and signing
 * to detect tampering. Here, clients must start a new page sequence when filters change.
 */
@Component
public class IncidentCursorCodec {

    public String encode(Cursor cursor) {
        String payload = cursor.lastId() + "|" + cursor.lastOccurredAt();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }

    public Cursor decode(String token) {
        if (token == null || token.isBlank()) {
            throw new InvalidIncidentSearchException("Invalid cursor");
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] fields = payload.split("\\|", -1);
            if (fields.length != 2) {
                throw new IllegalArgumentException("Expected an ID and timestamp");
            }
            long id = Long.parseLong(fields[0]);
            Instant time = Instant.parse(fields[1]);
            time.atOffset(ZoneOffset.UTC); // Must also fit JDBC's OffsetDateTime representation.
            return new Cursor(id, time);
        } catch (IllegalArgumentException | DateTimeException ex) {
            throw new InvalidIncidentSearchException("Invalid cursor", ex);
        }
    }
}
