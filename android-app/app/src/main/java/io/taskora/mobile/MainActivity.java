package io.taskora.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Native Java Bridge Interface to JS
        webView.addJavascriptInterface(new WebAppInterface(this), "TaskoraNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    String serverUrl = ApiClient.getBaseUrl();
                    String htmlError = "<html><body style='background:#090d16;color:#ffffff;font-family:sans-serif;text-align:center;padding:3rem 1.5rem;'>"
                            + "<h2 style='color:#ef4444;'>⚡ Connection Failed</h2>"
                            + "<p style='color:#9ca3af;font-size:0.95rem;'>Unable to connect to Taskora server at:<br><b>" + serverUrl + "</b></p>"
                            + "<p style='color:#6b7280;font-size:0.85rem;'>Ensure your Python server (app.py) is running on your PC and your phone is on the same Wi-Fi network.</p>"
                            + "<button onclick='location.reload()' style='background:#6366f1;color:#fff;border:none;padding:0.75rem 1.5rem;font-size:1rem;font-weight:bold;border-radius:8px;margin-top:1.5rem;'>Retry Connection</button>"
                            + "</body></html>";
                    view.loadDataWithBaseURL(null, htmlError, "text/html", "UTF-8", null);
                }
            }
        });

        String serverUrl = ApiClient.getBaseUrl();
        webView.loadUrl(serverUrl);
    }

    public class WebAppInterface {
        Activity mActivity;

        WebAppInterface(Activity activity) {
            mActivity = activity;
        }

        @JavascriptInterface
        public void triggerNativeAlarm(String problem, int answer) {
            Intent intent = new Intent(mActivity, AlarmActivity.class);
            intent.putExtra("problem", problem);
            intent.putExtra("answer", answer);
            mActivity.startActivity(intent);
        }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(mActivity, message, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
