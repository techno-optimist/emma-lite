package com.yourorg.emma.nativeapp.ui.orb

object EmorbRegistry {
    private var activeView: EmorbView? = null

    fun activate(view: EmorbView) {
        if (activeView !== view) {
            activeView?.prepareForRemoval()
            activeView = view
        }
        view.prepareForDisplay()
    }

    fun deactivateActive() {
        activeView?.prepareForRemoval()
        activeView = null
    }

    fun deactivate(view: EmorbView) {
        if (activeView === view) {
            activeView = null
        }
        view.prepareForRemoval()
    }
}
