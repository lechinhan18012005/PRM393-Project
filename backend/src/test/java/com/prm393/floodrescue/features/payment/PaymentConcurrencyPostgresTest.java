package com.prm393.floodrescue.features.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.payment.dto.PayOSWebhookPayload;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named = "RUN_PAYMENT_POSTGRES_TESTS", matches = "true")
@SpringBootTest(properties = {"spring.datasource.url=${PAYMENT_TEST_DB_URL:jdbc:postgresql://127.0.0.1:55439/payos_wallet_fix}", "spring.datasource.username=${PAYMENT_TEST_DB_USER:seed_probe}", "spring.datasource.password=${PAYMENT_TEST_DB_PASSWORD:}", "spring.datasource.driver-class-name=org.postgresql.Driver", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentConcurrencyPostgresTest {
    @org.springframework.test.context.DynamicPropertySource
    static void requireIsolatedDatabase(org.springframework.test.context.DynamicPropertyRegistry registry) {
        String url = System.getenv().getOrDefault("PAYMENT_TEST_DB_URL", "jdbc:postgresql://127.0.0.1:55439/payos_wallet_fix");
        if (!url.matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/(payos_wallet_fix|payos_test_[a-zA-Z0-9_]+)")) {
            throw new IllegalArgumentException("This create-drop test requires an isolated local payos_test_* database");
        }
        registry.add("spring.datasource.url", () -> url);
    }
    @Autowired private com.prm393.floodrescue.features.finance.service.FinanceAdminService financeService;
    @Autowired private com.prm393.floodrescue.features.payment.service.PayOSPaymentService pgPaymentService;

    @Test
    void pgTwoDifferentOrdersMustNotLoseWalletCredit() throws Exception {
        long first = createProbePayment();
        RescueOrder secondOrder = new RescueOrder();
        org.springframework.beans.BeanUtils.copyProperties(rescueOrder, secondOrder, "id", "version", "orderCode");
        secondOrder.setOrderCode("PG-PROBE-SECOND");
        secondOrder = rescueOrderRepository.saveAndFlush(secondOrder);
        long second = pgPaymentService.createPayment(customer,
                com.prm393.floodrescue.features.payment.dto.CreatePaymentRequest.builder()
                .rescueOrderId(secondOrder.getId()).build()).getPayosOrderCode();
        BigDecimal netFirst = paymentTransactionRepository.findByPayosOrderCode(first).orElseThrow().getNetGarageAmount();
        BigDecimal netSecond = paymentTransactionRepository.findByPayosOrderCode(second).orElseThrow().getNetGarageAmount();
        // Hold the first UPDATE briefly so both transactions can read the old shared wallet.
        probeJdbc.execute("CREATE FUNCTION probe_delay_wallet() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN PERFORM pg_sleep(2); END IF; RETURN NEW; END $$");
        probeJdbc.execute("CREATE TRIGGER probe_wallet_delay BEFORE UPDATE ON garages FOR EACH ROW EXECUTE FUNCTION probe_delay_wallet()");
        java.util.concurrent.ExecutorService workers = java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.CountDownLatch ready = new java.util.concurrent.CountDownLatch(2);
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.List<java.util.concurrent.Future<?>> futures = new java.util.ArrayList<>();
            for (long code : new long[]{first, second}) {
                futures.add(workers.submit(() -> {
                    ready.countDown();
                    try { start.await(); } catch (InterruptedException e) { throw new RuntimeException(e); }
                    pgPaymentService.simulatePayOSWebhook(customer, code);
                }));
            }
            assertTrue(ready.await(5, java.util.concurrent.TimeUnit.SECONDS));
            start.countDown();
            for (var future : futures) future.get(20, java.util.concurrent.TimeUnit.SECONDS);
        } finally {
            workers.shutdownNow();
            probeJdbc.execute("DROP TRIGGER probe_wallet_delay ON garages");
            probeJdbc.execute("DROP FUNCTION probe_delay_wallet()");
        }
        BigDecimal expected = new BigDecimal("500000").add(netFirst).add(netSecond);
        BigDecimal actual = garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance();
        Long rows = probeJdbc.queryForObject("SELECT COUNT(*) FROM wallet_transactions WHERE garage_id=?",Long.class,garage.getId());
        assertEquals(0, expected.compareTo(actual), "Two successful orders must both credit wallet; expected="+expected+", actual="+actual+", ledger rows="+rows);
        assertEquals(2L, rows);

        User admin = userRepository.save(User.builder().username("pg_wallet_admin").email("pg_wallet_admin@example.invalid")
                .password("test").fullName("PG Admin").role(Role.ADMIN).active(true).build());
        var payoutInput = com.prm393.floodrescue.features.finance.dto.CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("50000")).bankCode("MB").accountNumber("123456")
                .accountHolderName("PROBE").build();
        var payout = financeService.createPayoutRequest(garageOwner, payoutInput);
        var transfer = com.prm393.floodrescue.features.finance.dto.ApprovePayoutDto.builder()
                .status(com.prm393.floodrescue.features.finance.entity.PayoutStatus.TRANSFERRED).transactionReference("PG-PAYOUT").build();
        RescueOrder third = new RescueOrder();
        org.springframework.beans.BeanUtils.copyProperties(rescueOrder, third, "id", "version", "orderCode");
        third.setOrderCode("PG-PROBE-THIRD");
        third = rescueOrderRepository.saveAndFlush(third);
        long thirdCode = pgPaymentService.createPayment(customer,
                com.prm393.floodrescue.features.payment.dto.CreatePaymentRequest.builder().rescueOrderId(third.getId()).build()).getPayosOrderCode();
        runTogether(() -> pgPaymentService.simulatePayOSWebhook(customer, thirdCode),
                () -> financeService.processPayoutRequest(admin, payout.getId(), transfer));
        expected = expected.add(netFirst).subtract(new BigDecimal("50000"));
        assertEquals(0, expected.compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()), "Payment and payout must both be reflected");

        var duplicatePayout = financeService.createPayoutRequest(garageOwner, payoutInput);
        var transferredCount = new java.util.concurrent.atomic.AtomicInteger();
        Runnable confirm = () -> {
            try {
                financeService.processPayoutRequest(admin, duplicatePayout.getId(), transfer);
                transferredCount.incrementAndGet();
            } catch (com.prm393.floodrescue.common.exception.BadRequestException alreadyProcessed) { }
        };
        runTogether(confirm, confirm);
        assertEquals(1, transferredCount.get(), "A repeated payout must debit exactly once");
        expected = expected.subtract(new BigDecimal("50000"));
        assertEquals(0, expected.compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()));
        assertEquals(5L, probeJdbc.queryForObject("SELECT COUNT(*) FROM wallet_transactions WHERE garage_id=?",Long.class,garage.getId()));
    }

    private void runTogether(Runnable first, Runnable second) throws Exception {
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.List<java.util.concurrent.Future<?>> tasks = new java.util.ArrayList<>();
            for (Runnable action : new Runnable[]{first, second}) tasks.add(pool.submit(() -> {
                try { start.await(); } catch (InterruptedException e) { throw new RuntimeException(e); }
                action.run();
            }));
            start.countDown();
            for (var task : tasks) task.get(20, java.util.concurrent.TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
    }

    @Autowired private org.springframework.jdbc.core.JdbcTemplate probeJdbc;
    @Autowired private jakarta.persistence.EntityManager probeEntityManager;

    private long createProbePayment() throws Exception {
        String body = mapper.writeValueAsString(Map.of("rescueOrderId", rescueOrder.getId()));
        String result = mvc.perform(post("/api/v1/payments/create")
                .header("Authorization", "Bearer " + customerToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(result).path("data").path("payosOrderCode").asLong();
    }







    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private GarageRepository garageRepository;
    @Autowired private ServiceItemRepository serviceItemRepository;
    @Autowired private MechanicStaffRepository mechanicRepository;
    @Autowired private RescueOrderRepository rescueOrderRepository;
    @Autowired private PaymentTransactionRepository paymentTransactionRepository;
    @Autowired private PayOSConfig payOSConfig;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User customer;
    private User otherCustomer;
    private User mechanicUser;
    private User garageOwner;
    private MechanicStaff mechanicStaff;
    private Garage garage;
    private RescueOrder rescueOrder;

    private String customerToken;
    private String otherCustomerToken;
    private String mechanicToken;
    private String garageOwnerToken;

    @BeforeEach
    void setUp() {
        payOSConfig.setSimulationEnabled(true);

        customer = userRepository.save(User.builder()
                .username("cust_pay_01")
                .email("cust_pay_01@test.com")
                .phone("0911000001")
                .fullName("Nguyễn Khách Hàng")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        otherCustomer = userRepository.save(User.builder()
                .username("cust_pay_02")
                .email("cust_pay_02@test.com")
                .phone("0911000002")
                .fullName("Trần Khách Lạ")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        garageOwner = userRepository.save(User.builder()
                .username("owner_pay_01")
                .email("owner_pay_01@test.com")
                .phone("0911000003")
                .fullName("Lê Chủ Gara")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        garage = garageRepository.save(Garage.builder()
                .owner(garageOwner)
                .garageName("Gara Sài Gòn Cứu Hộ")
                .phone("0911000003")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("500000.00"))
                .build());

        mechanicUser = userRepository.save(User.builder()
                .username("mech_pay_01")
                .email("mech_pay_01@test.com")
                .phone("0911000004")
                .fullName("Phạm Thợ Máy")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.FIELD_MECHANIC)
                .active(true)
                .build());

        mechanicStaff = mechanicRepository.save(MechanicStaff.builder()
                .user(mechanicUser)
                .garage(garage)
                .workingStatus(MechanicStatus.AVAILABLE)
                .hasCrossingCapability(true)
                .currentLatitude(10.7300)
                .currentLongitude(106.7000)
                .lastHeartbeatAt(LocalDateTime.now())
                .build());

        ServiceItem serviceItem = serviceItemRepository.save(ServiceItem.builder()
                .garage(garage)
                .serviceName("Chở xe qua ngập")
                .serviceType(ServiceType.CROSSING)
                .standardPrice(new BigDecimal("220000.00"))
                .active(true)
                .build());

        rescueOrder = rescueOrderRepository.save(RescueOrder.builder()
                .customer(customer)
                .garage(garage)
                .serviceItem(serviceItem)
                .mechanicStaff(mechanicStaff)
                .vehiclePlate("59-X1 999.88")
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .serviceBasePrice(new BigDecimal("220000.00"))
                .bookingFee(new BigDecimal("30000.00"))
                .totalAmount(new BigDecimal("250000.00"))
                .orderCode("SOS-PAY-2026")
                .transportStage(TransportStage.HANDED_OVER)
                .pickupAddress("Điểm ngập Lê Văn Lương")
                .dropoffAddress("Điểm khô Nguyễn Thị Thập")
                .pickupLatitude(10.7300)
                .pickupLongitude(106.7000)
                .dropoffLatitude(10.7400)
                .dropoffLongitude(106.7100)
                .requestedAt(LocalDateTime.now().minusMinutes(30))
                .acceptedAt(LocalDateTime.now().minusMinutes(25))
                .arrivedAt(LocalDateTime.now().minusMinutes(20))
                .serviceStartedAt(LocalDateTime.now().minusMinutes(15))
                .serviceCompletedAt(LocalDateTime.now().minusMinutes(5))
                .completionPhotoUrl("https://res.cloudinary.com/demo/image/upload/v1/test_completion.jpg")
                .build());

        customerToken = jwtService.generateToken(customer);
        otherCustomerToken = jwtService.generateToken(otherCustomer);
        mechanicToken = jwtService.generateToken(mechanicUser);
        garageOwnerToken = jwtService.generateToken(garageOwner);
    }
















}
