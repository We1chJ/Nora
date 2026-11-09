package com.nora.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val padding = (32 * resources.displayMetrics.density).toInt()

        val instructions = TextView(this).apply {
            setText(R.string.setup_instructions)
            textSize = 22f
            gravity = Gravity.CENTER
        }

        val openSettings = Button(this).apply {
            setText(R.string.open_settings)
            textSize = 18f
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        }

        setContentView(
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(padding, padding, padding, padding)
                addView(instructions)
                addView(openSettings)
            }
        )
    }
}
