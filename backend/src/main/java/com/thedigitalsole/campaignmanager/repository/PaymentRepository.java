package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.payment.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Throws 404 when the id does not exist
    default Payment getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> NotFoundException.of("Payment", id));
    }

    List<Payment> findByPartnerIdOrderByDateDescIdDesc(Long partnerId);

    @Query("""
            select p from Payment p
            join fetch p.partner
            where p.date between :from and :to
            order by p.date desc, p.id desc
            """)
    List<Payment> findAllInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("select p from Payment p join fetch p.partner")
    List<Payment> findAllWithPartner();

    boolean existsByPartnerId(Long partnerId);
}
