# iOS Native Parity Plan (Android Baseline v0.1.3)

Last updated: 2026-02-05  
Android source baseline commit: `24aa0ebb`  
Android app baseline: `versionName 0.1.3`, `versionCode 4` (`mobile-native/app/build.gradle.kts`)

## Objective
Create a separate, fully native iOS app that matches the current Android native app behavior as closely as possible, while using iOS frameworks and patterns.

This plan is a story-level backlog mapped to the current Android implementation files.

## Scope Lock
Parity target is Android as implemented now in `mobile-native/`, not older roadmap docs.

Included in parity:
- Vault lifecycle (create/open/autosave/save/export/share/lock/passphrase flows)
- `.emma` crypto/file compatibility
- Dashboard + landing + orb + vault panel + settings
- Chat + voice pipeline + tool execution + offline fallback
- Memories, constellation/gallery, people, unified search
- Local settings and intelligence behaviors

Not newly introduced in this iOS parity scope:
- Cloud sync/background jobs/notifications beyond Android current behavior
- Feature expansion not already present in Android v0.1.3

## Android Feature Baseline (Reference)
- Build/runtime config: `mobile-native/app/build.gradle.kts`, `mobile-native/app/src/main/AndroidManifest.xml`
- App shell/navigation: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/ui/EmmaApp.kt`
- Landing: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/ui/VaultLandingScreen.kt`
- Vault core: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/vault/VaultRepository.kt`, `VaultViewModel.kt`, `VaultModels.kt`, `VaultState.kt`, `VaultPreferences.kt`
- Vault crypto: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/vault/VaultCrypto.kt`, `VaultSpec.kt`
- Voice/session: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/voice/VoiceSessionManager.kt`, `VoiceModels.kt`, `VoicePayload.kt`
- Voice local components: `LocalSpeechRecognizer.kt`, `LocalTtsPlayer.kt`, `VoiceAudioPlayer.kt`, `AndroidToolExecutor.kt`, `OpenAiToolDefinitions.kt`, `OfflineEmmaResponder.kt`
- Intelligence: `mobile-native/app/src/main/java/com/yourorg/emma/nativeapp/intelligence/UnifiedIntelligence.kt`, `IntelligentCaptureEngine.kt`, `VectorlessEngine.kt`, `ConversationStateManager.kt`
- Feature screens:
  - Chat: `ui/screens/ChatScreen.kt`
  - Constellation: `ui/screens/ConstellationScreen.kt`
  - People: `ui/screens/PeopleScreen.kt`
  - Search: `ui/screens/UnifiedSearchScreen.kt`
  - Memory gallery: `ui/screens/MemoryGalleryScreen.kt`
- Vault panel: `ui/components/VaultControlPanelDialog.kt`
- Theme: `ui/theme/EmmaPalettes.kt`, `Theme.kt`, `Type.kt`
- Orb: `ui/orb/EmorbView.kt`, `ui/orb/EmorbSurface.kt`, `ui/orb/EmorbRegistry.kt`
- Crypto tests/fixtures: `mobile-native/app/src/test/java/com/yourorg/emma/nativeapp/vault/VaultCryptoTest.kt`, `docs/fixtures/*`

## iOS Project Layout (Proposed)
Create `mobile-ios/` with this structure:

```text
mobile-ios/
  EmmaNative.xcodeproj
  EmmaNative/
    App/
    Core/
      Vault/
      Voice/
      Intelligence/
      Network/
      Settings/
    Features/
      Landing/
      Dashboard/
      Chat/
      Memories/
      People/
      Search/
      Settings/
      VaultPanel/
      Constellation/
    UI/
      Theme/
      Orb/
    Resources/
    Tests/
      Unit/
      Integration/
      Snapshot/
```

## Platform Mapping (Android -> iOS)

| Android implementation | iOS target |
|---|---|
| Jetpack Compose + Navigation | SwiftUI + NavigationStack |
| ViewModel + StateFlow | Observable/ObservableObject + async/await + Combine where needed |
| DataStore preferences | `UserDefaults` wrappers |
| BuildConfig constants | `.xcconfig` + Info.plist/env injection |
| OkHttp + WebSocket | `URLSession` + `URLSessionWebSocketTask` |
| `SpeechRecognizer` | `SFSpeechRecognizer` |
| `TextToSpeech` | `AVSpeechSynthesizer` |
| `MediaPlayer` mp3 playback | `AVAudioPlayer` |
| SAF open/create/export/share | `UIDocumentPickerViewController`, security-scoped bookmarks, `UIActivityViewController` |
| FileProvider shared cache | app temp/export directory + iOS share sheet |
| GLSurfaceView shader orb | MetalKit/SceneKit-based orb view (SwiftUI wrapper) |

## Delivery Phases and Story Backlog

## Phase 0 - Program Setup and Contract Freeze

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P0-01 | Freeze parity contract for v0.1.3 | `mobile-native/app/build.gradle.kts`, `ui/EmmaApp.kt` | `docs/ios-parity-contract.md` with route/feature list | none | Contract signed off with no ambiguous scope |
| P0-02 | Initialize `mobile-ios/` project | n/a | Buildable Xcode app target | P0-01 | App launches on simulator |
| P0-03 | Configure environments and constants | `mobile-native/app/build.gradle.kts:62-64` | Base URL, WS path, API key wiring in xcconfig | P0-02 | Constants resolved at runtime |
| P0-04 | CI skeleton for iOS build/test | n/a | CI job for `xcodebuild test` | P0-02 | Green CI for empty baseline tests |

## Phase 1 - Vault Crypto and File Compatibility

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P1-01 | Port `VaultSpec` constants exactly | `vault/VaultSpec.kt` | `VaultSpec.swift` | P0-02 | Constants match Android values |
| P1-02 | Implement key derivation strategies | `vault/VaultCrypto.kt` | PBKDF2-HMAC-SHA256 key derivation (WebCompat + Direct equivalent) | P1-01 | Both strategies tested |
| P1-03 | Implement AES-GCM encrypt/decrypt packet parsing | `vault/VaultCrypto.kt` | Reader for versioned/unversioned `EMMA` packets | P1-01 | Can parse all supported packet layouts |
| P1-04 | Implement legacy decrypt candidate loop | `vault/VaultSpec.kt`, `VaultCrypto.kt` | Iteration/salt/iv candidate fallback matching Android behavior | P1-03 | Legacy variants decrypt correctly |
| P1-05 | Implement payload encode/decode shape | `vault/VaultModels.kt`, `MemoryRecord.kt` | Codable models + flexible map/list decoding | P1-03 | Payload round-trip stable |
| P1-06 | Add fixture compatibility tests | `VaultCryptoTest.kt`, `docs/fixtures/*` | iOS unit tests for `vault-100000.emma`, `vault-310000.emma`, version header, flexible salt/iv | P1-04 | Test suite passes |
| P1-07 | Implement vault smoke checks | `vault/VaultSmoke.kt`, `VaultRepository.kt` | Resume and crypto parity status helpers | P1-05 | QA helper API returns expected status values |

## Phase 2 - Vault Repository and Persistence Flows

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P2-01 | Implement `VaultRepository` lifecycle APIs | `vault/VaultRepository.kt` | `VaultStore` actor with create/open/openAutosave/save/export/share/lock | P1-06 | Behavior parity on happy path |
| P2-02 | Implement autosave and dirty-state debounce | `VaultRepository.kt` | Local autosave file + debounce + metadata updates | P2-01 | Dirty edits autosave reliably |
| P2-03 | Persist vault metadata and hints | `vault/VaultPreferences.kt` | `UserDefaults` storage for last URI/name/autosave/onboarding/crypto hint | P2-01 | Resume state restored after relaunch |
| P2-04 | Implement memory CRUD with media records | `VaultRepository.kt`, `MemoryRecord.kt` | Add/update memory, attachments, tags, people link fields | P2-01 | Memory operations match Android behavior |
| P2-05 | Implement image compression parity | `VaultRepository.kt` (`compressImage`) | JPEG compression path (max dimension, quality parity) | P2-04 | Attachment sizes and types match expected behavior |
| P2-06 | Implement people CRUD and avatar media | `VaultRepository.kt`, `VaultModels.kt` | addOrUpdatePerson/deletePerson + avatar handling | P2-04 | People flows behave like Android |
| P2-07 | Implement relationship rebuild and layout settings writes | `VaultRepository.kt`, `VaultModels.kt` | Relationship map rebuild + `constellation_layout_v1` updates | P2-04 | Memory/person linkage parity confirmed |
| P2-08 | Implement repository error/state model | `vault/VaultState.kt` | iOS `VaultState` equivalent with status/message/error semantics | P2-01 | UI receives same state transitions |

## Phase 3 - App Shell, Navigation, and Global Flows

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P3-01 | Implement app route graph | `ui/EmmaApp.kt` | SwiftUI route coordinator for landing/dashboard/search/chat/memories/people/settings | P0-01 | Route flow parity complete |
| P3-02 | Implement pending vault actions and passphrase modal | `ui/EmmaApp.kt` (`PendingVaultAction`) | iOS pending-action model and passphrase prompts | P2-01 | open/create/export/autosave/share prompts mirror Android |
| P3-03 | Implement landing and onboarding | `ui/VaultLandingScreen.kt` | Landing UI, resume cards, onboarding state | P2-03 | Resume/open/create paths match Android |
| P3-04 | Implement dashboard shell and radial actions | `ui/EmmaApp.kt` dashboard section | Dashboard with orb, menu sheet, quick actions | P3-01 | Navigation actions match Android |
| P3-05 | Implement vault control panel modal | `ui/components/VaultControlPanelDialog.kt` | iOS vault panel with save/export/share/autosave/lock | P2-01 | Panel behavior and state messaging match |
| P3-06 | Implement settings sheet scaffolding and overlay flow | `ui/EmmaApp.kt`, `settings/*` | Settings presentation model and section routing | P3-01 | Settings open/close and save parity achieved |

## Phase 4 - Feature Screens (Search, People, Memories, Constellation, Chat UI)

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P4-01 | Implement unified search screen | `ui/screens/UnifiedSearchScreen.kt` | Tokenized search across memories/people/tags | P2-04, P2-06 | Result counts and navigation parity |
| P4-02 | Implement people screen with add/edit/delete | `ui/screens/PeopleScreen.kt` | Person cards, relation styling, avatar picker, detail modal | P2-06 | End-to-end people CRUD parity |
| P4-03 | Implement memory gallery screen | `ui/screens/MemoryGalleryScreen.kt` | Searchable grid, thumb previews, open/edit actions | P2-04 | Gallery behavior parity |
| P4-04 | Implement constellation graph interactions | `ui/screens/ConstellationScreen.kt` | Pan/zoom/drag nodes, filter chips, mode toggle | P2-07 | Gestures and filters parity |
| P4-05 | Implement constellation local/vault layout persistence | `ui/constellation/ConstellationPreferences.kt`, `ConstellationScreen.kt` | Persist filters/scale/offset/layout with vault-scoped keys | P4-04 | Layout restored after relaunch |
| P4-06 | Implement memory preview and edit dialogs | `ui/EmmaApp.kt` dialog sections | Memory preview/edit with people/tags/attachments controls | P2-04, P2-06 | Manual create/edit parity |
| P4-07 | Implement chat screen UI contracts | `ui/screens/ChatScreen.kt`, `voice/VoicePayload.kt` | Transcript bubbles, payload cards, suggestion chips, attachment composer | P3-01 | Chat UI states match Android |

## Phase 5 - Voice, Network, and Tool Execution

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P5-01 | Implement API clients | `network/EmmaApiClient.kt`, `OpenAiResponsesClient.kt` | Token/manifest client + OpenAI responses client | P0-03 | Network calls succeed with expected contracts |
| P5-02 | Implement `VoiceSessionManager` core state machine | `voice/VoiceSessionManager.kt`, `VoiceModels.kt` | iOS session controller with equivalent state model | P5-01 | Connect/disconnect/state transitions parity |
| P5-03 | Implement WebSocket protocol parity | `VoiceSessionManager.kt` | Outbound and inbound message handling for all known types | P5-02 | `start_session`, `set_api_key`, `user_text`, `tool_result` flow works |
| P5-04 | Implement local STT + permission handling | `LocalSpeechRecognizer.kt`, `ChatScreen.kt` | `SFSpeechRecognizer` wrapper + microphone/speech permission UX | P5-02 | Recording/transcript flow parity |
| P5-05 | Implement server audio playback + local TTS fallback | `VoiceAudioPlayer.kt`, `LocalTtsPlayer.kt` | mp3 decode/play + fallback `AVSpeechSynthesizer` | P5-03 | Audio behavior parity for online/offline paths |
| P5-06 | Implement connectivity and reconnect strategy | `VoiceSessionManager.kt` | Network monitor + exponential reconnect/backoff logic | P5-02 | Reconnect behavior mirrors Android |
| P5-07 | Port tool definitions exactly | `voice/OpenAiToolDefinitions.kt` | Same JSON tool schema set in iOS | P5-02 | Tool names/params identical |
| P5-08 | Implement local tool executor | `voice/AndroidToolExecutor.kt` | iOS executor bound to `VaultStore` for all tool names | P2-04, P2-06, P5-07 | Tool request/response parity validated |
| P5-09 | Implement local fallback assistant path | `VoiceSessionManager.kt` local OpenAI path | Local response fallback + tool output continuation | P5-02, P5-08 | Fallback path parity |

## Phase 6 - Intelligence and Offline Behavior

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P6-01 | Port `VectorlessEngine` | `intelligence/VectorlessEngine.kt` | iOS vectorless relevance/response module | P2-04 | Search/intent scoring parity tests pass |
| P6-02 | Port `IntelligentCaptureEngine` | `intelligence/IntelligentCaptureEngine.kt` | Memory-worthiness scoring, draft enrichment, prompts | P6-01 | Capture recommendations match |
| P6-03 | Port `UnifiedIntelligence` orchestration | `intelligence/UnifiedIntelligence.kt` | Intent routing, clarification, save prompts, proactive checks | P6-01, P6-02, P5-08 | Unified responses parity for scripted scenarios |
| P6-04 | Port conversation state manager | `intelligence/ConversationStateManager.kt` | State transitions/history utility | P6-03 | State transitions mirror Android |
| P6-05 | Port offline responder | `voice/OfflineEmmaResponder.kt` | Deterministic offline chat behavior | P2-04, P2-06 | Offline scripted cases pass |
| P6-06 | Wire settings toggles into intelligence/voice | `settings/SettingsPreferences.kt`, `AiPreferences.kt`, `VoiceSessionManager.kt` | iOS settings influence voice/intelligence logic | P6-03 | Toggle behavior parity validated |

## Phase 7 - Theme, Orb, and UI Fidelity

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P7-01 | Port palette catalog and theme tokens | `ui/theme/EmmaPalettes.kt`, `Theme.kt`, `Type.kt` | Swift theme system matching IDs/colors/labels | P3-01 | Theme switching parity |
| P7-02 | Implement orb renderer | `ui/orb/EmorbView.kt`, `EmorbSurface.kt` | Metal/SceneKit shader orb with inline/fullscreen modes | P3-04 | Orb visuals and interactions acceptable parity |
| P7-03 | Implement orb registry lifecycle behavior | `ui/orb/EmorbRegistry.kt` | Active orb lifecycle control to avoid duplicate renders | P7-02 | No lifecycle glitches across routes |
| P7-04 | Recreate key interaction polish | `ui/*` | Motion/reduced-motion/high-contrast and chip/sheet behaviors | P7-01 | UX parity checklist passes |

## Phase 8 - QA, Cross-Compatibility, and Release

| ID | Story | Android source(s) | iOS deliverable | Depends on | Done when |
|---|---|---|---|---|---|
| P8-01 | Crypto compatibility matrix tests | `VaultCryptoTest.kt`, `docs/fixtures/*` | Android/web/iOS open-create-save round-trip suite | P1-06, P2-01 | Matrix fully green |
| P8-02 | WS protocol contract tests | `VoiceSessionManager.kt` | Simulated server test harness for message types | P5-03 | Contract suite green |
| P8-03 | UI flow smoke tests | `ui/*` | Automated route-level smoke tests (launch to major flows) | P4-07 | Smoke suite green |
| P8-04 | Manual parity pass | entire Android app | Step-by-step parity checklist run on device | all prior | No blocking parity gaps |
| P8-05 | Performance and memory profiling | `VoiceSessionManager.kt`, `ui/screens/ConstellationScreen.kt` | Profiling report and optimizations | P8-03 | Meets agreed startup/interaction thresholds |
| P8-06 | Security hardening and distribution prep | `settings/AiPreferences.kt`, vault flows | Keychain/API key review, signing, TestFlight packaging | P8-04 | RC candidate ready |

## Acceptance Gates

### Gate A - Vault Compatibility
- iOS can decrypt Android fixtures in `docs/fixtures/`.
- iOS-created `.emma` opens in Android and web.
- Android-created `.emma` opens in iOS.

### Gate B - Route/Flow Parity
- Landing, dashboard, search, chat, memories, people, settings all navigable.
- Vault actions (open/create/save/export/share/autosave/lock) match Android state transitions.

### Gate C - Voice/Tool Parity
- WebSocket session lifecycle matches Android.
- Tool request/response works for all tool names currently defined.
- Offline fallback behavior works when disconnected.

### Gate D - UX and Settings Parity
- Theme/background/reduced-motion/high-contrast/font-size toggles behave consistently.
- Constellation filters/layout persistence and people/memory linking are preserved.

## Critical Risks and Mitigations

1. Crypto interoperability drift  
Mitigation: lock constants and fixture tests first (Phase 1) before UI work.

2. Voice protocol drift with backend expectations  
Mitigation: contract tests against recorded Android message samples.

3. iOS speech permission/runtime differences  
Mitigation: explicit state machine tests for permission denied/interrupted/retry paths.

4. Orb rendering mismatch across GPU families  
Mitigation: implement fallback rendering path and profile on multiple iOS devices.

5. Scope creep from web parity requests  
Mitigation: parity contract explicitly anchored to Android baseline commit `24aa0ebb`.

## Suggested Delivery Order
1. Phase 0 and 1 (contract + crypto)  
2. Phase 2 and 3 (vault store + app shell)  
3. Phase 4 and 5 (screens + voice/tools)  
4. Phase 6 and 7 (intelligence + visual fidelity)  
5. Phase 8 (QA hardening and release)

## Progress Tracking Template

Use this status legend per story: `Not started`, `In progress`, `Blocked`, `Done`.

| Story ID | Owner | Status | Target date | Notes |
|---|---|---|---|---|
| P0-01 |  | Not started |  |  |
| P0-02 |  | Not started |  |  |
| P0-03 |  | Not started |  |  |
| P0-04 |  | Not started |  |  |
| P1-01 |  | Not started |  |  |
| P1-02 |  | Not started |  |  |
| P1-03 |  | Not started |  |  |
| P1-04 |  | Not started |  |  |
| P1-05 |  | Not started |  |  |
| P1-06 |  | Not started |  |  |
| P1-07 |  | Not started |  |  |
| P2-01 |  | Not started |  |  |
| P2-02 |  | Not started |  |  |
| P2-03 |  | Not started |  |  |
| P2-04 |  | Not started |  |  |
| P2-05 |  | Not started |  |  |
| P2-06 |  | Not started |  |  |
| P2-07 |  | Not started |  |  |
| P2-08 |  | Not started |  |  |
| P3-01 |  | Not started |  |  |
| P3-02 |  | Not started |  |  |
| P3-03 |  | Not started |  |  |
| P3-04 |  | Not started |  |  |
| P3-05 |  | Not started |  |  |
| P3-06 |  | Not started |  |  |
| P4-01 |  | Not started |  |  |
| P4-02 |  | Not started |  |  |
| P4-03 |  | Not started |  |  |
| P4-04 |  | Not started |  |  |
| P4-05 |  | Not started |  |  |
| P4-06 |  | Not started |  |  |
| P4-07 |  | Not started |  |  |
| P5-01 |  | Not started |  |  |
| P5-02 |  | Not started |  |  |
| P5-03 |  | Not started |  |  |
| P5-04 |  | Not started |  |  |
| P5-05 |  | Not started |  |  |
| P5-06 |  | Not started |  |  |
| P5-07 |  | Not started |  |  |
| P5-08 |  | Not started |  |  |
| P5-09 |  | Not started |  |  |
| P6-01 |  | Not started |  |  |
| P6-02 |  | Not started |  |  |
| P6-03 |  | Not started |  |  |
| P6-04 |  | Not started |  |  |
| P6-05 |  | Not started |  |  |
| P6-06 |  | Not started |  |  |
| P7-01 |  | Not started |  |  |
| P7-02 |  | Not started |  |  |
| P7-03 |  | Not started |  |  |
| P7-04 |  | Not started |  |  |
| P8-01 |  | Not started |  |  |
| P8-02 |  | Not started |  |  |
| P8-03 |  | Not started |  |  |
| P8-04 |  | Not started |  |  |
| P8-05 |  | Not started |  |  |
| P8-06 |  | Not started |  |  |
