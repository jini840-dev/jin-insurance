package com.jin.growth;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 브라우저의 window.AndroidBridge 객체를 통해 접근 가능하게 설정
        bridge.getWebView().addJavascriptInterface(this, "AndroidBridge");
    }

    @JavascriptInterface
    public String getAppUsageData() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        long endTime = System.currentTimeMillis();
        long startTime = endTime - 24 * 60 * 60 * 1000; // 최근 24시간

        List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
        
        if (stats == null || stats.isEmpty()) {
            // 권한이 없는 경우 설정 화면으로 유도
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return "PERMISSION_REQUIRED";
        }

        JSONArray result = new JSONArray();
        try {
            for (UsageStats usageStats : stats) {
                if (usageStats.getTotalTimeInForeground() > 0) {
                    JSONObject obj = new JSONObject();
                    obj.put("packageName", usageStats.getPackageName());
                    obj.put("totalTime", usageStats.getTotalTimeInForeground() / 1000 / 60); // 분 단위
                    result.put(obj);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result.toString();
    }
}
