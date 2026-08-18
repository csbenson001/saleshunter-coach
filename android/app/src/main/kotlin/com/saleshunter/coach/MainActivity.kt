package com.saleshunter.coach

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.saleshunter.coach.auth.AuthCallback
import com.saleshunter.coach.screenshot.DemoMode
import com.saleshunter.coach.ui.CoachRoot
import com.saleshunter.coach.ui.theme.CoachTheme
import kotlinx.coroutines.launch

/**
 * The app's only activity: one Compose surface, plus the sign-in hand-off.
 *
 * `launchMode="singleTask"` (see AndroidManifest.xml) means the hosted sign-in
 * page's `saleshunter-coach://auth-callback?token=…` redirect arrives here — as the launch
 * intent on a cold start, or through [onNewIntent] when the app is already up —
 * rather than starting a second copy of the app.
 *
 * The same door takes `saleshunter-coach://demo/…` in debug builds, which is how the store
 * screenshots are driven (see [DemoMode]).
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleDeepLink(intent)
        setContent {
            CoachTheme {
                CoachRoot()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        // Screenshot demo first: it claims only `saleshunter-coach://demo/…` in debug builds
        // and hands everything else straight on to the sign-in handler.
        if (DemoMode.handle(uri)) return
        val container = coachContainer
        lifecycleScope.launch {
            when (val result = container.auth.handleAuthCallback(uri)) {
                is AuthCallback.Success -> container.onSignedIn()
                is AuthCallback.Failure -> container.setAuthError(result.reason)
                AuthCallback.Ignored -> Unit
            }
        }
    }
}
