package com.prm393.floodrescue.features.vehicle;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.vehicle.dto.CreateVehicleRequest;
import com.prm393.floodrescue.features.vehicle.entity.CustomerVehicle;
import com.prm393.floodrescue.features.vehicle.repository.CustomerVehicleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class VehicleIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private CustomerVehicleRepository vehicleRepository;
    @Autowired private JwtService jwtService;

    private User createCustomer(String prefix) {
        String unique = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        return userRepository.save(User.builder()
                .username(unique)
                .email(unique + "@example.com")
                .fullName("Test Customer " + unique)
                .password("password123")
                .role(Role.CUSTOMER)
                .build());
    }

    private String authHeader(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private JsonNode call(MockHttpServletRequestBuilder request, Object body, int expectedStatus) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
        }
        String responseContent = mvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andReturn()
                .getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return responseContent.isBlank() ? mapper.nullNode() : mapper.readTree(responseContent);
    }

    @Test
    @DisplayName("End-to-end: Lấy xe từ database, thêm mới xe thật vào DB, cập nhật, đổi mặc định và xóa")
    void testVehicleDatabaseCrudAndDeliveryToFrontend() throws Exception {
        User customerA = createCustomer("custA");
        String authA = authHeader(customerA);

        // 1. Khi chưa có xe trong DB -> API trả về list rỗng, không tự seed xe mẫu
        JsonNode listBefore = call(get("/api/v1/vehicles").header("Authorization", authA), null, 200);
        assertTrue(listBefore.path("success").asBoolean());
        assertEquals(0, listBefore.path("data").size(), "Ban đầu phải là list rỗng");
        assertEquals(0, vehicleRepository.findByCustomerIdOrderByIdAsc(customerA.getId()).size());

        // 2. Thêm xe 1 vào Database qua API POST /api/v1/vehicles
        CreateVehicleRequest addReq1 = CreateVehicleRequest.builder()
                .licensePlate("59-A1 123.45")
                .brand("Honda")
                .model("Vision")
                .vehicleType("SCOOTER")
                .engineCapacity("110cc")
                .color("Đỏ")
                .isDefault(true)
                .build();

        JsonNode createdNode1 = call(post("/api/v1/vehicles").header("Authorization", authA), addReq1, 200);
        assertTrue(createdNode1.path("success").asBoolean());
        long v1Id = createdNode1.path("data").path("id").asLong();
        assertTrue(v1Id > 0);
        assertEquals("59-A1 123.45", createdNode1.path("data").path("licensePlate").asText());
        assertEquals("Honda", createdNode1.path("data").path("brand").asText());
        assertEquals("Vision", createdNode1.path("data").path("model").asText());

        // Xác nhận dữ liệu THỰC SỰ đã được ghi vào DB
        CustomerVehicle dbVehicle1 = vehicleRepository.findById(v1Id).orElse(null);
        assertNotNull(dbVehicle1, "Xe phải tồn tại trong Database sau khi thêm");
        assertEquals("59-A1 123.45", dbVehicle1.getLicensePlate());
        assertEquals(customerA.getId(), dbVehicle1.getCustomer().getId());
        assertTrue(dbVehicle1.isDefault());

        // 3. Thêm xe 2 vào Database
        CreateVehicleRequest addReq2 = CreateVehicleRequest.builder()
                .licensePlate("60-B2 678.90")
                .brand("Yamaha")
                .model("Exciter 155")
                .vehicleType("CLUTCH")
                .engineCapacity("155cc")
                .color("Xanh GP")
                .isDefault(false)
                .build();

        JsonNode createdNode2 = call(post("/api/v1/vehicles").header("Authorization", authA), addReq2, 200);
        long v2Id = createdNode2.path("data").path("id").asLong();
        assertTrue(v2Id > 0);

        // 4. Gọi GET /api/v1/vehicles để kiểm tra dữ liệu lấy từ DB trả về cho frontend
        JsonNode listAfter = call(get("/api/v1/vehicles").header("Authorization", authA), null, 200);
        assertTrue(listAfter.path("success").asBoolean());
        assertEquals(2, listAfter.path("data").size(), "Frontend nhận đủ 2 xe đã lưu trong DB");
        assertEquals("59-A1 123.45", listAfter.path("data").get(0).path("licensePlate").asText());
        assertEquals("60-B2 678.90", listAfter.path("data").get(1).path("licensePlate").asText());

        // 5. Kiểm tra lấy xe mặc định GET /api/v1/vehicles/default
        JsonNode defaultNode = call(get("/api/v1/vehicles/default").header("Authorization", authA), null, 200);
        assertTrue(defaultNode.path("success").asBoolean());
        assertEquals(v1Id, defaultNode.path("data").path("id").asLong());
        assertEquals("59-A1 123.45", defaultNode.path("data").path("licensePlate").asText());

        // 6. Đổi xe mặc định sang xe 2 PATCH /api/v1/vehicles/{id}/default
        JsonNode setDefaultNode = call(patch("/api/v1/vehicles/" + v2Id + "/default").header("Authorization", authA), null, 200);
        assertTrue(setDefaultNode.path("success").asBoolean());
        assertTrue(setDefaultNode.path("data").path("isDefault").asBoolean());

        // Kiểm tra trong DB xe 2 thành default, xe 1 không còn default
        CustomerVehicle dbV1After = vehicleRepository.findById(v1Id).orElseThrow();
        CustomerVehicle dbV2After = vehicleRepository.findById(v2Id).orElseThrow();
        assertFalse(dbV1After.isDefault(), "Xe 1 không còn là default");
        assertTrue(dbV2After.isDefault(), "Xe 2 thành default");

        // 7. Cập nhật thông tin xe 1 PUT /api/v1/vehicles/{id}
        CreateVehicleRequest updateReq = CreateVehicleRequest.builder()
                .licensePlate("59-A1 123.45")
                .brand("Honda")
                .model("Vision 2024 Cá Tính")
                .vehicleType("SCOOTER")
                .engineCapacity("110cc")
                .color("Đen nhám")
                .isDefault(false)
                .build();
        JsonNode updateNode = call(put("/api/v1/vehicles/" + v1Id).header("Authorization", authA), updateReq, 200);
        assertEquals("Vision 2024 Cá Tính", updateNode.path("data").path("model").asText());
        assertEquals("Đen nhám", updateNode.path("data").path("color").asText());

        // Xác nhận thay đổi trong DB
        CustomerVehicle dbV1Updated = vehicleRepository.findById(v1Id).orElseThrow();
        assertEquals("Vision 2024 Cá Tính", dbV1Updated.getModel());
        assertEquals("Đen nhám", dbV1Updated.getColor());

        // 8. Kiểm tra tính cách ly giữa các người dùng (Customer Isolation)
        User customerB = createCustomer("custB");
        String authB = authHeader(customerB);

        // Customer B không thấy xe của Customer A
        JsonNode listCustB = call(get("/api/v1/vehicles").header("Authorization", authB), null, 200);
        assertEquals(0, listCustB.path("data").size(), "Customer B không có xe nào");

        // Customer B không được phép xem hoặc chỉnh sửa xe của Customer A
        call(get("/api/v1/vehicles/" + v1Id).header("Authorization", authB), null, 500);

        // 9. Xóa xe DELETE /api/v1/vehicles/{id}
        JsonNode deleteNode = call(delete("/api/v1/vehicles/" + v1Id).header("Authorization", authA), null, 200);
        assertTrue(deleteNode.path("success").asBoolean());

        // Xác nhận xe 1 đã bị xóa khỏi DB
        assertFalse(vehicleRepository.existsById(v1Id), "Xe 1 phải bị xóa hoàn toàn khỏi DB");

        // Danh sách của Customer A chỉ còn lại 1 xe
        List<CustomerVehicle> remainingInDb = vehicleRepository.findByCustomerIdOrderByIdAsc(customerA.getId());
        assertEquals(1, remainingInDb.size());
        assertEquals(v2Id, remainingInDb.get(0).getId());
    }
}
