package com.umbral.notifications

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Servicio del sistema: recibe las notificaciones de TODAS las apps.
 * Solo reenvía texto; el filtrado y el análisis se hacen en JavaScript.
 */
class UmbralNotificationListenerService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        UmbralNotificationsModule.instance?.emitStatus(true)
    }

    override fun onListenerDisconnected() {
        UmbralNotificationsModule.instance?.emitStatus(false)
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn ?: return
        if (notification.packageName == packageName) return

        val extras = notification.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val content = listOf(title, text, bigText)
            .filter { it.isNotBlank() }
            .joinToString(" · ")
        if (content.isBlank()) return

        val data = Bundle().apply {
            putString("package", notification.packageName)
            putString("content", content)
            putLong("postedAt", notification.postTime)
        }
        UmbralNotificationsModule.instance?.emitOffer(data)
    }
}
