# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.saleshunter.coach.** {
    *** Companion;
}
-keepclasseswithmembers class com.saleshunter.coach.** {
    kotlinx.serialization.KSerializer serializer(...);
}
