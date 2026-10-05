package io.github.fut0r.almuslim;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import io.github.fut0r.almuslim.widgets.PrayerWidgetsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // App-specific plugins must be registered before the bridge starts.
        registerPlugin(PrayerWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
        // Until the first frame is drawn, show the themed window background
        // (light or dark) through the WebView instead of a white flash.
        getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
    }
}
