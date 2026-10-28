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

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:gateway-recovery;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GatewayRecoveryIntegrationTest {
    private com.sun.net.httpserver.HttpServer gatewayServer;
    private volatile boolean unavailable = true;
    private volatile boolean paid = false;
    private volatile boolean cancelled = false;
    private volatile boolean missing = false;
    private volatile boolean dropReply = false;
    private final java.util.concurrent.atomic.AtomicInteger gatewayReads = new java.util.concurrent.atomic.AtomicInteger();
    private final java.util.List<Long> postedCodes = new java.util.concurrent.CopyOnWriteArrayList<>();

    private void startGateway() {
        try {
            gatewayServer = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
            gatewayServer.createContext("/v2/payment-requests", exchange -> {
                String path = exchange.getRequestURI().getPath();
                if ("GET".equals(exchange.getRequestMethod())) gatewayReads.incrementAndGet();
                if ("POST".equals(exchange.getRequestMethod())) {
                    long code = mapper.readTree(exchange.getRequestBody().readAllBytes()).path("orderCode").asLong();
                    postedCodes.add(code);
                    if (dropReply) { exchange.close(); return; }
                }
                boolean fail = unavailable;
                int status = fail ? 503 : missing && "GET".equals(exchange.getRequestMethod()) ? 404 : 200;
                Map<String,Object> data = new HashMap<>();
                long code = postedCodes.isEmpty() ? 1 : postedCodes.get(0);
                data.put("id", "recovered_link");
                data.put("orderCode", code);
                data.put("amount", 250000);
                data.put("amountPaid", paid ? 250000 : 0);
                data.put("status", cancelled ? "CANCELLED" : paid ? "PAID" : "PENDING");
                String json = mapper.writeValueAsString(status == 200 ? Map.of("code", "00", "data", data) : Map.of("code", "gateway-error"));
                byte[] bytes = json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(status, bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            });
            gatewayServer.start();
            payOSConfig.setEndpoint("http://127.0.0.1:" + gatewayServer.getAddress().getPort());
            payOSConfig.setClientId("probe-real-client");
            payOSConfig.setApiKey("probe-real-key");
            payOSConfig.setSimulationEnabled(false);
        } catch (java.io.IOException e) { throw new RuntimeException(e); }
    }

    @org.junit.jupiter.api.AfterEach
    void stopGateway() { if (gatewayServer != null) gatewayServer.stop(0); }

    private String requestPayment(int expected) throws Exception {
        return mvc.perform(post("/api/v1/payments/create")
                .header("Authorization", "Bearer " + customerToken).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rescueOrderId", rescueOrder.getId()))))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
    }

    private String checkStatus(long code, boolean refresh, int expected) throws Exception {
        return mvc.perform(get("/api/v1/payments/" + code).param("refresh", Boolean.toString(refresh))
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
    }

    @Test
    void statusEndpointCompletesPaidOrderWithoutReopeningOrDuplicateSettlement() throws Exception {
        unavailable = false;
        long code = mapper.readTree(requestPayment(200)).path("data").path("payosOrderCode").asLong();
        paid = true;
        assertEquals("SUCCESS", mapper.readTree(checkStatus(code, true, 200)).path("data").path("status").asText());
        assertEquals(RescueOrderStatus.COMPLETED, rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow().getStatus());
        assertEquals(0, new BigDecimal("718750").compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()));
        checkStatus(code, false, 200);
        checkStatus(code, true, 200);
        assertEquals(1L, probeJdbc.queryForObject("SELECT COUNT(*) FROM wallet_transactions WHERE garage_id=?",Long.class,garage.getId()));
        assertEquals(1, postedCodes.size());
        assertEquals(1, gatewayReads.get());
    }

    @Test
    void pollingIsThrottledButManualRefreshCanRecoverAndOtherUsersCannotSync() throws Exception {
        unavailable = false;
        long code = mapper.readTree(requestPayment(200)).path("data").path("payosOrderCode").asLong();
        mvc.perform(get("/api/v1/payments/" + code).param("refresh","true")
                .header("Authorization", "Bearer " + otherCustomerToken)).andExpect(status().isForbidden());
        assertEquals(0, gatewayReads.get());
        for (int i=0;i<6;i++) checkStatus(code,false,200);
        assertEquals(1, gatewayReads.get());
        paid = true;
        Thread.sleep(1100); // Manual refresh has a one-second cooldown, automatic polls have five.
        assertEquals("SUCCESS", mapper.readTree(checkStatus(code,true,200)).path("data").path("status").asText());
        assertEquals(2, gatewayReads.get());
        assertEquals(1, postedCodes.size());
    }

    @Test
    void statusGatewayFailureKeepsPaymentPendingAndNeverCreatesAnotherLink() throws Exception {
        unavailable = false;
        long code = mapper.readTree(requestPayment(200)).path("data").path("payosOrderCode").asLong();
        unavailable = true;
        checkStatus(code,true,400);
        assertEquals(PaymentStatus.PENDING, paymentTransactionRepository.findByPayosOrderCode(code).orElseThrow().getStatus());
        assertEquals(RescueOrderStatus.PAYMENT_PENDING, rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow().getStatus());
        assertEquals(0, new BigDecimal("500000").compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()));
        assertEquals(1, postedCodes.size());
    }

    @Test
    void unknownGatewayOutcomeKeepsDurableCodeAndRecoversPaidOrder() throws Exception {
        dropReply = true;
        requestPayment(400);
        assertFalse(postedCodes.isEmpty());
        assertEquals(1, new java.util.HashSet<>(postedCodes).size());
        int initialPosts = postedCodes.size();
        long code = postedCodes.get(0);
        assertTrue(paymentTransactionRepository.findByPayosOrderCode(code).isPresent(), "Reservation must survive an ambiguous gateway failure");
        unavailable = false;
        dropReply = false;
        String recovered = requestPayment(200);
        assertEquals(code, mapper.readTree(recovered).path("data").path("payosOrderCode").asLong());
        assertEquals("https://pay.payos.vn/web/recovered_link", mapper.readTree(recovered).path("data").path("checkoutUrl").asText());
        assertEquals(initialPosts, postedCodes.size(), "Recovery must query existing link, not create another");
        paid = true;
        String settled = requestPayment(200);
        assertEquals("SUCCESS", mapper.readTree(settled).path("data").path("status").asText());
        assertEquals(RescueOrderStatus.COMPLETED, rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow().getStatus());
        assertEquals(0, new BigDecimal("718750").compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()));
        requestPayment(200);
        assertEquals(initialPosts, postedCodes.size());
    }

    @Test
    void explicitGatewayCancellationIsRequiredBeforeNewAttempt() throws Exception {
        requestPayment(400);
        long code = postedCodes.get(0);
        unavailable = false;
        cancelled = true;
        String result = requestPayment(200);
        assertEquals("CANCELLED", mapper.readTree(result).path("data").path("status").asText());
        assertEquals(PaymentStatus.CANCELLED, paymentTransactionRepository.findByPayosOrderCode(code).orElseThrow().getStatus());
        assertEquals(1, postedCodes.size());
    }

    @Test
    void settlementFailureRollsBackPaymentWalletAndLedger() throws Exception {
        unavailable = false;
        String result = requestPayment(200);
        long code = mapper.readTree(result).path("data").path("payosOrderCode").asLong();
        rescueOrder.setStatus(RescueOrderStatus.CANCELLED);
        rescueOrderRepository.saveAndFlush(rescueOrder);
        Map<String,Object> data = new HashMap<>();
        data.put("orderCode",code); data.put("amount",250000L);
        data.put("description","RESCUE " + code); data.put("accountNumber","");
        data.put("reference","ROLLBACK"); data.put("transactionDateTime","2026-10-25 12:00:00");
        data.put("currency","VND"); data.put("paymentLinkId","recovered_link");
        data.put("code","00"); data.put("desc","success");
        var body = Map.of("code","00","success",true,"data",data,
                "signature",payOSConfig.createWebhookDataSignature(data));
        mvc.perform(post("/api/v1/payments/payos/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body))).andExpect(status().isBadRequest());
        assertEquals(PaymentStatus.PENDING, paymentTransactionRepository.findByPayosOrderCode(code).orElseThrow().getStatus());
        assertEquals(0, new BigDecimal("500000").compareTo(garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance()));
        assertEquals(0L, probeJdbc.queryForObject("SELECT COUNT(*) FROM wallet_transactions WHERE garage_id=?",Long.class,garage.getId()));
    }
    @Autowired private com.prm393.floodrescue.features.payment.service.PayOSPaymentService pgPaymentService;



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
        startGateway();
    }
















}
