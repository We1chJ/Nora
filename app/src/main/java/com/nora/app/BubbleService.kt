package com.nora.app

import android.accessibilityservice.AccessibilityService
import android.annotation.SuppressLint
import android.graphics.Color
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.TextView
import android.widget.Toast
import kotlin.math.abs

/** Runs while Nora is enabled in Accessibility settings and draws the bubble over other apps. */
class BubbleService : AccessibilityService() {

    private lateinit var windowManager: WindowManager
    private var bubble: View? = null

    override fun onServiceConnected() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        showBubble()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        bubble?.let { windowManager.removeView(it) }
        bubble = null
        super.onDestroy()
    }

    private fun showBubble() {
        if (bubble != null) return

        val density = resources.displayMetrics.density
        val size = (72 * density).toInt()

        // FLAG_NOT_FOCUSABLE lets touches outside the bubble reach the app underneath.
        val params = WindowManager.LayoutParams(
            size,
            size,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (16 * density).toInt()
            y = (160 * density).toInt()
        }

        val view = TextView(this).apply {
            text = "N"
            textSize = 30f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.bubble_background)
            contentDescription = getString(R.string.bubble_label)
            setOnClickListener { onBubbleTapped() }
        }

        enableDragging(view, params)
        windowManager.addView(view, params)
        bubble = view
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun enableDragging(view: View, params: WindowManager.LayoutParams) {
        val touchSlop = ViewConfiguration.get(this).scaledTouchSlop
        var startX = 0
        var startY = 0
        var touchStartX = 0f
        var touchStartY = 0f
        var dragging = false

        view.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = params.x
                    startY = params.y
                    touchStartX = event.rawX
                    touchStartY = event.rawY
                    dragging = false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - touchStartX
                    val dy = event.rawY - touchStartY
                    if (abs(dx) > touchSlop || abs(dy) > touchSlop) dragging = true
                    if (dragging) {
                        params.x = startX + dx.toInt()
                        params.y = startY + dy.toInt()
                        windowManager.updateViewLayout(view, params)
                    }
                }
                MotionEvent.ACTION_UP -> if (!dragging) view.performClick()
            }
            true
        }
    }

    private fun onBubbleTapped() {
        Toast.makeText(this, R.string.bubble_tapped, Toast.LENGTH_SHORT).show()
    }
}
