# Graph Report - louvor-ide  (2026-09-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2361 nodes · 4288 edges · 141 communities (124 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51cefae6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-model.test.js
- unavailability-service.js
- unavailability-page.js
- package.json
- design-system.test.js
- schedules-editor-performance.test.js
- ScheduleRepository
- event-service.js
- MusicRepository
- app-shell.js
- schedule-export-polish.js
- dashboard.test.js
- setlist-performance-view.js
- MusicCatalogPage
- DomainRepository
- schedules-page.js
- events-page.js
- event-repository.js
- SetlistRepository
- schedules-monthly-ui.js
- users-page.js
- music-ai-import-base.js
- song-form.js
- SetlistManager
- UserService
- FirebaseMusicAIProvider
- MusicService
- events-controller.js
- music-ai-universal-input.test.js
- auth-service.test.js
- music-ai-import.js
- migrate-legacy-data.cjs
- music-ai-service.js
- audit-log.test.js
- migrate-access-profiles.cjs
- settings-page.js
- UserRepository
- auth-service.js
- dashboard-page.js
- lgpd-service.js
- legacy-cleanup.test.js
- mobile-auth-compat.js
- setlist-service.js
- IndexPage
- provision-users.cjs
- security-profile-gate.test.js
- chord-transposer.js
- filter-panel.js
- TransposeService
- setlist-schedule.js
- form-controls.js
- firebase-music-ai-provider.js
- function-display-order.js
- setlists-simple.js
- UnavailabilityRepository
- listar.js
- Utils
- observability.js
- tokens.test.js
- audit-page.js
- production-full-system-v2.e2e.cjs
- input.js
- audit-auth-runtime.js
- setlist-history-service.js
- production-full-system.e2e.cjs
- button.js
- permissions-page.js
- theme.test.js
- user-last-access-sync.test.js
- user-permissions-integration.js
- normalize-built-html-colors.js
- reconcile-auth-identities.cjs
- schedule-monthly-service.js
- accessibility.test.js
- navigation-state.test.js
- canonicalSectionProgression
- music-ai-import.test.js
- events-ui.test.js
- main-menu.test.js
- mobile-roadmap.test.js
- permissions.test.js
- production-ai-import.e2e.cjs
- schedule-export-polish.test.js
- auth-session-permissions-cache.test.js
- DatabaseService
- MessageService
- ministry-functions-ui.test.js
- observability.test.js
- production-mobile-auth.e2e.cjs
- route-catalog-guardrail.test.js
- schedules-ui.test.js
- ui-shell.test.js
- unavailability-filter-panel.test.js
- unavailability-ui.test.js
- firebase-config.js
- ui-quality-runtime.js
- function-display-order.test.js
- setlist-view-regression.test.js
- song-form.test.js
- TransposeService
- audit-repository.js
- auth-domain-normalization.test.js
- accessibility-responsive.test.js
- auth-account-linking.test.js
- firestore-rules.test.js
- primary-contrast.test.js
- provision-users.test.js
- setlist-theme.test.js
- songs-catalog-ui.test.js
- users-responsive-ui.test.js
- users-theme-contrast.test.js
- ui-state.js
- setlist-view-metadata.js
- architecture.test.js
- audit-hardening-regression.test.js
- login-ui.test.js
- music-catalog-regression.test.js
- performance-regression.test.js
- permission-dependency-errors.test.js
- route-access-firestore.test.js
- ui-consistency.test.js
- unavailability-rules.test.js
- auth-session-resilience.test.js
- backfill-schedule-template.cjs
- backfill-user-last-access.cjs
- salvar.js
- events-delete-rules-regression.test.js
- events-rules.test.js
- permissions-login-regression.test.js
- schedules-monthly-editor-race.test.js
- schedules-sorting-ui.test.js
- setlists-actions.test.js
- production-songs-navigation.e2e.cjs
- production-auth.e2e.cjs
- production-quality.e2e.cjs
- deploy
- setup
- music.js
- verificar-acordes.sh

## God Nodes (most connected - your core abstractions)
1. `MusicCatalogPage` - 35 edges
2. `ScheduleRepository` - 30 edges
3. `SetlistManager` - 27 edges
4. `SetlistRepository` - 26 edges
5. `bootstrap()` - 26 edges
6. `MusicService` - 22 edges
7. `el()` - 22 edges
8. `IndexPage` - 21 edges
9. `UserRepository` - 20 edges
10. `el()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `createHarness()` --calls--> `MinistryFunctionsService`  [EXTRACTED]
  tests/ministry-functions-service.test.js → src/services/ministry-functions-service.js
- `MockProvider` --inherits--> `MusicAIProvider`  [EXTRACTED]
  tests/music-ai-import.test.js → src/services/music-ai-provider.js
- `SongQuerySourceProvider` --inherits--> `MusicAIProvider`  [EXTRACTED]
  tests/music-ai-song-query-sources.test.js → src/services/music-ai-provider.js
- `AlwaysUnavailableProvider` --inherits--> `MusicAIProvider`  [EXTRACTED]
  tests/music-ai-universal-input.test.js → src/services/music-ai-provider.js
- `CaptureProvider` --inherits--> `MusicAIProvider`  [EXTRACTED]
  tests/music-ai-universal-input.test.js → src/services/music-ai-provider.js

## Import Cycles
- None detected.

## Communities (141 total, 15 thin omitted)

### Community 0 - "data-model.test.js"
Cohesion: 0.05
Nodes (30): assertOrder(), createMinistryFunctionDocument(), createUserDocument(), createUserFunctionDocument(), encodeIdPart(), normalizeEmail(), normalizeSlug(), permissionDocumentId() (+22 more)

### Community 1 - "unavailability-service.js"
Cohesion: 0.09
Nodes (39): actorId(), buildRecordRange(), canManageOthers(), conflictingRecords(), dateInRange(), dateKey(), embeddedPermission(), endOfDay() (+31 more)

### Community 2 - "unavailability-page.js"
Cohesion: 0.15
Nodes (50): actorId(), applyMonthFilter(), bootstrap(), changePersonFilter(), clearFilters(), dateKey(), el(), ensureEndDateField() (+42 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (46): firebase-tools, author, browserslist, bugs, url, dependencies, description, devDependencies (+38 more)

### Community 4 - "design-system.test.js"
Cohesion: 0.07
Nodes (42): assertDocument(), createAvatar(), createCard(), createChip(), createEmptyState(), createLoading(), createPagination(), createRoleChip() (+34 more)

### Community 5 - "schedules-editor-performance.test.js"
Cohesion: 0.08
Nodes (20): dateKey(), dateMatchesUnavailability(), normalizeLevel(), periodForTime(), profilePermissionLevel(), readDependency(), scheduleCompleteness(), ScheduleService (+12 more)

### Community 6 - "ScheduleRepository"
Cohesion: 0.10
Nodes (13): auditTimestamp(), buildDefaultSlots(), entities(), entity(), functionMapBySlug(), mergeDefaultSlots(), nextDefaultSlotId(), scheduleIdForEvent() (+5 more)

### Community 7 - "event-service.js"
Cohesion: 0.09
Nodes (29): actorId(), assertTransition(), canReadLevel(), dateKey(), embeddedPermission(), EventService, isFinalStatus(), isSuperAdmin() (+21 more)

### Community 8 - "MusicRepository"
Cohesion: 0.10
Nodes (16): COLLECTIONS, canEditSongs(), deleteSongAtomically(), findDuplicateSong(), initialize(), initializeDeleteAction(), initializeDuplicateGuard(), normalizeSongIdentity() (+8 more)

### Community 9 - "app-shell.js"
Cohesion: 0.11
Nodes (36): addClasses(), buildShell(), canViewItem(), createNavLink(), currentItem(), currentNavigationId(), currentPage(), element() (+28 more)

### Community 10 - "schedule-export-polish.js"
Cohesion: 0.13
Nodes (39): absenceCardLines(), absenceCards(), bootstrap(), brDateToKey(), clampKey(), cleanText(), collectAbsenceGroups(), configureAbsencePage() (+31 more)

### Community 11 - "dashboard.test.js"
Cohesion: 0.08
Nodes (18): DashboardRepository, snapshotToEntities(), buildDashboardViewModel(), byDate(), DashboardService, eventDate(), futureOrToday(), linkedDate() (+10 more)

### Community 12 - "setlist-performance-view.js"
Cohesion: 0.11
Nodes (34): bindEvents(), cacheElements(), changeFont(), changeTranspose(), clampFontSize(), escapeHtml(), formatDate(), getActiveSong() (+26 more)

### Community 14 - "DomainRepository"
Cohesion: 0.12
Nodes (12): createRepositoryRegistry(), DomainRepository, MinistryFunctionsRepository, PermissionsRepository, snapshotToEntity(), SongMinisterKeysRepository, UserFunctionsRepository, assert (+4 more)

### Community 15 - "schedules-page.js"
Cohesion: 0.16
Nodes (32): assignOptimistic(), bootstrap(), closePersonPicker(), compareSchedules(), currentSchedule(), editorUrl(), functionColorIndex(), functionName() (+24 more)

### Community 16 - "events-page.js"
Cohesion: 0.17
Nodes (30): bootstrap(), changeStatus(), clearFormFeedback(), createRequestId(), dateKey(), el(), ensureDateFilters(), ensureFormFeedback() (+22 more)

### Community 17 - "event-repository.js"
Cohesion: 0.14
Nodes (17): activeScheduleStatus(), activeSetlistStatus(), auditTimestamp(), buildScheduleSlots(), eventDocumentId(), EventRepository, linkedStatuses(), mapSnapshot() (+9 more)

### Community 18 - "SetlistRepository"
Cohesion: 0.13
Nodes (6): auditTimestamp(), cloneItems(), entities(), entity(), setlistIdForSchedule(), SetlistRepository

### Community 19 - "schedules-monthly-ui.js"
Cohesion: 0.16
Nodes (29): absencePeriod(), absenceRecords(), absenceSheet(), absenceTable(), addEditorMonthlySummary(), addMonthFilter(), bootstrap(), connectMonthToRange() (+21 more)

### Community 20 - "users-page.js"
Cohesion: 0.25
Nodes (28): alignUsersNavigation(), beginFunctionEdit(), bootstrap(), canEdit(), canEditFunctions(), clearUserFormFeedback(), dateText(), defaultPermissions() (+20 more)

### Community 21 - "music-ai-import-base.js"
Cohesion: 0.14
Nodes (26): applySuggestion(), canonicalSectionKey(), canonicalSectionLabel(), cleanSectionContent(), compactDetailedSection(), compactSectionContent(), compactSectionIdentity(), compactShortSection() (+18 more)

### Community 22 - "song-form.js"
Cohesion: 0.15
Nodes (27): getMusicAIImportMetadata(), cancelBtn, clearStatus(), configureOptionalLyrics(), currentUser(), ensureLinkedMinistersVisible(), form, getData() (+19 more)

### Community 24 - "UserService"
Cohesion: 0.13
Nodes (14): canManageUsers(), cryptoRandom(), filterUsers(), normalize(), paginate(), UserService, assert, fs (+6 more)

### Community 25 - "FirebaseMusicAIProvider"
Cohesion: 0.14
Nodes (13): buildSystemInstruction(), classifyError(), ensureExplicitYoutubeVideo(), FirebaseMusicAIProvider, firebaseOptionsFromCompat(), friendlyAnalysisError(), generateStructuredJson(), generateStructuredResult() (+5 more)

### Community 27 - "events-controller.js"
Cohesion: 0.22
Nodes (24): bootstrap(), changeStatus(), createRequestId(), dateKey(), el(), escapeHtml(), eventLabel(), filteredEvents() (+16 more)

### Community 28 - "music-ai-universal-input.test.js"
Cohesion: 0.11
Nodes (10): buildChordSourceCandidates(), chordResultMatchesIdentity(), comparableIdentity(), slugifyChordPath(), MusicAIProvider, MockProvider, SongQuerySourceProvider, AlwaysUnavailableProvider (+2 more)

### Community 29 - "auth-service.test.js"
Cohesion: 0.09
Nodes (10): buildCurrentReturnUrl(), currentPageName(), isLoginPage(), sanitizeReturnUrl(), assert, {
  bootstrap,
  buildCurrentReturnUrl,
  friendlyAuthError,
  isAllowedUser,
  isLoginPage,
  sanitizeReturnUrl
}, fs, path (+2 more)

### Community 30 - "music-ai-import.js"
Cohesion: 0.16
Nodes (20): canonicalLabel(), composeIdeMusicChordSheet(), EnhancedMusicAIService, escapeCueSeparatorsForLegacyFormatter(), FLAT_KEYS, harmonicIdentity(), lyricalIdentity(), mountMusicAIImport() (+12 more)

### Community 31 - "migrate-legacy-data.cjs"
Cohesion: 0.11
Nodes (21): compactObject(), countCollection(), crypto, inspectMapping(), LEGACY_MAPPINGS, loadAdmin(), main(), migrateMapping() (+13 more)

### Community 32 - "music-ai-service.js"
Cohesion: 0.19
Nodes (19): classifyMusicAIInput(), compactText(), countChordTokens(), discardSparseChord(), enrichNormalizedData(), extractLyricsFromPastedMusicText(), fingerprint(), hasUsefulChordDetail() (+11 more)

### Community 33 - "audit-log.test.js"
Cohesion: 0.08
Nodes (21): assert, auditPage, auditRepository, authAudit, dataModel, events, fs, functionsService (+13 more)

### Community 34 - "migrate-access-profiles.cjs"
Cohesion: 0.11
Nodes (18): normalizeProfile(), permissionsFor(), profileDefinition(), { applicationDefault, initializeApp }, { FieldValue, getFirestore }, loadPermissionMap(), main(), materializedPermissionSnapshot() (+10 more)

### Community 35 - "settings-page.js"
Cohesion: 0.22
Nodes (22): auditFunction(), bootstrap(), defaultQuantity(), handleFunctionAction(), iconFor(), iconOptions(), injectStyles(), isAdmin() (+14 more)

### Community 36 - "UserRepository"
Cohesion: 0.18
Nodes (3): defaultServerTimestamp(), entity(), UserRepository

### Community 37 - "auth-service.js"
Cohesion: 0.21
Nodes (21): applyTheme(), authorizationFailureMessage(), bootstrap(), failInitialization(), clearAuthorizationCache(), consumeAuthMessage(), exposeAuthState(), finishPageReveal() (+13 more)

### Community 38 - "dashboard-page.js"
Cohesion: 0.24
Nodes (21): badge(), bootstrap(), configureSectionLinks(), dateInputValue(), element(), empty(), formatDate(), formatDateTime() (+13 more)

### Community 39 - "lgpd-service.js"
Cohesion: 0.16
Nodes (19): bootstrapGate(), buildConsentAuditPayload(), buildConsentPayload(), consentDocumentId(), currentPageName(), currentReturnUrl(), gateDestination(), isConsentPage() (+11 more)

### Community 40 - "legacy-cleanup.test.js"
Cohesion: 0.13
Nodes (19): archive(), assertCanonicalCoverage(), chunks(), fetchDocs(), loadAdmin(), main(), removeSource(), restore() (+11 more)

### Community 41 - "mobile-auth-compat.js"
Cohesion: 0.22
Nodes (18): createGoogleProvider(), embeddedBrowserMessage(), friendlyAuthError(), googleAuthStrategy(), install(), installGoogleSignIn(), isEmbeddedBrowser(), isIpadOs() (+10 more)

### Community 42 - "setlist-service.js"
Cohesion: 0.21
Nodes (12): eligibleMinisters(), functionIsMinister(), normalize(), normalizeDressCodeColors(), normalizeHexColor(), normalizeOrder(), preferredKey(), SetlistService (+4 more)

### Community 44 - "provision-users.cjs"
Cohesion: 0.15
Nodes (18): allowedRoles, { applicationDefault, initializeApp }, canonicalFunctionSlug(), configPath, defaultMinistryFunctions, extractLegacyFunctionLabels(), { FieldValue, getFirestore }, fs (+10 more)

### Community 45 - "security-profile-gate.test.js"
Cohesion: 0.12
Nodes (12): loadAccessProfiles(), loadEffectivePermissions(), profileRevision(), resolveAuthorizedProfile(), assert, {
  loadEffectivePermissions,
  resolveAuthorizedProfile
}, test, assert (+4 more)

### Community 46 - "chord-transposer.js"
Cohesion: 0.24
Nodes (16): escapeHtml(), highlightChords(), isValidKey(), isValidSuffix(), normalizeKey(), parseChordCore(), resolveSetlistFinalKey(), semitoneDistance() (+8 more)

### Community 47 - "filter-panel.js"
Cohesion: 0.22
Nodes (17): activeCount(), appDirectory(), applyReturnNavigation(), bootstrap(), currentPage(), currentRelativeUrl(), initPanel(), isControlActive() (+9 more)

### Community 49 - "setlist-schedule.js"
Cohesion: 0.28
Nodes (17): addSong(), bindDressCode(), init(), librarySong(), normalizeLegacyFields(), removeSong(), renderContext(), renderDressCode() (+9 more)

### Community 50 - "form-controls.js"
Cohesion: 0.35
Nodes (16): assertDocument(), createCheckbox(), createColorPicker(), createDatePicker(), createMultiSelect(), createPicker(), createRadioGroup(), createSearchSelect() (+8 more)

### Community 51 - "firebase-music-ai-provider.js"
Cohesion: 0.21
Nodes (14): extractSongIdentityFromChordUrl(), hasVideoCandidate(), hostnameOf(), isBananaCifrasUrl(), isCifraClubUrl(), loadPublicConfig(), mergeEmbeddedVideoLookup(), normalizeUrlForComparison() (+6 more)

### Community 52 - "function-display-order.js"
Cohesion: 0.29
Nodes (16): bootstrapExportOrder(), bootstrapSettings(), buildRank(), fallbackSort(), injectNavigation(), injectStyles(), isAdmin(), loadFunctions() (+8 more)

### Community 53 - "setlists-simple.js"
Cohesion: 0.25
Nodes (16): actions(), bind(), canEditSetlists(), card(), configureView(), filters(), init(), navigation() (+8 more)

### Community 54 - "UnavailabilityRepository"
Cohesion: 0.21
Nodes (4): defaultServerTimestamp(), mapSnapshot(), snapshotToEntity(), UnavailabilityRepository

### Community 55 - "listar.js"
Cohesion: 0.25
Nodes (14): allMusicas, applyFilters(), clearFilters(), createMusicCard(), debounce(), fallbackRender(), filteredMusicas, initializeApp() (+6 more)

### Community 57 - "observability.js"
Cohesion: 0.24
Nodes (15): appendEnhancementScript(), createCorrelationId(), debug(), emit(), error(), info(), installGlobalErrorMonitoring(), loadPageEnhancement() (+7 more)

### Community 58 - "tokens.test.js"
Cohesion: 0.13
Nodes (13): assert, contrast(), foundationTokens, fs, luminance(), makefile, path, root (+5 more)

### Community 59 - "audit-page.js"
Cohesion: 0.29
Nodes (14): actorMarkup(), actorName(), appendNextChunk(), bootstrap(), createRow(), ensureLayout(), filters(), installStyles() (+6 more)

### Community 60 - "production-full-system-v2.e2e.cjs"
Cohesion: 0.15
Nodes (11): admin, artifactsDir, assert, assertHealthy(), { chromium }, fs, futureDate, path (+3 more)

### Community 61 - "input.js"
Cohesion: 0.29
Nodes (11): appendDescription(), applyControlAttributes(), assertDocument(), createFieldShell(), createInput(), createTextarea(), normalizeId(), normalizeSize() (+3 more)

### Community 62 - "audit-auth-runtime.js"
Cohesion: 0.29
Nodes (13): auditPayload(), bootstrapAuditRoute(), clearLoggedUid(), connect(), loadScript(), providerIds(), readLoggedUid(), record() (+5 more)

### Community 63 - "setlist-history-service.js"
Cohesion: 0.22
Nodes (11): dateKey(), filter(), isHistory(), matches(), normalizeDressCodeColors(), normalizeItem(), split(), toDate() (+3 more)

### Community 64 - "production-full-system.e2e.cjs"
Cohesion: 0.16
Nodes (11): admin, artifactsDir, assert, assertHealthyPage(), { chromium }, fs, futureDate, path (+3 more)

### Community 65 - "button.js"
Cohesion: 0.29
Nodes (10): appendIcon(), applyCommonState(), assertDocument(), createButton(), createIconButton(), createLabel(), normalizeOption(), assert (+2 more)

### Community 66 - "permissions-page.js"
Cohesion: 0.29
Nodes (12): bootstrap(), collectChanges(), ensureStyles(), invalidatePermissions(), loadPermissions(), loadUsers(), persistChanges(), queryPermissions() (+4 more)

### Community 67 - "theme.test.js"
Cohesion: 0.15
Nodes (11): assert, auth, designSystemCss, fs, migrationCss, pages, path, root (+3 more)

### Community 68 - "user-last-access-sync.test.js"
Cohesion: 0.15
Nodes (11): assert, authAudit, backfill, fs, path, root, rules, test (+3 more)

### Community 69 - "user-permissions-integration.js"
Cohesion: 0.42
Nodes (11): accessProfiles(), bootstrap(), effectiveProfileId(), ensureAccessProfiles(), escapeHtml(), hydrateEditingProfile(), isSuperAdmin(), patchUserService() (+3 more)

### Community 70 - "normalize-built-html-colors.js"
Cohesion: 0.23
Nodes (10): fs, injectAuditRuntime(), normalizeCssColors(), normalizeDirectory(), normalizeHtml(), path, replacements, assert (+2 more)

### Community 71 - "reconcile-auth-identities.cjs"
Cohesion: 0.29
Nodes (11): { applicationDefault, initializeApp }, { FieldValue, getFirestore }, { getAuth }, getAuthUserByEmailOrNull(), getAuthUserOrNull(), KNOWN_EMAIL_REPAIRS, listAllAuthUsers(), main() (+3 more)

### Community 72 - "schedule-monthly-service.js"
Cohesion: 0.26
Nodes (10): dateKey(), monthBounds(), monthKey(), monthlyParticipation(), schedulesForMonth(), toDate(), unavailabilityOverlapsMonth(), assert (+2 more)

### Community 73 - "accessibility.test.js"
Cohesion: 0.17
Nodes (10): agents, assert, designSystem, fs, input, overlays, path, root (+2 more)

### Community 74 - "navigation-state.test.js"
Cohesion: 0.17
Nodes (10): assert, filterPanelSource, fs, path, schedulesSource, setlistsSource, songFormSource, songsSource (+2 more)

### Community 75 - "canonicalSectionProgression"
Cohesion: 0.36
Nodes (11): canonicalizeRawChordSheet(), canonicalSectionProgression(), collapseConsecutiveChordCycles(), extractChordLine(), lyricCue(), normalizeChordToken(), normalizeKeyRoot(), parseCompactCueLine() (+3 more)

### Community 76 - "music-ai-import.test.js"
Cohesion: 0.40
Nodes (9): extractYouTubeVideoId(), MUSIC_AI_RESPONSE_JSON_SCHEMA, MUSIC_AI_SCHEMA_VERSION, normalizeBpm(), normalizeCapoFret(), normalizeHttpUrl(), normalizeMusicAIResponse(), normalizeMusicalKey() (+1 more)

### Community 77 - "events-ui.test.js"
Cohesion: 0.18
Nodes (10): assert, css, filterPanel, fs, html, page, path, repository (+2 more)

### Community 78 - "main-menu.test.js"
Cohesion: 0.18
Nodes (10): assert, css, expectedLabels, fs, helpPage, modulePage, path, root (+2 more)

### Community 79 - "mobile-roadmap.test.js"
Cohesion: 0.18
Nodes (9): assert, designCss, fs, menuCss, path, performanceCss, performanceHtml, root (+1 more)

### Community 80 - "permissions.test.js"
Cohesion: 0.18
Nodes (10): assert, fs, moduleHtml, modules, page, path, root, rules (+2 more)

### Community 81 - "production-ai-import.e2e.cjs"
Cohesion: 0.22
Nodes (9): admin, analyzeCifraClub(), assert, CASES, { chromium }, countHeader(), fs, path (+1 more)

### Community 82 - "schedule-export-polish.test.js"
Cohesion: 0.18
Nodes (9): appShell, assert, fs, moduleHtml, path, root, source, test (+1 more)

### Community 83 - "auth-session-permissions-cache.test.js"
Cohesion: 0.24
Nodes (8): isActiveProfile(), readAuthorizationCache(), writeAuthorizationCache(), assert, {
  AUTHORIZATION_CACHE_KEY,
  clearAuthorizationCache,
  readAuthorizationCache,
  resolveAuthorizedProfile,
  writeAuthorizationCache
}, collection(), snapshot(), test

### Community 86 - "ministry-functions-ui.test.js"
Cohesion: 0.20
Nodes (9): assert, fs, path, root, rules, settingsPage, shell, test (+1 more)

### Community 87 - "observability.test.js"
Cohesion: 0.22
Nodes (9): assert, createScope(), fs, loadObservability(), path, root, source, test (+1 more)

### Community 88 - "production-mobile-auth.e2e.cjs"
Cohesion: 0.36
Nodes (9): admin, assert, assertFirstPartyAuthDomain(), { chromium, webkit, devices }, validateDesktopStrategy(), validateEmbeddedBrowserGuard(), validateMobileLogin(), waitForAuthCompat() (+1 more)

### Community 89 - "route-catalog-guardrail.test.js"
Cohesion: 0.22
Nodes (9): accessProfiles, appShellSource, assert, fs, path, root, routeObjectsFromSource(), routes (+1 more)

### Community 90 - "schedules-ui.test.js"
Cohesion: 0.20
Nodes (9): assert, css, fs, loader, monthlyUi, page, path, root (+1 more)

### Community 91 - "ui-shell.test.js"
Cohesion: 0.22
Nodes (8): assert, contrastRatio(), fs, path, projectRoot, protectedPages, relativeLuminance(), test

### Community 92 - "unavailability-filter-panel.test.js"
Cohesion: 0.20
Nodes (9): assert, css, fs, html, page, path, repository, root (+1 more)

### Community 93 - "unavailability-ui.test.js"
Cohesion: 0.20
Nodes (9): assert, css, fs, html, page, path, repository, root (+1 more)

### Community 94 - "firebase-config.js"
Cohesion: 0.31
Nodes (8): createHybridDB(), exemploMusicas, firebaseConfig, initializeFirebase(), initializeLocalStorage(), initializeSystem(), missingVars, requiredEnvVars

### Community 95 - "ui-quality-runtime.js"
Cohesion: 0.44
Nodes (8): apply(), ensureFormNames(), ensureLoginTouchTargets(), ensurePrimaryHeading(), ensureScrollableKeyboardAccess(), scheduleApply(), start(), wrapUnavailabilityRows()

### Community 96 - "function-display-order.test.js"
Cohesion: 0.22
Nodes (8): assert, fs, moduleHtml, orderModule, path, root, rules, test

### Community 97 - "setlist-view-regression.test.js"
Cohesion: 0.22
Nodes (8): assert, fixes, fs, metadata, page, path, root, test

### Community 98 - "song-form.test.js"
Cohesion: 0.22
Nodes (8): assert, controller, fs, html, path, repository, root, test

### Community 100 - "audit-repository.js"
Cohesion: 0.39
Nodes (4): asDate(), AuditRepository, filterLogs(), mapSnapshot()

### Community 101 - "auth-domain-normalization.test.js"
Cohesion: 0.32
Nodes (6): fs, normalizeAuthDomainFile(), normalizeAuthDomainSource(), assert, { normalizeAuthDomainSource }, test

### Community 102 - "accessibility-responsive.test.js"
Cohesion: 0.25
Nodes (6): assert, criticalPages, fs, path, root, test

### Community 103 - "auth-account-linking.test.js"
Cohesion: 0.25
Nodes (7): assert, fs, path, root, script, test, workflow

### Community 104 - "firestore-rules.test.js"
Cohesion: 0.25
Nodes (6): assert, fs, path, rules, rulesPath, test

### Community 105 - "primary-contrast.test.js"
Cohesion: 0.25
Nodes (5): assert, fs, path, root, test

### Community 106 - "provision-users.test.js"
Cohesion: 0.25
Nodes (7): assert, configPath, fs, path, projectRoot, scriptPath, test

### Community 107 - "setlist-theme.test.js"
Cohesion: 0.25
Nodes (7): assert, controller, fs, page, path, styles, test

### Community 108 - "songs-catalog-ui.test.js"
Cohesion: 0.25
Nodes (7): assert, fs, html, pageJs, path, serviceJs, test

### Community 109 - "users-responsive-ui.test.js"
Cohesion: 0.29
Nodes (7): assert, css, fs, html, path, root, test

### Community 110 - "users-theme-contrast.test.js"
Cohesion: 0.25
Nodes (7): assert, css, fs, html, path, root, test

### Community 111 - "ui-state.js"
Cohesion: 0.43
Nodes (5): createUiState(), errorState(), loadingState(), successState(), UI_STATUS

### Community 112 - "setlist-view-metadata.js"
Cohesion: 0.52
Nodes (6): escapeHtml(), formatDate(), loadSetlistMetadata(), normalizeDressCodeColors(), renderDressCode(), updateHeaderMeta()

### Community 113 - "architecture.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 114 - "audit-hardening-regression.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 115 - "login-ui.test.js"
Cohesion: 0.29
Nodes (6): assert, fs, loginHtml, loginPath, path, test

### Community 116 - "music-catalog-regression.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 117 - "performance-regression.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 118 - "permission-dependency-errors.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 119 - "route-access-firestore.test.js"
Cohesion: 0.29
Nodes (6): assert, fs, path, root, source, test

### Community 120 - "ui-consistency.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 121 - "unavailability-rules.test.js"
Cohesion: 0.29
Nodes (5): assert, fs, path, rules, test

### Community 122 - "auth-session-resilience.test.js"
Cohesion: 0.40
Nodes (5): isTransientAuthorizationError(), withAuthorizationRetry(), assert, {
  isTransientAuthorizationError,
  withAuthorizationRetry
}, test

### Community 123 - "backfill-schedule-template.cjs"
Cohesion: 0.53
Nodes (5): loadAdmin(), main(), mergeTemplate(), nextSlotId(), TEMPLATE

### Community 124 - "backfill-user-last-access.cjs"
Cohesion: 0.40
Nodes (5): { applicationDefault, initializeApp }, db, { getFirestore }, main(), toMillis()

### Community 125 - "salvar.js"
Cohesion: 0.53
Nodes (4): isValidURL(), limparFormulario(), salvarMusica(), showMessage()

### Community 126 - "events-delete-rules-regression.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, path, rules, test

### Community 127 - "events-rules.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, path, rules, test

### Community 128 - "permissions-login-regression.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, path, rules, test

### Community 129 - "schedules-monthly-editor-race.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, path, source, test

### Community 130 - "schedules-sorting-ui.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, path, source, test

### Community 131 - "setlists-actions.test.js"
Cohesion: 0.40
Nodes (5): assert, fs, html, path, test

### Community 132 - "production-songs-navigation.e2e.cjs"
Cohesion: 0.50
Nodes (3): admin, assert, { chromium }

## Knowledge Gaps
- **632 isolated node(s):** `assert`, `dataModel`, `EXPECTED_COLLECTIONS`, `fs`, `{ MinistryFunctionsService }` (+627 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 800 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MusicService` connect `MusicService` to `Utils`, `MessageService`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `Utils` connect `Utils` to `TransposeService`, `MusicService`, `IndexPage`, `MessageService`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `assert`, `dataModel`, `EXPECTED_COLLECTIONS` to the rest of the system?**
  _632 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-model.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._
- **Should `unavailability-service.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09143686502177069 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `design-system.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07493061979648474 - nodes in this community are weakly interconnected._