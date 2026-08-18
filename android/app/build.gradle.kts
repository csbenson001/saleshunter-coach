import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// ── Upload-key signing ──────────────────────────────────────────────────────
// Play App Signing holds the real app signing key; what we sign with here is the
// *upload* key (see RELEASING.md). Its location and passwords come from, in order
// of precedence, environment variables (how CI passes them) then local.properties
// (how a maintainer keeps them off the command line). Nothing is ever committed.
//
// Coach is open source, so the common case is a contributor with no keystore at
// all. That must not break the build: when the settings are absent we simply do
// not create the signing config, and `assembleRelease`/`bundleRelease` produce an
// unsigned artifact — a warning, never a configuration-time failure.

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun signingSetting(envName: String, propertyName: String): String? =
    (System.getenv(envName) ?: localProperties.getProperty(propertyName))
        ?.trim()
        ?.takeIf { it.isNotEmpty() }

val uploadKeystorePath = signingSetting("COACH_UPLOAD_KEYSTORE", "saleshunter-coach.upload.keystore")
val uploadKeystorePassword =
    signingSetting("COACH_UPLOAD_KEYSTORE_PASSWORD", "saleshunter-coach.upload.keystore.password")
val uploadKeyAlias = signingSetting("COACH_UPLOAD_KEY_ALIAS", "coach.upload.key.alias")
val uploadKeyPassword =
    signingSetting("COACH_UPLOAD_KEY_PASSWORD", "coach.upload.key.password")

// Relative paths resolve against `android/`; absolute paths (what CI writes into
// $RUNNER_TEMP) pass through untouched.
val uploadKeystoreFile = uploadKeystorePath?.let { rootProject.file(it) }

val uploadSigningReady = uploadKeystoreFile != null &&
    uploadKeystoreFile.isFile &&
    uploadKeystorePassword != null &&
    uploadKeyAlias != null &&
    uploadKeyPassword != null

if (!uploadSigningReady) {
    // Only complain when a release artifact is actually being produced — a
    // contributor running `assembleDebug` has no reason to hear about this.
    val reason = when {
        uploadKeystorePath == null ->
            "COACH_UPLOAD_KEYSTORE is not set (env or local.properties `saleshunter-coach.upload.keystore`)"
        uploadKeystoreFile?.isFile != true ->
            "keystore file not found at ${uploadKeystoreFile?.absolutePath}"
        else ->
            "missing " + listOfNotNull(
                "COACH_UPLOAD_KEYSTORE_PASSWORD".takeIf { uploadKeystorePassword == null },
                "COACH_UPLOAD_KEY_ALIAS".takeIf { uploadKeyAlias == null },
                "COACH_UPLOAD_KEY_PASSWORD".takeIf { uploadKeyPassword == null },
            ).joinToString(", ")
    }
    gradle.taskGraph.whenReady {
        val buildingRelease = allTasks.any {
            it.project.path == ":app" && it.name.endsWith("Release")
        }
        if (buildingRelease) {
            logger.warn(
                "\n[coach] Release artifacts will be UNSIGNED: $reason." +
                    "\n[coach] This is expected for contributors without the upload key; the" +
                    "\n[coach] output cannot be installed on a device or uploaded to Play." +
                    "\n[coach] See android/RELEASING.md → \"Signing setup\".\n",
            )
        }
    }
}

android {
    namespace = "com.saleshunter.coach"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.saleshunter.coach"
        // minSdk 29: MediaMuxer OGG output + MediaCodec Opus encoder both require API 29.
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        if (uploadSigningReady) {
            create("release") {
                storeFile = uploadKeystoreFile
                storePassword = uploadKeystorePassword
                keyAlias = uploadKeyAlias
                keyPassword = uploadKeyPassword
            }
        }
    }

    buildTypes {
        release {
            // Null when no upload key is configured → AGP emits an unsigned
            // app-release-unsigned.apk / unsigned .aab instead of failing.
            signingConfig = signingConfigs.findByName("release")
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        // BuildConfig.DEBUG gates the store-screenshot demo mode, so a release
        // build cannot be talked into serving fixtures by a deep link.
        buildConfig = true
    }
}

dependencies {
    implementation(project(":coachkit"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.browser)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
}
