package com.jin.growth;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class MissionReceiver extends BroadcastReceiver {
    private static final String TAG = "MissionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
            Log.d(TAG, "User present detected. Launching MissionActivity...");

            // 화면 잠금 해제 시 미션 액티비티 실행
            Intent i = new Intent(context, MissionActivity.class);
            
            // Background에서 Activity를 띄우기 위해 필요한 Flag
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            
            context.startActivity(i);
        }
    }
}
