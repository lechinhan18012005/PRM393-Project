package com.prm393.floodrescue.features.geocoding;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.prm393.floodrescue.common.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Locale;
import java.util.Map;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class OpenStreetMapGeocodingService {

    private static final long MIN_REQUEST_INTERVAL_MILLIS = 1_000L;
    private static final int MAX_CACHE_ENTRIES = 500;

    private final RestClient nominatimClient;
    private final RestClient photonClient;
    private final Map<String, GeocodingResult> cache = new ConcurrentHashMap<>();
    private final Object rateLimitLock = new Object();
    private long lastUpstreamRequestAt;

    public OpenStreetMapGeocodingService(
            RestClient.Builder builder,
            @Value("${app.geocoding.nominatim-base-url}") String baseUrl,
            @Value("${app.geocoding.photon-base-url}") String photonBaseUrl,
            @Value("${app.geocoding.user-agent}") String userAgent) {
        this.nominatimClient = builder.clone()
                .baseUrl(baseUrl)
                .defaultHeader("User-Agent", userAgent)
                .defaultHeader("Accept-Language", "vi")
                .build();
        this.photonClient = builder.clone()
                .baseUrl(photonBaseUrl)
                .defaultHeader("User-Agent", userAgent)
                .build();
    }

    public GeocodingResult search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() < 3 || query.length() > 255) {
            throw new BadRequestException("Địa chỉ tìm kiếm phải từ 3 đến 255 ký tự");
        }

        String cacheKey = query.toLowerCase(Locale.ROOT);
        GeocodingResult cached = cache.get(cacheKey);
        if (cached != null) return cached;

        GeocodingResult result;
        synchronized (rateLimitLock) {
            cached = cache.get(cacheKey);
            if (cached != null) return cached;
            waitForPublicApiRateLimit();
            lastUpstreamRequestAt = System.currentTimeMillis();
            try {
                result = searchNominatim(query);
            } catch (RestClientException ignored) {
                result = null;
            }
            if (result == null) {
                try {
                    result = searchPhoton(query);
                } catch (RestClientException photonError) {
                    throw new BadRequestException(
                            "Dịch vụ bản đồ OpenStreetMap đang tạm thời không khả dụng");
                }
            }
        }

        if (result == null) return null;
        if (cache.size() >= MAX_CACHE_ENTRIES) cache.clear();
        cache.put(cacheKey, result);
        return result;
    }

    private GeocodingResult searchNominatim(String query) {
        NominatimPlace[] places = nominatimClient.get()
                        .uri(
                                "/search?q={query}&format=jsonv2&limit=1"
                                        + "&countrycodes=vn&addressdetails=1",
                                query)
                        .retrieve()
                        .body(NominatimPlace[].class);
        if (places == null || places.length == 0) return null;
        try {
            return GeocodingResult.builder()
                    .displayName(places[0].displayName())
                    .latitude(Double.parseDouble(places[0].latitude()))
                    .longitude(Double.parseDouble(places[0].longitude()))
                    .build();
        } catch (NumberFormatException ex) {
            throw new BadRequestException("OpenStreetMap trả về tọa độ không hợp lệ");
        }
    }

    private GeocodingResult searchPhoton(String query) {
        PhotonResponse response = photonClient.get()
                .uri("/api/?q={query}&limit=1&countrycode=VN", query)
                .retrieve()
                .body(PhotonResponse.class);
        if (response == null || response.features() == null || response.features().length == 0) {
            return null;
        }
        PhotonFeature feature = response.features()[0];
        if (feature.geometry() == null
                || feature.geometry().coordinates() == null
                || feature.geometry().coordinates().length < 2) {
            throw new BadRequestException("OpenStreetMap trả về tọa độ không hợp lệ");
        }
        double[] coordinates = feature.geometry().coordinates();
        return GeocodingResult.builder()
                .displayName(photonDisplayName(feature.properties()))
                .latitude(coordinates[1])
                .longitude(coordinates[0])
                .build();
    }

    private String photonDisplayName(PhotonProperties properties) {
        if (properties == null) return "Địa chỉ từ OpenStreetMap";
        LinkedHashSet<String> parts = Arrays.stream(new String[] {
                        properties.name(), properties.housenumber(), properties.street(),
                        properties.locality(), properties.district(), properties.city(),
                        properties.state(), properties.country()})
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return parts.isEmpty() ? "Địa chỉ từ OpenStreetMap" : String.join(", ", parts);
    }

    private void waitForPublicApiRateLimit() {
        long remaining = MIN_REQUEST_INTERVAL_MILLIS
                - (System.currentTimeMillis() - lastUpstreamRequestAt);
        if (remaining <= 0) return;
        try {
            Thread.sleep(remaining);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Tra cứu địa chỉ đã bị gián đoạn");
        }
    }

    private record NominatimPlace(
            @JsonProperty("display_name") String displayName,
            @JsonProperty("lat") String latitude,
            @JsonProperty("lon") String longitude) {}

    private record PhotonResponse(PhotonFeature[] features) {}

    private record PhotonFeature(PhotonProperties properties, PhotonGeometry geometry) {}

    private record PhotonGeometry(double[] coordinates) {}

    private record PhotonProperties(
            String name,
            String housenumber,
            String street,
            String locality,
            String district,
            String city,
            String state,
            String country) {}
}
