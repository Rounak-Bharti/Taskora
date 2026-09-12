package io.taskora.mobile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ApiClient {
    private static String baseUrl = "http://192.168.1.11:5000"; // Wi-Fi local network IP for physical phones & emulators
    private static String authToken = null;

    public static void setBaseUrl(String url) {
        baseUrl = url;
    }

    public static String getBaseUrl() {
        return baseUrl;
    }

    public static void setAuthToken(String token) {
        authToken = token;
    }

    public static String getAuthToken() {
        return authToken;
    }

    public static class ApiResponse {
        public int statusCode;
        public String body;
        public boolean isSuccess;

        public ApiResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
            this.isSuccess = statusCode >= 200 && statusCode < 300;
        }
    }

    public static ApiResponse request(String endpoint, String method, String jsonBody) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(baseUrl + endpoint);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod(method);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");

            if (authToken != null && !authToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
            }

            if (jsonBody != null && (method.equals("POST") || method.equals("PUT"))) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }
            }

            int status = conn.getResponseCode();
            InputStream is = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
            
            StringBuilder response = new StringBuilder();
            if (is != null) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line.trim());
                    }
                }
            }

            return new ApiResponse(status, response.toString());
        } catch (Exception e) {
            return new ApiResponse(500, "{\"error\": \"" + e.getMessage() + "\"}");
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    // Convenience API Methods
    public static ApiResponse register(String name, String email, String password) {
        String payload = String.format("{\"name\":\"%s\",\"email\":\"%s\",\"password\":\"%s\"}", name, email, password);
        return request("/api/auth/register", "POST", payload);
    }

    public static ApiResponse login(String email, String password) {
        String payload = String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);
        return request("/api/auth/login", "POST", payload);
    }

    public static ApiResponse getMe() {
        return request("/api/auth/me", "GET", null);
    }

    public static ApiResponse getTasks(String date) {
        String endpoint = "/api/tasks" + (date != null ? "?date=" + date : "");
        return request(endpoint, "GET", null);
    }

    public static ApiResponse createTask(String title, String category, String dueDate, String dueTime, int duration, String priority) {
        String payload = String.format(
            "{\"title\":\"%s\",\"category\":\"%s\",\"due_date\":\"%s\",\"due_time\":\"%s\",\"estimated_duration\":%d,\"priority\":\"%s\"}",
            title, category, dueDate, dueTime, duration, priority
        );
        return request("/api/tasks", "POST", payload);
    }

    public static ApiResponse rateTask(int taskId, String status, int qualityRating, int actualDuration, String difficulty, String note) {
        String payload = String.format(
            "{\"status\":\"%s\",\"quality_rating\":%d,\"actual_duration\":%d,\"difficulty\":\"%s\",\"note\":\"%s\"}",
            status, qualityRating, actualDuration, difficulty, note
        );
        return request("/api/tasks/" + taskId + "/rate", "POST", payload);
    }

    public static ApiResponse getHabits() {
        return request("/api/habits", "GET", null);
    }

    public static ApiResponse completeHabit(int habitId, String date, int progressVal, Integer quality) {
        String payload = String.format(
            "{\"date\":\"%s\",\"progress_value\":%d%s}",
            date, progressVal, (quality != null ? ",\"quality_rating\":" + quality : "")
        );
        return request("/api/habits/" + habitId + "/complete", "POST", payload);
    }

    public static ApiResponse getDailyPerformance(String date) {
        return request("/api/tasks/performance?date=" + date, "GET", null);
    }

    public static ApiResponse saveReflection(String date, String wentWell, String failedTasks, String whyMissed, String improveTomorrow, int energy, int mood, String proudOf) {
        String payload = String.format(
            "{\"date\":\"%s\",\"went_well\":\"%s\",\"failed_tasks\":\"%s\",\"why_missed\":\"%s\",\"improve_tomorrow\":\"%s\",\"energy\":%d,\"mood\":%d,\"proud_of\":\"%s\"}",
            date, wentWell, failedTasks, whyMissed, improveTomorrow, energy, mood, proudOf
        );
        return request("/api/reflections", "POST", payload);
    }

    public static ApiResponse getAnalytics(String period) {
        return request("/api/analytics?period=" + period, "GET", null);
    }

    public static ApiResponse getLeaderboard(String period) {
        return request("/api/leaderboard?period=" + period, "GET", null);
    }
}
