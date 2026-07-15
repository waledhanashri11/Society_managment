// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt.android) apply false
    alias(libs.plugins.ksp) apply false
}

val localProperties = java.util.Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use(localProperties::load)
}

val societyBuildDir = localProperties.getProperty("society.buildDir")
    ?: System.getenv("SOCIETY_ANDROID_BUILD_DIR")

if (!societyBuildDir.isNullOrBlank()) {
    val buildRoot = file(societyBuildDir)
    layout.buildDirectory.set(buildRoot.resolve("root"))
    subprojects {
        layout.buildDirectory.set(buildRoot.resolve(name))
    }
}
