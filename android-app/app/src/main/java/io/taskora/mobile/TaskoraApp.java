package io.taskora.mobile;

import android.app.Application;
import android.content.SharedPreferences;

public class TaskoraApp extends Application {
    private static TaskoraApp instance;
    private SharedPreferences prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        prefs = getSharedPreferences("taskora_mobile_prefs", MODE_PRIVATE);
        
        String savedToken = prefs.getString("auth_token", null);
        if (savedToken != null) {
            ApiClient.setAuthToken(savedToken);
        }

        String savedServer = prefs.getString("server_url", "http://10.0.2.2:5000");
        ApiClient.setBaseUrl(savedServer);
    }

    public static TaskoraApp getInstance() {
        return instance;
    }

    public void saveAuthToken(String token) {
        ApiClient.setAuthToken(token);
        prefs.edit().putString("auth_token", token).apply();
    }

    public void clearAuthToken() {
        ApiClient.setAuthToken(null);
        prefs.edit().remove("auth_token").apply();
    }

    public String getSavedToken() {
        return prefs.getString("auth_token", null);
    }
}
