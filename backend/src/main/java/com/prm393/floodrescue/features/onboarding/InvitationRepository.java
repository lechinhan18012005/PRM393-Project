package com.prm393.floodrescue.features.onboarding;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InvitationRepository extends JpaRepository<AccountInvitation, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from AccountInvitation i where i.tokenHash = :hash")
    Optional<AccountInvitation> findForActivation(@Param("hash") String hash);
}
