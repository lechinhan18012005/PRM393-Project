package com.prm393.floodrescue.features.geocoding;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

class OpenStreetMapGeocodingServiceTest {

    @Test
    void searchesVietnamAddressAndCachesResult() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(queryParam(
                        "q",
                        UriUtils.encodeQueryParam(
                                        "142 Nguyễn Gia Trí, Bình Thạnh", StandardCharsets.UTF_8)
                                .replace(",", "%2C")))
                .andExpect(queryParam("countrycodes", "vn"))
                .andExpect(header("User-Agent", "HydroRescueVietnam-Test/1.0"))
                .andRespond(withSuccess("""
                        [{"display_name":"142 Nguyễn Gia Trí, Phường 25, Bình Thạnh, Việt Nam",
                          "lat":"10.801234","lon":"106.712345"}]
                        """, MediaType.APPLICATION_JSON));

        OpenStreetMapGeocodingService service = new OpenStreetMapGeocodingService(
                builder,
                "https://nominatim.openstreetmap.org",
                "https://photon.komoot.io",
                "HydroRescueVietnam-Test/1.0");

        GeocodingResult first = service.search("142 Nguyễn Gia Trí, Bình Thạnh");
        GeocodingResult cached = service.search("142 Nguyễn Gia Trí, Bình Thạnh");

        assertEquals(10.801234, first.getLatitude());
        assertEquals(106.712345, first.getLongitude());
        assertEquals(first, cached);
        server.verify();
    }

    @Test
    void fallsBackToPhotonWhenNominatimIsUnavailable() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(request -> assertEquals("/search", request.getURI().getPath()))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(request -> assertEquals("/api/", request.getURI().getPath()))
                .andRespond(withSuccess("""
                        {"type":"FeatureCollection","features":[{
                          "properties":{"name":"Hẻm 118 Tân Hương","district":"Tân Phú",
                            "city":"Thành phố Hồ Chí Minh","country":"Việt Nam"},
                          "geometry":{"type":"Point","coordinates":[106.6265569,10.789992]}
                        }]}
                        """, MediaType.APPLICATION_JSON));

        OpenStreetMapGeocodingService service = new OpenStreetMapGeocodingService(
                builder,
                "https://nominatim.openstreetmap.org",
                "https://photon.komoot.io",
                "HydroRescueVietnam-Test/1.0");

        GeocodingResult result = service.search("118 Tân Hương, Tân Phú, TP.HCM");

        assertEquals(10.789992, result.getLatitude());
        assertEquals(106.6265569, result.getLongitude());
        assertEquals("Hẻm 118 Tân Hương, Tân Phú, Thành phố Hồ Chí Minh, Việt Nam",
                result.getDisplayName());
        server.verify();
    }
}
