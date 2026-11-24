package com.umbral.notifications

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class UmbralNotificationsModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    companion object {
        const val NAME = "UmbralNotifications"
        var instance: UmbralNotificationsModule? = null
            private set
    }

    init {
        instance = this
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isEnabled(promise: Promise) {
        val listeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ).orEmpty()
        promise.resolve(listeners.contains(context.packageName))
    }

    @ReactMethod
    fun openSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    // Requerido por NativeEventEmitter en RN >= 0.65
    @ReactMethod
    fun addListener(eventName: String) {
        // no-op
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // no-op
    }

    fun emitOffer(data: Bundle) = emit("UmbralOffer", data)

    fun emitStatus(enabled: Boolean) {
        val data = Bundle().apply { putBoolean("enabled", enabled) }
        emit("UmbralListenerStatus", data)
    }

    private fun emit(event: String, data: Bundle) {
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, Arguments.fromBundle(data))
    }

    override fun invalidate() {
        if (instance === this) instance = null
        super.invalidate()
    }
}
