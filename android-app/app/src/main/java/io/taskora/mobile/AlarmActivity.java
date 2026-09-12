package io.taskora.mobile;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

public class AlarmActivity extends Activity {
    private TextView tvMathProblem;
    private EditText etMathAnswer;
    private Button btnSubmitMath, btnSnooze;
    private Vibrator vibrator;
    private int expectedAnswer = 25; // Default challenge 17 + 8

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Start phone vibration alert
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 500, 200, 500, 200};
            vibrator.vibrate(pattern, 0); // Repeat vibration until solved
        }

        setupUI();
    }

    private void setupUI() {
        // Fallback UI programmatically if XML layout inflating in test mode
        setContentView(R.layout.activity_alarm);

        tvMathProblem = findViewById(R.id.tv_math_problem);
        etMathAnswer = findViewById(R.id.et_math_answer);
        btnSubmitMath = findViewById(R.id.btn_submit_math);
        btnSnooze = findViewById(R.id.btn_snooze);

        if (tvMathProblem != null) {
            tvMathProblem.setText("17 + 8 = ?");
        }

        if (btnSubmitMath != null) {
            btnSubmitMath.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    verifyAnswer();
                }
            });
        }

        if (btnSnooze != null) {
            btnSnooze.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    stopVibration();
                    Toast.makeText(AlarmActivity.this, "Alarm snoozed for 5 minutes", Toast.LENGTH_SHORT).show();
                    finish();
                }
            });
        }
    }

    private void verifyAnswer() {
        String input = etMathAnswer.getText().toString().trim();
        if (input.isEmpty()) {
            Toast.makeText(this, "Please enter your answer!", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            int val = Integer.parseInt(input);
            if (val == expectedAnswer) {
                stopVibration();
                Toast.makeText(this, "Correct! Wake up alarm turned off 🎉", Toast.LENGTH_LONG).show();
                finish();
            } else {
                Toast.makeText(this, "Incorrect answer. Try again!", Toast.LENGTH_SHORT).show();
                etMathAnswer.setText("");
            }
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Invalid number!", Toast.LENGTH_SHORT).show();
        }
    }

    private void stopVibration() {
        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    @Override
    protected void onDestroy() {
        stopVibration();
        super.onDestroy();
    }
}
