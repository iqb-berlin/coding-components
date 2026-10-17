# Responses ESM und vollständige Zoneless-Umstellung

Prüfstand vom 16.10.2026. Die Quelländerungen enthalten keine Versionsanhebung
und keine Release-Dateien. Die bestehenden Versionsfelder bleiben unverändert.

## Größe und getrennte Lieferwege

| Prüfstand | HTML-Größe |
| --- | ---: |
| Veröffentlichtes Schemer 2.9.0-alpha.2 als Vergleich | 4.845.727 B |
| Dieser Zweig mit WOFF2, vollständiger Zoneless-Umstellung und Responses 5.3.1 aus npm | **4.270.157 B** |
| Vorheriger lokaler Integrationsversuch mit zusätzlichem Responses-ESM-Build | 3.846.981 B |

Der aktuelle Zweig spart **575.570 B / 11,88 %**. Für die lokale HTML-Prüfung
wird ausschließlich eine temporäre Testdatei mit der Metadatenversion `0.0.0`
erzeugt. Sie ist kein Release-Artefakt und wird nicht eingecheckt.

Der ESM-Einstieg ist separat in [Responses PR #138](https://github.com/iqb-berlin/responses/pull/138)
implementiert. Der frühere Integrationsversuch erreichte insgesamt 20,61 %
Ersparnis gegenüber dem veröffentlichten Vergleichsstand. Dieser Wert ist ein
zusätzliches Messergebnis und beschreibt nicht den normalen Build dieses Zweigs.
Er enthält auch den aktuellen Responses-Quellstand auf Basis von `565e7df`.
Im damaligen Vergleich bei noch aktiver Zone sparte der ESM-Schritt 388.880 B.

coding-components installiert weiterhin das veröffentlichte Responses 5.3.1.
Ein Wechsel auf die neue ESM-Ausgabe benötigt deren spätere reguläre Freigabe
und eine anschließende Aktualisierung der Abhängigkeit. Es werden weder ein
vorläufiges Responses-Paket noch eine zusätzliche Alpha-Version vorausgesetzt.

## Responses: zusätzliche Modulform ohne eingeschränkten Solver

Die beiden Ausgaben werden aus denselben TypeScript-Engine-Quellen erzeugt.
`require` und klassische Unterpfade verwenden weiterhin die bisherigen
CommonJS-Dateien im Paketwurzelverzeichnis. `import` verwendet native ESM-Dateien
unter `esm/`. Die Ausgabe ergänzt explizite `.js`-Dateiendungen auch in den
Deklarationen, sodass NodeNext und Browser-Bundler ohne Sonderauflösung arbeiten.
Relative Verzeichnis-Einstiege wie `presentation` bleiben nutzbar.

Das ESM-Solver-Modul importiert `evaluate` aus dem vollständigen mathjs.
Funktionen, Konfiguration und Toleranzen bleiben erhalten. Die kleinere Ausgabe
`mathjs/number` wurde anhand von Gegenbeispielen verworfen: Schon
`sum([1,2,3])` und `abs(complex(3,4))` liefern damit nicht mehr dieselben gültigen
numerischen Ergebnisse. Der Ansatz entspricht der dokumentierten
[ESM-Bündelung von mathjs](https://mathjs.org/docs/custom_bundling.html).

Der Repository-Build von Responses basiert auf upstream `565e7df`; die ESM-Arbeit
ändert keine Dateien unter `src/`. Die ursprüngliche Responses-Unit-Suite
besteht mit ihrem gesperrten mathjs 15.1.0. Die frischen Consumer und der Schemer
verwenden mathjs 15.2.0, entsprechend dem bisherigen Schemer-Lockfile.

Die Paketprüfung installiert einen echten Tarball und zusätzlich das
veröffentlichte Responses 5.3.1 unter einem reinen Testalias. Sie prüft:

- ESM/CommonJS, öffentliche Exporte, Datei- und Verzeichnis-Unterpfade;
- TypeScript mit klassischer Node-Auflösung, NodeNext für ESM/CommonJS und Bundler;
- **234 Ableitungen** in beiden Modulformen und gegen veröffentlichtes 5.3.1:
  108 Ergebnisse `VALUE_CHANGED`, 65 `INVALID`, 61 `DERIVE_ERROR`;
- ausdrücklich erwartete Summen, komplexe Zwischenwerte, Einheiten und BigNumber;
- **75 bestehende Kodier-Golden-Fälle**, einschließlich Textdarstellung und
  unveränderter erwarteter Kodierergebnisse.

Diese Paketprüfungen bestehen auf **Node 18.20.8 und Node 22.23.1**. Die
unveränderte Engine-Suite besteht mit **366 Tests** und Coverage-Grenzen.

**Korrektur zur früheren Probe:** In den ursprünglichen 180 synthetischen
Ableitungen fehlte `sourceParameters.processing`. Dadurch verglich diese Probe
zunächst nur dieselben Fehlerpfade. Der reproduzierbare Analyseskript setzt das
Pflichtfeld jetzt und verlangt ausdrücklich erfolgreiche Auswertungen und
Fehlerfälle. Der korrigierte Lauf hat 69 `VALUE_CHANGED`, 50 `INVALID` und
61 `DERIVE_ERROR`. Die oben genannte neue Paketprüfung umfasst darüber hinaus
konkrete erwartete Werte und den unabhängigen veröffentlichten Vergleich.

Der zusätzliche Paketbuild und die Paketprüfungen liegen im Responses-PR.
Der ungenutzte direkte mathjs-12-Peer der Komponentenbibliothek ist entfernt;
Responses verwaltet seine mathjs-Abhängigkeit selbst.

## Zone.js: entfernte Anforderungen und geprüfte Aktualisierungswege

Beide App-Einstiegspunkte verwenden ausdrücklich `provideZonelessChangeDetection()`.
Zone.js-Imports, Polyfills für Build und Test, das ungenutzte Polyfills-Quellmodul,
direkte Abhängigkeit, installierter Lockfile-Paketeintrag und Bibliotheks-Peer
sind entfernt. Der HTML-Wrapper erwartet keine entfernte `polyfills.js` mehr.
Die Test-Initialisierung verwendet `BrowserTestingModule`/`platformBrowserTesting`.
Die drei `fakeAsync`-Fälle warten jetzt auf echte Observable- oder Timer-Ergebnisse.

| Bereich | Aktualisierungsweg und Nachweis |
| --- | --- |
| Studio/Verona-Start und spätere Host-Nachrichten | Variablen, Schema und Rolle im Wrapper sind Signals, die das Template liest. Native Nachrichten erscheinen ohne vorbereitenden Klick. Leere Listen entfernen die alte Ansicht. |
| Rollenwechsel | Eine ausdrückliche neue Rolle `super` hebt einen vorherigen Gastmodus auf. Eine Nachricht ohne neue Rolle erhält dagegen die bestehende Berechtigung. Beide Fälle laufen im Browser. |
| Schemer-Listen, Import, Dialogrückgaben, 300-ms-Debounce | `markForCheck()` an den asynchronen Grenzen und der zentralen Listenaktualisierung; bestehender `AsyncPipe` für die Auswahl bleibt erhalten. |
| Variablen-/Code-Editor und 500-ms-Debounce | Eigene Benachrichtigung nach verzögerten Änderungen sowie nach Bestätigung/Abbruch der Material-Dialoge. |
| Quell-, Array-/Fragment- und Verarbeitungsdialoge | Material-/Formularereignisse bleiben gebunden; Rückgaben benachrichtigen die zuständige Ansicht. Gültige Position 0 und leere Anweisungen bleiben zulässig. |
| Dateilisten und Antwortschema aus FileReader | Menü-Ausgaben benachrichtigen ihre gebundenen Besitzer; native Dateiimporte ersetzen die sichtbare Liste in Schemer und Demo. |
| Rich Text, Bild und Formel | Explizite Benachrichtigung nach Bildimport und Dialogrückgabe. Die vorhandene Tiptap-Direktive benachrichtigt bereits bei Inhalts-/Auswahländerungen. Native Auswahl aktualisiert die Format-Schaltfläche im echten Custom Element. |
| Verzögerte Variablenauswahl | Der 500-ms-Rückruf meldet die Änderung an Angular. Bestätigung wird ohne nachträglichen Klick oder erzwungene Test-Aktualisierung aktiv. |
| Solver-Cursor | Der verzögerte Rückruf verändert nur Fokus und DOM-Auswahl; die davor geänderten Formulardaten werden durch den gebundenen Menü-Listener gemeldet. |
| Codebook-Oberfläche | Eingaben über Angular-Inputs/`ngOnChanges`, gebundene Ereignisse und Material-Datenquelle; keine eigene native asynchrone Zustandsquelle. |
| Datei-/Verona-Dienste | Sie liefern Promise-/Observable-Ergebnisse. Die benutzenden Ansichten übernehmen die Benachrichtigung; der Nachrichtendienst behält den bestehenden Verona-Vertrag. |

Die Umstellung folgt den [Zoneless-Anforderungen von Angular](https://angular.dev/guide/zoneless):
Signals, `markForCheck()`, gebundene Ereignisse und `setInput()` melden Änderungen.
Die neuen Render-Tests verwenden `whenStable()` und erzwingen keine
`detectChanges()`-Aufrufe, um fehlende Benachrichtigungen nicht zu verdecken.

Im Lockfile bleiben ausschließlich Angulars **optionale Peer-Metadaten** zu
Zone.js stehen. Sie stammen aus dem Angular-Paket; es gibt keinen installierten
Zone.js-Paketeintrag. Ein frisches `npm ci`, die frische Bibliotheksinstallation,
die Bundle-Eingaben und die Browserprüfung bestätigen die tatsächliche Abwesenheit.

## Erfolgreiche lokale Prüfung

| Prüfung | Ergebnis |
| --- | --- |
| Responses | 366 Unit-Tests; frische Tarball-Consumer auf Node 18 und 22 einschließlich veröffentlichtem 5.3.1-Vergleich |
| Bibliothek | **573 Tests** mit Coverage, einschließlich drei zusätzlicher echter Zoneless-Renderfälle |
| Standalone-Schemer | **6 Tests** mit Coverage |
| Codebook-Generator und Verträge | **1.287 Tests** bestanden |
| Entwicklungsbuild | **21 Browserfälle**, einschließlich 320–1440 px und Container-Resizing |
| Temporäres HTML mit veröffentlichtem Responses 5.3.1 | **14 iframe-Fälle**, einschließlich der Originalvariablen aus dem lokalen Studio-Export und sechs Solver-Fällen |
| Native Demo/Elements, vorheriger Integrationsversuch | Kein `window.Zone`, alle elf Tags registriert; 20 Anfangsvariablen, Dateiimport, Format-Schaltfläche nach nativer Auswahl und Editor-Ausgabe geprüft; keine Laufzeitfehler |
| Builds | Bibliothek mit allen Einstiegspunkten, eigenständiger Schemer samt Verpackung und Demo/Elements erfolgreich |
| Weitere Gates | Lint ohne Fehler bei 20 bestehenden Warnungen; Schema- und Ajv-Prüfungen bestanden |
| Audit des vorherigen Integrationsversuchs | Repository und Consumer ohne hohe/kritische Befunde; ein niedriger KaTeX-Befund, beim Consumer zusätzlich ein moderater Tiptap-Befund. |

Die Browserläufe nutzen das installierte Chrome. `PLAYWRIGHT_CHANNEL=chrome`
wählt es im Repository aus; ohne diese Option bleibt der normale Chromium-Pfad
der CI erhalten. Beispiel für eine temporäre HTML-Testdatei:

```sh
PLAYWRIGHT_CHANNEL=chrome \
SCHEMER_ARTIFACT=/tmp/schemer-zoneless-test.html \
npm run test:schemer:responsive
```

## Grenzen und Auslieferungsstand

Die lokalen Prüfungen belegen keinen Merge, keine Registry-Veröffentlichung und
kein Deployment auf iqb-studio.de. Die entfernte CI ist gesondert an den PRs
zu prüfen. Der reale Studio-Vertrag wird lokal als iframe mit
Start-/Änderungsnachrichten geprüft; die produktive Aufgabe benötigt eine Anmeldung.
Die externen Studio-/Kodierbox-Anwendungen wurden nicht geändert.

Die .NET-Quellen in Responses wurden nicht verändert. Ihre Suite wurde mangels
lokalem .NET-SDK nicht erneut ausgeführt. Microsoft Word, Safari und Firefox
wurden für diesen Stand ebenfalls nicht erneut abgenommen. Die früheren
Host-/Word-Nachweise gelten weiterhin nur für ihre bezeichneten Artefakte.

Codebook bleibt im Bibliothekspaket enthalten. Ein zusätzlicher Codebook-Dialog
im Schemer und die neue Partial-Credit-Erweiterung für leere Teilantworten sind
weiterhin nicht Bestandteil dieser Änderungen.
