import com.android.build.gradle.LibraryExtension

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    configurations.all {
        resolutionStrategy {
            force("androidx.annotation:annotation:1.9.1")
            force("androidx.annotation:annotation-jvm:1.9.1")
        }
    }
}

// Pin NDK + compileSdk for every Android module (app + plugins like :jni).
// Avoids broken auto-downloads (e.g. corrupt NDK 28.2 or Platform 35 zips) when a full SDK is already installed.
subprojects {
    afterEvaluate {
        extensions.findByType(LibraryExtension::class.java)?.apply {
            ndkVersion = "30.0.14904198"
            compileSdk = 36
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
