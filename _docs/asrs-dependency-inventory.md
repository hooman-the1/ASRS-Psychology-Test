# Copied ASRS dependency inventory

This is a handoff for issues #47, #48, #49, #51, and #69. Paths below are relative to the repository root; `copied-from-main-repo/` is read-only reference material, ignored by `.gitignore`, and is **not present in a fresh checkout**. Observations describe the copied files as they stand. Dispositions are extraction recommendations, not implemented changes.

## Feature boundary and imports

All seven files under `copied-from-main-repo/src/app/user/tests/asrs/` are accounted for:

| File | Observed imports or role | Disposition and owner |
| --- | --- | --- |
| `asrs.component.ts` | `@angular/core` (`Component`, `OnInit`), `@angular/forms` (`FormBuilder`, `FormGroup`, `Validators`, `FormArray`, `FormControl`), `@angular/common/http` (`HttpClient`); local `./asrs.helpers` and `./asrs.constants`; outside-boundary `src/app/share/sessionid.service` and `src/environments/environment` | Preserve component and form behavior locally in #47/#48; remove HTTP, session, environment, and endpoint coupling in #51. See backend section. |
| `asrs.component.html` | Component template; Angular structural/form directives, Material elements, gauge selector, and Persian-number pipe detailed below | Preserve questionnaire/result structure in #47; localize suppliers in #48/#49 and styling in #69. |
| `asrs.component.scss` | Component stylesheet, no imports | Preserve relevant rules in #47/#69; inspect unused `.snack-success` in #84. |
| `asrs.constants.ts` | No imports; questions and severity/result content | Preserve locally in #47, then visually verify Persian text in #65/#66. |
| `asrs.helpers.ts` | Local `./asrs.constants` only; severity thresholds, text/color/emoji and gauge markers | Preserve locally in #47/#49; visually check text in #66. |
| `asrs.module.ts` | `@angular/core` `NgModule`, `@angular/common` `CommonModule`, `@angular/forms` `FormsModule` and `ReactiveFormsModule`; local `./asrs.component` and `./asrs-routing.module`; outside-boundary `src/app/share/share.module` and `src/app/ui-share/ui-share.module` | Move/adapt local feature boundary in #47; replace broad modules with only required imports in #48/#49. `FormsModule` has no observed `ngModel` use; investigate before carrying it. |
| `asrs-routing.module.ts` | `@angular/core` `NgModule`, `@angular/router` `RouterModule`, `Routes`; local `./asrs.component`; `RouterModule.forChild` registers empty child path | Adapt to standalone root routing in #50; do not carry unrelated user-area routes. |

`./...` imports stay inside the seven-file feature. The `src/...` imports resolve through the copied workspace's `baseUrl: "./"` in `copied-from-main-repo/tsconfig.json` to `copied-from-main-repo/src/app/share/share.module.ts`, `.../sessionid.service.ts`, `.../ui-share/ui-share.module.ts`, and `.../src/environments/environment.ts`. Package imports resolve through the copied `package.json`/lockfile, but are not automatically compatible with the root workspace.

## Template suppliers

All uses below occur in `copied-from-main-repo/src/app/user/tests/asrs/asrs.component.html` unless noted. `asrs.module.ts` imports the broad modules; their exported/declaration lists are in `copied-from-main-repo/src/app/share/share.module.ts` and `copied-from-main-repo/src/app/ui-share/ui-share.module.ts`.

| Template use | Observed supplier | Disposition and owner |
| --- | --- | --- |
| `*ngIf`, `*ngFor` | Angular `CommonModule` imported by `asrs.module.ts` (`@angular/common`) | Preserve minimal local import in #48. |
| `[formGroup]`, `[formControl]` on form and radio group | Angular `ReactiveFormsModule` imported by `asrs.module.ts` (`@angular/forms`); form built in `asrs.component.ts` | Preserve in #48. `FormsModule` is imported but no template-driven form directive is visible; investigate/remove with broad module cleanup in #48. |
| `<mat-card>`, `<mat-card-title>`, `<mat-card-content>`, `<mat-card-actions>` | `MatCardModule` from `@angular/material/card`, exported by `ui-share.module.ts` | Preserve direct Material supplier in #48, subject to version compatibility below. |
| `<mat-divider>` | `MatDividerModule` from `@angular/material/divider`, exported by `ui-share.module.ts` | Preserve direct supplier in #48. |
| `mat-button`, `mat-raised-button`, `mat-stroked-button` | `MatButtonModule` from `@angular/material/button`, exported by `ui-share.module.ts` | Preserve direct supplier in #48. |
| `<mat-radio-group>`, `<mat-radio-button>` | `MatRadioModule` from `@angular/material/radio`, exported by `ui-share.module.ts` | Preserve direct supplier in #48. |
| `<mat-progress-bar>` | `MatProgressBarModule` from `@angular/material/progress-bar`, exported by `ui-share.module.ts` | Preserve direct supplier in #48. |
| `<ngx-gauge>` and its bound gauge inputs | `NgxGaugeModule` from `ngx-gauge`, exported by `ui-share.module.ts`; markers/color from `asrs.helpers.ts` and `asrs.component.ts` | Preserve display behavior via compatible dependency or small local equivalent in #49; copied version is incompatible with locked Angular (below). |
| `latinToPersianNumbers` (question index, score, gauge value) | `LatinToPersianNumbersPipe` declared/exported by `share.module.ts`, implemented in `copied-from-main-repo/src/app/share/latin-to-persian-numbers.pipe.ts` | Replace broad module with small local pipe in #49; verify copied digit string in #68. |
| `<app-asrs>` | Selector declared by `asrs.component.ts`; the feature route mounts that component via `asrs-routing.module.ts` | Mount local component at `/` in #50. |

Other exports of the copied modules, including dialogs, forms/input controls, charts, Nebular components, paginator, review and emotion components, loading overlay, and additional pipes, have no demonstrated ASRS template use. `share.module.ts` also provides `SessionID` (separately injected by the component), which #51 removes. Treat the remaining exports as unrelated scaffolding for #84/#85, subject to extraction verification; do not import either broad module into production.

## Styles, assets, and build inputs

| Source and observed use | Disposition and owner |
| --- | --- |
| `copied-from-main-repo/src/app/user/tests/asrs/asrs.component.scss`: card sizing/spacing, `.main-title`, `.question`, `.options`, `.button-group`, progress spacing, `.result-card`, `.retake-button`, and `::ng-deep ngx-gauge .reading-block` | Preserve relevant visual rules locally in #47/#69. `.snack-success` has no matching element in the ASRS template; investigate/remove in #84. |
| `asrs.component.html`: `.intro-text` has no matching rule in feature SCSS; `.p-1`, `.pt-3`, `.p-lg-3`, `.mt-5` are Bootstrap utility classes, with Bootstrap CSS loaded by copied `angular.json`; inline spacing/color styles also affect results | Investigate whether to retain those utility effects locally in #69; broad Bootstrap dependency is not proven necessary (#85). |
| `copied-from-main-repo/src/styles.scss`: global `body` RTL, `vazir` font, Material typography setup, local `@font-face` URLs for `Vazir.ttf`, `Vazir-Thin.ttf`, `Vazir-Bold.ttf`, `IRANSans.ttf`, `IRANSans_Light.ttf`, and Material Symbols WOFF2 | Preserve needed RTL/typography with local fonts in #67/#69. The named font files exist in `copied-from-main-repo/src/assets/fonts/`; ASRS itself does not reference individual font files. Other Nebular/auth, review, menu, and dialog rules are broader application styling; investigate/remove in #84/#85. |
| `copied-from-main-repo/src/themes.scss`: Nebular theme registration and Vazir font | No direct ASRS component/template use; investigate before carrying, #69/#85. |
| `copied-from-main-repo/angular.json`: build styles load Bootstrap, Material indigo-pink theme, `src/themes.scss`, Font Awesome CSS, and `src/styles.scss`; assets include favicon, entire `src/assets`, and Font Awesome webfonts. Test styles/assets are similar. | Carry only needed styles/assets in #69; remove unrelated inputs in #85. `src/assets/awesome/css/all.css` and `src/assets/awesome/webfonts` are **absent** from the copied tree, despite config and `styles.scss` references. |
| `copied-from-main-repo/src/assets/images/user/asrs.jpg` exists, but no reference occurs in the seven feature files. `copied-from-main-repo/src/index.html` references `favicon.png` and includes an external Google Tag Manager script; neither is an ASRS template dependency. | Investigate image/fav icon need in #69; do not carry external tracking into the offline app (#85). No direct image asset is required by the copied ASRS template. |
| Root `angular.json` currently supplies `src/styles.css` and no assets; root `src/` is an empty Angular shell with no ASRS styling. | Add chosen local inputs in #69; do not assume copied global inputs already work. |

## Package versions and compatibility

These are *installed resolutions recorded by the two package lockfiles*, not a successful compatibility test. Declarations are in each workspace's `package.json`. Root `package.json` does not yet declare forms, router, animations, Material/CDK, or gauge.

| Package/tool | Copied lock | Root lock | Finding and owner |
| --- | --- | --- | --- |
| `@angular/core`, `@angular/common` | 17.3.12 | 17.3.12 | Same resolution; preserve Angular platform, #47/#48. |
| `@angular/forms`, `@angular/router`, `@angular/animations` | 17.3.12 each | absent | Needed forms and possibly route/animation support must be selected for root, #48/#50. |
| `@angular/material`, `@angular/cdk` | 13.3.9 each | absent | Copied Material/CDK lock declares Angular `^13 || ^14` peers, incompatible with locked Angular 17. Select/test compatible local version or equivalent in #48; do not copy resolution blindly. |
| `ngx-gauge` | 11.0.0 | absent | Copied lock declares Angular `^19` peers, incompatible with locked Angular 17; resolve in #49. |
| `typescript` | 5.3.3 | 5.4.5 | Different compiler versions; validate extracted feature against root compiler in #47/#48. |
| `@angular/cli`; `@angular-devkit/build-angular` | 17.2.3; 17.3.17 | 17.3.17; 17.3.17 | CLI differs; keep root tooling unless evidence requires change, #47. |
| `jasmine-core`; `@types/jasmine` | 4.3.0; 4.0.3 | 5.1.2; 5.1.15 | Test API/type major versions differ; use root test setup when adding ASRS tests, #47 onward. |
| `karma`; `karma-chrome-launcher`; `karma-jasmine` | 6.4.4; 3.1.1; 5.1.0 | 6.4.4; 3.2.0; 5.1.0 | Runner mostly aligned; use root test setup, #47 onward. |

The copied `angular.json` names `src/test.ts`, `src/polyfills.ts`, and `karma.conf.js`, none of which are present in `copied-from-main-repo/`. Its build/test configuration is therefore not a proven runnable baseline; use the root shell and its test command in #47 onward.

## Backend and session operations

`copied-from-main-repo/src/app/user/tests/asrs/asrs.component.ts` imports `HttpClient` from `@angular/common/http`, `SessionID` from `copied-from-main-repo/src/app/share/sessionid.service.ts`, and `environment` from `copied-from-main-repo/src/environments/environment.ts`; production replacement is configured in copied `angular.json` and resolves to `src/environments/environment.prod.ts`. Development `apiBaseUrl` is `http://localhost:3000`; production is `/api`. The component's `sessionKey` is `asrs_session_id`, managed through localStorage by `SessionID`.

| Operation in copied component | Observation | Disposition and owner |
| --- | --- | --- |
| `ngOnInit()` / start | `ensureSessionId`, then `HttpClient.post(apiBaseUrl + '/test/asrs?action=enter', {sessionId})` | Remove server/session start in #51; keep form initialization. |
| `submit()` / result | Local score/severity/result functions run, then `sendDataToServer` calls `HttpClient.patch(apiBaseUrl + '/test/asrs?action=calculate-result', {sessionId, severity})` | Remove PATCH/session in #51; preserve local result behavior and later local persistence. |
| `restart()` | `handleSessionIDInRestart` deletes the session key and creates a new ID; `HttpClient.post` calls the enter endpoint again after resetting fields | Remove session deletion/creation and POST in #51; retain/reset local questionnaire state as required by #60. |

## Integrity and availability findings

PowerShell's default display encoding rendered copied Persian text as mojibake, but a UTF-8 byte-level read of `asrs.component.html`, `asrs.constants.ts`, `asrs.helpers.ts`, `latin-to-persian-numbers.pipe.ts`, and `src/index.html` showed intact Persian code points. For example, the pipe's digit string is U+06F0 through U+06F9 in order, and the template title begins with U+062A U+0633 U+062A (Persian "test"). Thus source corruption is **not established**; browser rendering, punctuation, and emoji remain unverified. Visually check questionnaire copy in #65, result copy in #66, RTL/document language in #67, and digit rendering in #68. `src/index.html` declares `lang="en"` while the root element has `dir="rtl"`; #67 should verify final document direction and language.

Asset availability is mixed: the named Vazir/IRANSans/Material Symbols font files and `asrs.jpg` are present under copied assets, while Font Awesome inputs named by copied build/styles are missing. Their necessity and runtime loading remain unverified until #69. No copied reference or active application file was changed for this inventory.
