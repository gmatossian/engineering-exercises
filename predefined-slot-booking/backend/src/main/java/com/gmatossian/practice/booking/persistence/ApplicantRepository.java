package com.gmatossian.practice.booking.persistence;

import com.gmatossian.practice.booking.domain.Applicant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicantRepository extends JpaRepository<Applicant, Long> {}
