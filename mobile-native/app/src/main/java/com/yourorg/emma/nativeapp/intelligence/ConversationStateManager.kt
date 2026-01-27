package com.yourorg.emma.nativeapp.intelligence

class ConversationStateManager(
    initialState: String = "idle"
) {
    private val stateHistory = ArrayDeque<String>()
    var currentState: String = initialState
        private set

    fun transitionTo(state: String) {
        currentState = state
        stateHistory.addLast(state)
        if (stateHistory.size > 20) {
            stateHistory.removeFirst()
        }
    }

    fun reset(state: String = "idle") {
        currentState = state
        stateHistory.clear()
    }

    fun history(): List<String> = stateHistory.toList()
}
