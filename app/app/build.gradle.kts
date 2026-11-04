import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services)
}

val ruwaLocalProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use(::load)
}

fun localSetting(name: String): String =
    (ruwaLocalProperties.getProperty(name) ?: System.getenv(name) ?: when (name) {
        "SUPABASE_URL" -> "https://yrwrvmcmxqmvkwmsuegc.supabase.co"
        "RUWA_BACKEND_URL" -> "https://yrwrvmcmxqmvkwmsuegc.supabase.co/functions/v1/ruwajay-api"
        "SUPABASE_ANON_KEY" -> "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyd3J2bWNteHFtdmt3bXN1ZWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzY0NTUsImV4cCI6MjEwNjcxMjQ1NX0.cUwqizqGXbBfDtI00UrvL91fnagbEuvafV95JuS5t44"
        else -> ""
    })
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")

android {
    namespace = "com.example.ruwajay"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.ruwajay"
        minSdk = 24
        targetSdk = 35
        versionCode = 6
        versionName = "2.6.1"

        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        }

        buildConfigField("String", "MAPBOX_ACCESS_TOKEN", "\"${localSetting("MAPBOX_ACCESS_TOKEN")}\"")
        buildConfigField("String", "RUWA_BACKEND_URL", "\"${localSetting("RUWA_BACKEND_URL")}\"")
        buildConfigField("String", "SUPABASE_URL", "\"${localSetting("SUPABASE_URL")}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${localSetting("SUPABASE_ANON_KEY")}\"")
        buildConfigField("String", "SUPABASE_PROPERTY_BUCKET", "\"${localSetting("SUPABASE_PROPERTY_BUCKET").ifBlank { "property-images" }}\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.navigation.compose)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.analytics)
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.storage)
    implementation(libs.firebase.functions)
    implementation(libs.firebase.messaging)
    implementation(libs.play.services.location)
    implementation(libs.coil.compose)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.osmdroid.android)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play)
    implementation(libs.play.services.auth)
    implementation(libs.googleid)
    implementation("io.getstream:stream-webrtc-android:1.3.1")
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
