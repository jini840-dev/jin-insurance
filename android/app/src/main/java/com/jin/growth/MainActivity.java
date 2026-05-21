package com.jin.growth;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private FirebaseStorage storage;
    private FirebaseFirestore db;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Firebase 초기화
        try {
            storage = FirebaseStorage.getInstance();
            db = FirebaseFirestore.getInstance();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 브라우저의 window.AndroidBridge 객체를 통해 접근 가능하게 설정
        bridge.getWebView().addJavascriptInterface(this, "AndroidBridge");
    }

    // 1. 카메라 결과 처리기
    private final ActivityResultLauncher<Intent> cameraLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Bundle extras = result.getData().getExtras();
                    Bitmap imageBitmap = (Bitmap) extras.get("data");
                    
                    // 촬영된 비트맵 이미지를 업로드 함수로 전달
                    if (imageBitmap != null) {
                        uploadImageToFirebase(imageBitmap);
                    }
                }
            }
    );

    @JavascriptInterface
    public void captureAndUpload() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraLauncher.launch(takePictureIntent);
    }

    private void uploadImageToFirebase(Bitmap bitmap) {
        if (storage == null) return;

        String fileName = "missions/" + UUID.randomUUID().toString() + ".jpg";
        StorageReference storageRef = storage.getReference().child(fileName);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, baos);
        byte[] data = baos.toByteArray();

        Toast.makeText(this, "이미지 업로드 중...", Toast.LENGTH_SHORT).show();

        storageRef.putBytes(data).addOnSuccessListener(taskSnapshot -> {
            storageRef.getDownloadURL().addOnSuccessListener(uri -> {
                String downloadUrl = uri.toString();
                saveMissionToFirestore(downloadUrl);
            });
        }).addOnFailureListener(e -> {
            Toast.makeText(this, "업로드 실패: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        });
    }

    private void saveMissionToFirestore(String imageUrl) {
        if (db == null) return;

        Map<String, Object> mission = new HashMap<>();
        mission.put("proofUrl", imageUrl);
        mission.put("status", "completed");
        mission.put("timestamp", com.google.firebase.Timestamp.now());

        db.collection("missions")
                .add(mission)
                .addOnSuccessListener(documentReference -> {
                    Toast.makeText(this, "미션 인증 완료! 🎉", Toast.LENGTH_LONG).show();
                })
                .addOnFailureListener(e -> {
                    Toast.makeText(this, "데이터 저장 실패: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
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
