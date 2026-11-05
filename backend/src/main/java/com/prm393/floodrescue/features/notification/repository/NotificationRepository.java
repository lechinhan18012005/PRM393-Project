package com.prm393.floodrescue.features.notification.repository;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n WHERE (n.recipientUser.id = :userId OR n.recipientRole = :role) ORDER BY n.createdAt DESC")
    Page<Notification> findAllByRecipient(@Param("userId") Long userId, @Param("role") Role role, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE (n.recipientUser.id = :userId OR n.recipientRole = :role) AND n.read = false ORDER BY n.createdAt DESC")
    Page<Notification> findUnreadByRecipient(@Param("userId") Long userId, @Param("role") Role role, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Notification n WHERE (n.recipientUser.id = :userId OR n.recipientRole = :role) AND n.read = false")
    long countUnreadByRecipient(@Param("userId") Long userId, @Param("role") Role role);

    @Query("SELECT n FROM Notification n WHERE n.id = :id AND (n.recipientUser.id = :userId OR n.recipientRole = :role)")
    Optional<Notification> findByIdAndRecipient(@Param("id") Long id, @Param("userId") Long userId, @Param("role") Role role);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true, n.readAt = :now WHERE (n.recipientUser.id = :userId OR n.recipientRole = :role) AND n.read = false")
    int markAllAsReadByRecipient(@Param("userId") Long userId, @Param("role") Role role, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM Notification n WHERE (n.recipientUser.id = :userId OR n.recipientRole = :role)")
    int deleteAllByRecipient(@Param("userId") Long userId, @Param("role") Role role);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.id = :id AND (n.recipientUser.id = :userId OR n.recipientRole = :role)")
    int deleteByIdAndRecipient(@Param("id") Long id, @Param("userId") Long userId, @Param("role") Role role);
}
