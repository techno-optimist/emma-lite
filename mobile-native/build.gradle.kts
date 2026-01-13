plugins {
    // no root plugins; managed in app module
}

tasks.register("clean", Delete::class) {
    delete(rootProject.buildDir)
}
