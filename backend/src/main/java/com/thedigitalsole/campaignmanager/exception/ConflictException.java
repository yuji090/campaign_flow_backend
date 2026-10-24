package com.thedigitalsole.campaignmanager.exception;

/** The request clashes with the current data (duplicate, stale version, protected history). Returned as 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
