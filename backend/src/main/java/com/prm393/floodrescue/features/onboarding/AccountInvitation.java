package com.prm393.floodrescue.features.onboarding;

import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.garage.entity.*;

import jakarta.persistence.*;

import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class AccountInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne private User issuedBy;
    @ManyToOne private Garage garage;
    @ManyToOne private GarageBranch branch;
    private LocalDateTime expiresAt;
    private boolean used;
}
