# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to the flags specified
# in /Users/alexa/AppData/Local/Android/Sdk/tools/proguard/proguard-android.txt

# Keep Firebase and Google Play Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep OsmDroid
-keep class org.osmdroid.** { *; }
-dontwarn org.osmdroid.**

# Keep Coil
-keep class coil.** { *; }
-dontwarn coil.**

# Keep data models
-keep class com.example.ruwajay.data.model.** { *; }
