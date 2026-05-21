package com.jin.growth;

import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.appcompat.app.AppCompatActivity;

public class MissionActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. 상태바 및 내비게이션 바 숨기기 (전체 화면 설정)
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        
        // 2. 잠금 화면 위에서도 띄울 수 있도록 설정 (구버전 대응 포함)
        setShowWhenLocked(true);
        setTurnScreenOn(true);

        setContentView(R.layout.activity_mission);

        // 3. 시스템 UI 숨기기 (Android 11+ 대응)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            final WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            // Android 11 미만 구버전 대응
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    // 뒤로가기 버튼 비활성화 (미션 수행 강제 시)
    @Override
    public void onBackPressed() {
        // super.onBackPressed(); // 주석 처리 시 뒤로가기 동작 안 함
    }

    public void onCloseMission(View view) {
        finish();
    }
}
