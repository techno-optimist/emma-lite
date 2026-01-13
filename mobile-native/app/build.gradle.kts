import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val keystoreProps = Properties()
val keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    keystorePropsFile.inputStream().use { keystoreProps.load(it) }
}

val localProps = Properties()
val localPropsFile = rootProject.file("local.properties")
if (localPropsFile.exists()) {
    localPropsFile.inputStream().use { localProps.load(it) }
}

fun stringProperty(key: String): String? {
    val gradleProp = project.findProperty(key) as String?
    return gradleProp ?: localProps.getProperty(key) ?: System.getenv(key)
}

fun signingValue(key: String): String? {
    val gradleProp = project.findProperty(key) as String?
    val envKey = when (key) {
        "storeFile" -> "STORE_FILE"
        "storePassword" -> "STORE_PASSWORD"
        "keyAlias" -> "KEY_ALIAS"
        "keyPassword" -> "KEY_PASSWORD"
        else -> key.uppercase()
    }
    return when {
        keystoreProps.containsKey(key) -> keystoreProps.getProperty(key)
        gradleProp != null -> gradleProp
        else -> System.getenv(key) ?: System.getenv(envKey)
    }
}

val releaseStoreFile = signingValue("storeFile")
val releaseStorePassword = signingValue("storePassword")
val releaseKeyAlias = signingValue("keyAlias")
val releaseKeyPassword = signingValue("keyPassword")

val openAiApiKey = stringProperty("OPENAI_API_KEY").orEmpty().trim()
val openAiApiKeyEscaped = openAiApiKey
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

android {
    namespace = "com.yourorg.emma.nativeapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.yourorg.emma.nativeapp"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "0.1.1"
        buildConfigField("String", "EMMA_BASE_URL", "\"https://emma-lite-optimized.onrender.com\"")
        buildConfigField("String", "EMMA_WS_PATH", "\"/voice\"")
        buildConfigField("String", "OPENAI_API_KEY", "\"\"")

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        create("release") {
            if (releaseStoreFile != null) {
                storeFile = file(releaseStoreFile)
            }
            storePassword = releaseStorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isDebuggable = false
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
            buildConfigField("String", "OPENAI_API_KEY", "\"$openAiApiKeyEscaped\"")
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
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("com.google.android.material:material:1.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlin:kotlin-test")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
