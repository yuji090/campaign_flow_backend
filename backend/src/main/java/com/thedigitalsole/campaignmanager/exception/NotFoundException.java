package com.thedigitalsole.campaignmanager.exception;

/** The requested record does not exist. Returned as 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String what, Long id) {
        return new NotFoundException(what + " not found with id: " + id);
    }
}
