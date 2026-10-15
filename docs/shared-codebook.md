# Gemeinsames Codebook: Integrationsvertrag

## Windows-Desktop-Word-Abnahme des aktuellen Paketstands

Die [Abnahme vom 15.10.2026](codebook-word-windows-2026-10-15.md) bestätigt
16 synthetische Dokumente mit 32 vollständig gesichteten Seiten in Word LTSC 2024
(Build 16.0.17932.21000, 64 Bit). Alle sieben aktuellen Studio-/Kodierbox-Paare
sind pixelgleich; die unveränderten alten Studio-Referenzen bleiben abgesehen
von vereinbarter Kennzeichnung und dokumentierter 18pt-Korrektur erhalten.
Der geprüfte Tarball ist der nachfolgend bezeichnete aktuelle SOLVER-Paketstand.

## Aktuelle SOLVER-Kompatibilität und Mindestversion

Der [Nachtrag vom 15.10.2026](codebook-solver-compatibility-2026-10-15.md) erhält
Kodierboxs bisherige SOLVER-Ergebnisse mit Engine-Code aus Responses 5.3.1 und
isolierter bisheriger Mathematik. Die Bibliothek verlangt nun den Peer `^5.3.1`
und prüft Chemieformate auch in gespeicherter Kleinschreibung. Aktueller Tarball-
SHA256: `2df79a7b18196d7c25d7e02e15d5b148200d75ba2a315214ccfb8386536dd0a6`.
Frühere Abschnitte und Berichte unten beziehen sich auf damalige Paketstände.

## Vorheriger Responses-Abgleich

Die [Prüfung vom 15.10.2026](codebook-responses-2026-10-15.md) verwendet überall
`@iqb/responses` 5.3.1, die beim Abgleich aktuelle Patchversion der 5.3-Reihe.
Die Bibliothek bezieht Responses als Peer (`^5.3.0`); Schemer, Validierung und
Generator verwenden dieselbe Installation wie der Host. Es gibt keine private
5.2.2-Installation mehr. 1.285 Generator-Tests und 4.694 installierte Exportpaare
bestehen einschließlich der unveränderten Studio-Referenzen. Aktueller Tarball-
SHA256: `9a0e75158dcc70e821c6a481d431ec6a0429e248afb85bd27991b1ae1af22d7a`.
Frühere Berichte unten beziehen sich auf ihre damaligen Paketstände.

## Vorherige Inlinebild-Korrektur

Die [Prüfung vom 15.10.2026](codebook-inline-images-2026-10-15.md) behebt Textverlust bei defekten Inlinebildern. 1.285 Generator-Tests und 4.694 installierte Exportpaare bestehen. Dabei verwendeten beide Anwendungen den Tarball mit SHA256 `1340db41e6493cca3d4395426c14f156319c3bbbf0b81d01f84c233a56a5091a`. Eine neue Word-Abnahme wurde für diesen Paketstand nicht ausgeführt.

## Format- und Aspect-Abnahme vom 13.10.2026

Die [Browser- und Word-Abnahme vom 13.10.2026](codebook-aspect-acceptance-2026-10-13.md) ergänzt die frühere Leerzeichen-Abnahme um bestätigte Formatierungsfixes und den bidirektionalen Formel-Austausch. Damals geprüftes Paket-SHA256: `0e355c3896799ae765cb6e90b00147da0359c56f5fdc90d36b7caf40fbe59ab8`. 1.245 Generator-Tests, 4.654 installierte Exportpaare und 262 tatsächliche Microsoft-Word-Web-Seiten sind geprüft. Die explizite 18pt-Schriftgröße des alten `Farbe`-Referenzfalls wird bewusst korrigiert; alle übrigen alten Dokumentbestandteile bleiben streng verglichen. Angaben zu früheren Paketständen weiter unten sind historische Nachweise.

Studio ist die Referenz für Bedienung und Dokumentlayout. Die drei Einstiegspunkte
`codebook-models`, `codebook-generator` und `codebook-export` trennen Daten,
frameworkfreie Dokumenterstellung und Angular-Oberfläche. Die Bibliothek enthält
keinen Jobvertrag, keine HTTP-Aufrufe und keinen Download-Dienst.

## Anwendungen

Studio lädt Aufgaben und Missingprofile, übergibt die aktive Aufgabe und seine
Speichersperre und verarbeitet `exportRequested` mit seinem direkten API-Aufruf.
Schulungsbedarf ist eine gemeinsame Auswahl und wird in beiden Anwendungen durch
denselben Generator anhand von CODER_TRAINING_REQUIRED gefiltert.
Die Kodierbox ergänzt ihren Jobdefinitionsfilter über `[codebookFilters]` und zeigt ihre
Jobzustände über `[codebookStatus]`. Das sind Projektionsflächen ohne Jobsemantik.
`loading` und `busy` sind allgemeine Sperrzustände. Nur die Kodierbox startet Jobs,
fragt Status ab und lädt Ergebnisse. Beim Schließen endet die Statusabfrage;
der Serverjob wird nicht abgebrochen.

Die Übersetzungen der Oberfläche stehen im Host unter `codebook.*`. Beide Hosts
verwenden dieselben Studio-Beschriftungen und Tooltips. `selectionChanged`,
`exportRequested` und `cancel` sind die einzigen Ausgaben. Der Exportwunsch enthält
Aufgaben-IDs, fachliche Optionen und Missingprofil-ID. Die Profile tragen eine
numerische ID und eine Beschriftung; 0 bedeutet kein Profil.
`showGroupColumn` ist im Studio aktiv, in Kodierbox deaktiviert.
Während `loading` und `busy` ist jede Auswahl gesperrt. Verliert eine Aufgabe ihre
Verfügbarkeit, meldet selectionChanged auch die bereinigte Auswahl zurück.
Variablenbündel bleiben als bestehender Kodierbox-API-Vertrag erhalten, werden
aber im Codebook-Dialog nicht mehr angeboten (Issue #176).

## Bewusste fachliche Korrekturen

* Nur manuell: Variablen mit regulären manuell beschriebenen Codes; nur diese Codes.
* Nur geschlossen: Variablen mit RESIDUAL_AUTO oder INTENDED_INCOMPLETE; alle Codes.
* Beide: Vereinigung dieser Variablengruppen; alle Codes.
* Beide aus: keine Einschränkung nach dieser Kategorie.
* Nur mit Codes wird nach der Codeauswahl ausgewertet.
* Leere HTML-Strukturen, unsichtbare Zeichen und Leerzeichen sind keine Instruktion;
  unterstützte Bilder und Formeln sind eine Instruktion. Allgemeine Instruktionen
  allein machen keinen Code manuell.
* Code 0 und Missing 0 bleiben erhalten. Missing-Codes behalten ihren JSON-Datentyp
  aus dem Profil (Zahl oder Zeichenkette); Kodierbox wandelt Zahlen nicht mehr in
  Zeichenketten um. Leere Exporte liefern `[]` bzw. ein gültiges
  DOCX. Fehlerhafte Schemen melden die betroffene Aufgabe.
* Aufgaben werden nach Schlüssel, Variablen nach Alias/ID sortiert; Codefolge bleibt.
* Schulungsbedarf: alle, nur mit oder nur ohne CODER_TRAINING_REQUIRED; kombiniert
  mit der gemeinsamen Variablen-/Codeauswahl.
* BASE_NO_VALUE bleibt ausgeschlossen; abgeleitete Variablen folgen der Option.
* Itembeziehungen sind explizite `{id, variableId}`-Paare. Der Anwendungsadapter
  normalisiert Quell-IDs auf die im Dokument verwendeten Aliase.
* Die Kennzeichnung lautet IQB Codebook. Studio-Formatierung, Tabellen, Seitenfelder,
  eingebettete Bilder und Formelkonvertierung bleiben erhalten. Klartextinstruktionen
  und Leerzeichen an Formatgrenzen werden nicht mehr verschluckt. Verschachtelte
  Textmarkierungen bleiben kombiniert erhalten. Direkte Listentexte und Klartext
  vor, zwischen und nach HTML-Absätzen werden in Quellreihenfolge übernommen;
  bestehende Absatzinhalte, Bilder und Formeln erscheinen weiterhin genau einmal.

## Paket und Laufzeit

`npm run build_cc` erzeugt Angular-ESM sowie einen zusätzlichen CommonJS-Einstieg
für Server. Der Generator braucht weder Angular noch DOM/Browser-Globals.
Der CommonJS-Build integriert den ausschließlich als ESM gelieferten mathml2omml-
Konverter. Dessen Quellcode bleibt über Source Maps und das npm-Original verfügbar.

Die Regeltextkonvertierung, Schemer und Validierung verwenden den vom Host
bereitgestellten Responses-Peer, aktuell gemeinsam geprüft mit 5.3.1. Kodierboxs
Kodierengine wird ebenfalls auf 5.3.1 aktualisiert. Ihr bestehender Anwendungs-
und Persistenzvertrag mit response-Spezifikation 1.5.1 bleibt erhalten; der interne
Engine-Vertrag stammt direkt aus Responses. Die Bibliothek akzeptiert
response-Spezifikation 1.5.1 sowie 2.x als Peer. Details und Regressionen stehen
im aktuellen Prüfbericht.

## Lokale Integration und Veröffentlichung

Die beiden Integrationen referenzieren dieselbe gepackte Datei unter
`vendor/iqb-ngx-coding-components-4.1.0.tgz`. Das ist ein lokal prüfbarer Release-
Kandidat, noch keine veröffentlichte npm-Version. Zum Release wird genau der
abgenommene Bibliotheksstand veröffentlicht; danach werden die Host-Abhängigkeiten
auf die Registry-Version umgestellt und Locks neu geprüft. Die lokalen Tarballs
können dann entfernt werden. Beide Anwendungen gemeinsam abnehmen und ausrollen.
Rollback: vorherige Bibliotheks-/Anwendungsversion; keine Datenmigration.

## Prüfungen

* `npm run test:codebook`: Node-Vertragstests für alle Filterkombinationen, Daten,
  JSON, DOCX-Struktur, Bilder, Formeln, Itembeziehungen und CJS/ESM-Gleichheit.
* `npm run test:cc`: Angular-Tests einschließlich Auswahl/Suche/Sperrzustände.
* Beide Hosts testen ihre echten Adapter und bestehenden Formelregressionen.
* Die künstlichen Fälle in `scripts/fixtures/codebook-synthetic.mjs` enthalten keine
  Aufgabeninhalte aus den Beispiel-ZIPs. Die Matrix durchläuft alle 256 Kombinationen
  der acht Ja/Nein-Optionen, drei Schulungsfilter, drei Missing-Konstellationen und
  beide Formate: 4.608 Exporte. Alle neun Quelltypen werden in der Datenauswahl geprüft.
* 32 zusätzliche Referenzfälle vergleichen Rohschema → JSON und sämtliche relevanten
  DOCX-Bestandteile mit dem ursprünglichen Studio. Die Referenz wird ausschließlich
  aus dem dokumentierten alten Studio-Commit erzeugt, niemals aus dem neuen Generator.
* Weitere 20 Studio-Referenzfälle erhalten NBSP, schmale geschützte Leerzeichen und
  wiederholte Abstände in allgemeinen und Code-Instruktionen, jeweils mit und ohne
  Score-Spalte. HTML-Zeichenreferenzen, Unicode und fett formatierter Text werden
  über ESM und CommonJS auf exakte Inhalte und alle DOCX-Bestandteile geprüft.
* `node scripts/compare-codebook-installations.mjs STUDIO_ROOT BOX_ROOT OUTPUT_DIR`
  prüft dieselbe Matrix über Studios DownloadWorkspacesClass und Kodierboxs echten
  Generation-Service samt Adapter mit Datenquellen im jeweiligen Anwendungsformat.
  Nur Datenbank-/Profilzugriffe werden im Speicher bereitgestellt. Der Vergleich
  schließt Bilder, Beziehungen, Styles, Fußzeilen und Missing-Datentypen ein.
  Zusätzlich laufen die 20 Abstandsreferenzen in beiden Formaten gegen das alte
  Studio; zusammen werden 4.654 Exportpaare verglichen.
  Das ist ausdrücklich kein HTTP-, Browser-, Berechtigungs- oder Redis-End-to-End-Test.
* Studio-Frontend prüft direkten Export, Ladezustände, Fehlermeldung und Speichersperre.
* Kodierbox prüft Scope-Filter, wiederholte Starts, langsame Statusabfragen und Schließen.
* Frontend- und Backend-Prüfungen auf dem Entwicklungsrechner nacheinander ausführen.
* Vor Ausrollen bleiben visuelle Mehrseiten-DOCX-Abnahme und Host-Browserabläufe
  einschließlich Netzwerkprüfung verpflichtend.

### Microsoft Office

Microsoft Office Web Viewer / Word hat am 13.10.2026 sieben ausschließlich
synthetische Dokumente mit insgesamt 20 Seiten gerendert. Die Host-Browser-
Downloads sind auf allen drei vollständigen Seiten pixelgleich. Die alten und
neuen Studio-Rich-Text-Dokumente sind mit/ohne Scores in ihren sechs
Seiteninhalten pixelgleich; die vereinbarte Fußzeile wird separat geprüft.
Details und Grenzen: [Abnahmeprotokoll](./codebook-acceptance-2026-10-13.md).

XML-Gleichheit und LibreOffice-Rendering allein ersetzen keinen Office-Nachweis.
Für einen zusätzlichen Windows-Desktop-Word-Abnahmeweg legt der
Installationsvergleich künstliche Exporte
14 DOCX-Dateien und `word-expectations.json` im Ausgabeverzeichnis ab: je Anwendung
einen Filter-/Missing-0-Fall, Rich-Text-Fälle mit und ohne Score-Spalte sowie
vier Inlinebild-Fälle mit defekten und nachfolgenden gültigen Inhalten. Die
Rich-Text-Fälle werden zusätzlich direkt gegen die alte Studio-Referenz geprüft.
Auf einem Windows-Rechner mit Desktop-Word:

```powershell
./scripts/verify-codebook-word-windows.ps1 -Directory C:\Codebook-Pruefung
```

Das Skript öffnet alle Dateien regulär und schreibgeschützt, aktualisiert Felder,
prüft Textgleichheit, Seitenzahl, Tabellen, ungeteilte Zeilen, Bilder, Formeln und
Fußzeilen und exportiert 14 PDFs (mit optionalen alten Referenzen 16). Es speichert Word-Version und Build im Ergebnis.
Anschließend alle gerenderten Dokumente vollständig visuell prüfen: insbesondere
Spaltenbreiten, Umbrüche, Formeln, Bilder, Schriften und „Seite X von Y“.
`visualAcceptanceComplete` bleibt bis zur tatsächlichen visuellen Abnahme false.
Die [tatsächliche Windows-Abnahme](codebook-word-windows-2026-10-15.md) enthält
auch die beiden alten Studio-Referenzen und einen vollständigen Wiederholungslauf.
Eine nicht ausgeführte Windows-Prüfung darf nicht als bestanden gemeldet werden.

### Editor-/Player-Abgleich und Formatkombinationen

Die Instruktionen des coding-components-Editors sind der Eingabevertrag des
Codebook-Exports. Die Extension-Liste wurde mit Aspect Editor/Player bei
`iqb-berlin/verona-modules-aspect@fb3f5982` abgeglichen. Der Export liest
Kodierschemata (`manualInstruction`), nicht die vollständige Aspect-Aufgabe mit
interaktiven Player-Elementen.

`codebook-editor-matrix.test.mjs` prüft alle 384 Kombinationen aus vier
Textmarkierungen (Fett, Kursiv, Unterstrichen, Durchgestrichen), drei gültigen
Grundlinienzuständen, zwei Verschachtelungsreihenfolgen und vier Ausrichtungen.
Jeder Fall prüft allgemeine und Code-Instruktion, geschützte und wiederholte
Leerzeichen, Formatierungsgrenzen sowie identische ESM-/CommonJS-Dokumentteile.
Diese Matrix ergänzt die 52 unabhängigen Alt-Studio-Referenzfälle.

`node scripts/create-codebook-editor-office-fixture.mjs` erzeugt ein ausschließlich
synthetisches Dokument mit allen 48 Markierungskombinationen sowie gemischten
Formel-, Listen- und Bildfällen zur visuellen Office-Abnahme.

Grenzen des bestehenden Studio-Renderers bleiben sichtbar: CSS-Listenstile,
verschachtelte Listeneinrückungen, Bild-Floats und pro Textlauf wechselnde
Farbe/Schriftgröße werden nicht vollständig wie im Browser abgebildet. Der
Abgleich behauptet deshalb keine vollständige HTML-/CSS-Layouttreue.
Aspect-spezifische Formelknoten (`aspect-nodeview-math-formula[formula]`) und
interaktive Cloze-Knoten sind ein anderer Vertrag als
`span.iqb-math-formula[data-latex]` bzw. `[[iqb-math:…]]` in Kodierinstruktionen.
Der Aspect-Player rendert seine gespeicherten Formeln über
`projects/common/utils/math-formula-markup.ts`; der Codebook-Export nutzt OMML.
Ein vollständiger Aspect-Editor-/Player-Lauf ist damit nicht durch diese
Codebook-Matrix ersetzt.
