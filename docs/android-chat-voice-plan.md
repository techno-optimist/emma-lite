# Android Chat + Voice Implementation Plan (Local STT + Server TTS, Offline Best-Effort)

## Purpose
Implement Emma chat and intelligence on the native Android app with:
- Local STT (SpeechRecognizer) for voice input.
- Server TTS via existing backend agent over WebSocket.
- Offline best-effort voice (on-device STT + Android TTS) and offline text fallback.
- User-provided API key sent via `set_api_key` to backend (no backend key assumption).
- Tool execution on-device with vault integration to unblock agent tool calls.

No code changes are included in this document. It is a detailed execution plan for a future session.

## Key Decisions
- Voice input uses local STT in all cases.
- Voice output uses server TTS when online; uses Android TextToSpeech when offline.
- Offline voice is best-effort (SpeechRecognizer offline packs). If unavailable, fallback to text input.
- Backend stays the authoritative agent; Android executes tools locally and returns results.
- User API key is sent via WebSocket `set_api_key` after connection.
- Offline intelligence uses local heuristics and vault search, not direct OpenAI calls.

## Current Architecture Summary
- Android voice chat uses `/voice` WebSocket from `VoiceSessionManager.kt`.
- Backend WebSocket handles `start_session`, `user_text`, `tool_result`, `set_api_key`.
- Tools are defined in `lib/tool-definitions.js` and executed in the browser today.
- Android currently does not handle `tool_request`, so tool calls can stall.
- Android has a full local vault implementation in `vault/` with read/write APIs.
- Settings include user API key storage in `settings/AiPreferences.kt`.

## Target Architecture

### Online Flow
1. User speaks.
2. Android SpeechRecognizer produces transcript.
3. Android sends `user_text` over WebSocket.
4. Backend agent calls OpenAI Responses API.
5. If tool calls are needed, backend sends `tool_request`.
6. Android executes tools locally against vault and replies `tool_result`.
7. Backend sends `emma_transcription` and `emma_audio` (mp3 base64).
8. Android plays `emma_audio`.

### Offline Flow (Best Effort)
1. User speaks.
2. Android SpeechRecognizer runs with offline preference.
3. Android local intelligence generates response from vault + heuristics.
4. Android reads response via TextToSpeech.
5. If SpeechRecognizer offline is unavailable, use text-only input.

## Implementation Plan

### Phase 0 - Baseline Audit (Short)
- Confirm current WebSocket messages in `server.js` and `emma-agent.js`.
- Inventory Android chat/voice entry points:
  - `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceSessionManager.kt`
  - `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceViewModel.kt`
  - `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/ui/screens/ChatScreen.kt`
  - `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/settings/AiPreferences.kt`

### Phase 1 - Connectivity + Mode Routing
Goal: clear online/offline state and route behavior.
- Add connectivity monitoring (ConnectivityManager or existing `runConnectivityProbe()`).
- Extend `VoiceSessionState` with fields:
  - `isOffline`, `canUseOfflineStt`, `canUseOfflineTts`, `lastOnlineAt`.
- On WebSocket failure, switch to offline mode and surface a UI badge.
- When connectivity returns, auto-reconnect and flip back to online.

### Phase 2 - Local STT Input
Goal: local STT for all voice input.
- Create `LocalSpeechRecognizer` wrapper:
  - Uses `SpeechRecognizer`.
  - Sets `EXTRA_PREFER_OFFLINE` true.
  - Emits partial and final transcripts.
- Add detection for offline STT availability:
  - If no recognition service or offline packs, set `canUseOfflineStt=false`.
- Update `ChatScreen` voice button:
  - Start STT locally.
  - On final transcript, call `sendUserText()` (online) or local response (offline).

### Phase 3 - Server TTS Playback (Online)
Goal: keep current server TTS path working.
- Continue to handle `emma_audio` in `VoiceSessionManager`.
- Ensure we do not attempt local TTS when online unless server audio fails.
- Add fallback: if server audio decode fails, use local TTS on the received text.

### Phase 4 - Tool Request Handling (Critical)
Goal: unblock tool calls from the backend agent.
- Add handling in `VoiceSessionManager.handleIncoming()` for:
  - `tool_request` (contains `call_id`, `tool_name`, `parameters`).
- Implement `AndroidToolExecutor` with parity to `EmmaVoiceTools`:
  - `get_people`: map to `VaultRepository.decodePeople`.
  - `get_memories`: filter memory records by person/date keywords.
  - `summarize_memory`: use local summarizer (simple excerpt).
  - `create_memory_capsule`: call `VaultRepository.addMemory`.
  - `update_memory_capsule`: call `VaultRepository.updateMemory`.
  - `create_person_profile` / `update_person`: call `VaultRepository.addOrUpdatePerson`.
  - `attach_memory_media`: attach stored media (initially minimal).
- Return `tool_result` payload as JSON string.
- Optional: append a system transcript message to show tool action results.

### Phase 5 - Offline Intelligence Path
Goal: meaningful offline chat.
- Add `OfflineEmmaResponder`:
  - Intent detection (port the simplified logic from `emma-chat-experience.js`).
  - Memory search: keyword match on local vault memories.
  - People lookup: name match in people list.
  - Memory capture prompt: if input looks like a memory, offer save.
- Respect settings toggles:
  - `memoryDetection`, `peopleRecognition`, `dementiaMode` from `SettingsPreferences`.
- Implement minimal response templates for:
  - greeting, gratitude, memory search, person inquiry, memory share.

### Phase 6 - Offline TTS (Best Effort)
Goal: voice responses offline.
- Use `TextToSpeech` for offline responses.
- Enable only when offline or server audio fails.
- Add language/voice selection later; default to device locale.

### Phase 7 - API Key Handling
Goal: user-provided key integration.
- Load key from `AiPreferences`.
- After WebSocket `onOpen`, send:
  - `{ type: "set_api_key", apiKey: "<user key>" }`.
- Never log or show the key in UI.
- If key is empty, skip `set_api_key` (backend will fall back to its key if configured).

### Phase 8 - UI Enhancements
Goal: clearer feedback and tool results.
- Add message types:
  - `tool_result`, `memory_card`, `people_list` (optional).
- Show status chips:
  - Online, Offline, Voice Ready, Connecting.
- Provide inline CTA when offline STT unavailable (switch to text input).

### Phase 9 - Error Handling and Resilience
- Backoff reconnects for WebSocket failures.
- Guard against malformed tool payloads.
- Fall back to local TTS on server audio errors.
- Store last N transcripts and truncate for memory.

### Phase 10 - Testing and Verification
- Manual flows:
  - Online voice chat end-to-end (STT -> server -> TTS).
  - Tool call flow (e.g., "show my people") returns tool results.
  - Offline mode: airplane mode, local response + TTS.
  - Offline STT unsupported: fallback to text entry.
- Log key transitions (online/offline, tool_request, tool_result) without PII.

## File Inventory (Expected Touch Points)
Android:
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceSessionManager.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceModels.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceViewModel.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/AudioRecorder.kt` (likely deprecate)
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/ui/screens/ChatScreen.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/settings/AiPreferences.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/settings/SettingsPreferences.kt`
- `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/vault/VaultRepository.kt`
- New: `voice/LocalSpeechRecognizer.kt`, `voice/OfflineEmmaResponder.kt`, `voice/AndroidToolExecutor.kt`

Backend (no required changes for the chosen plan):
- `server.js`, `emma-agent.js` already support `set_api_key` and tool calls.

## Risks and Mitigations
- SpeechRecognizer offline reliability varies by device:
  - Mitigation: detect availability and fallback to text.
- Tool execution mismatch with server schema:
  - Mitigation: mirror `lib/tool-definitions.js` exactly.
- Latency with local STT + server TTS:
  - Mitigation: show "thinking" state and allow cancel.

## Open Questions for Next Session
- Should offline responses auto-save memories or only prompt?
- How rich should tool-result UI be in chat (simple text vs cards)?
- Should we remove or keep audio streaming (`realtime_audio_chunk`) for future use?
