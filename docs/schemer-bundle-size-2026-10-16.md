# Schemer: Dateigröße und mathjs-Prüfung vom 16.10.2026

**Späterer Stand:** Dieser Bericht beschreibt die damalige Teilstufe. Die vollständige
Responses-ESM-/Zoneless-Umstellung ist in
[responses-esm-zoneless-2026-10-16.md](responses-esm-zoneless-2026-10-16.md)
dokumentiert.

## Umgesetzte Optimierung

Verglichen wird das unveränderte veröffentlichte `Schemer_v2.9.0-alpha.2`
(`7ce5cacb41a2e545160fabaa3bb28331933c208c`) mit demselben Produktionsbuild nach
zwei Änderungen: NunitoSans als WOFF2 und Zone.js ausschließlich über die
Angular-Polyfills. `provideZoneChangeDetection()` bleibt aktiv, damit unter
Angular 21 die Studio-Startnachricht und verzögerte Rückgaben sichtbar werden.

| Messung | Vorher | Nachher | Einsparung |
| --- | ---: | ---: | ---: |
| Gepacktes, eigenständiges HTML | 4.845.727 B | 4.327.681 B | **518.046 B / 10,69 %** |
| Hauptskript | 3.777.295 B | 3.741.547 B | 35.748 B |
| Eingebetteter Nunito-CSS-Block einschließlich Base64 | 759.244 B | 276.946 B | 482.298 B |
| Schriftdatei vor Base64 | 569.372 B | 207.636 B | 361.736 B |
| Gesamtes HTML mit gzip, rein lokale Vergleichsmessung | 1.431.181 B | 1.309.675 B | 121.506 B |

Die Schrift bleibt vollständig: 1.100 Glyphen, 939 Unicode-Zuordnungen,
identische Konturen und Metriken sowie unveränderte Achsen `wght`, `wdth`,
`opsz`, `YTLC`. Es wurde kein Zeichensatz oder Schriftstil entfernt. Die
TTF-Quelldatei bleibt im Demo unter `src/assets/fonts/` erhalten; die redundante
Schemer-Kopie wurde durch WOFF2 ersetzt. Ihre SHA-256 vor der Konvertierung:
`585d07756a7f5cca34de3e622a23f5e98d60efc96ac9c9e7c6bc251fea040854`.

Erzeugung mit Python, fontTools 4.67.0 und Brotli 1.2.0:

```python
from fontTools.ttLib import TTFont

font = TTFont('src/assets/fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',
              recalcTimestamp=False)
font.flavor = 'woff2'
font.save('projects/schemer/src/assets/fonts/'
          'NunitoSans-VariableFont_YTLC,opsz,wdth,wght.woff2')
```

## Lokale Prüfung

- Produktionsbuild mit `--stats-json` und vollständige HTML-Verpackung erfolgreich.
  Der Build enthält Zone.js nur noch in `polyfills.js`, ohne zweite Kopie in `main.js`.
- Sechs Schemer-Unit-Tests mit Coverage bestanden; Projekt-Lint ohne Fehler,
  weiterhin 20 bestehende Warnungen.
- 15 Browserfälle am Entwicklungsbuild und acht iframe-Fälle am gepackten HTML
  bestanden, einschließlich der Originalvariablen aus dem bereitgestellten
  Studio-Export. Studio-Start, spätere Nachrichten, verzögerte Rückgabe,
  Rich Text mit Bild/Formel und Dialogabbrüche funktionieren.
- Zusätzlicher A/B-Browservergleich im frischen Chrome-Kontext: beide
  Schriftdateien tatsächlich geladen; identische Textbreiten bei Gewicht
  200/400/700/1000 für `ÄÖÜäöüß Größe 0123456789`. Die Screenshots der
  eingebetteten Schemer-Oberfläche sind bytegleich.

Die Version wurde nicht angehoben. Das optimierte HTML ist ein lokaler
Prüfstand; das veröffentlichte alpha.2-Artefakt wurde nicht ersetzt.

## mathjs: gemessene Optionen

Installiert sind Responses 5.3.1 und mathjs 15.2.0. Der Browser erreicht mathjs
über `@iqb/responses/derive/derive-value.js`, das `require('mathjs')` verwendet
und daraus ausschließlich `evaluate` aufruft. Der CommonJS-Einstieg bindet
zahlreiche weitere Exporte ein. Die normale ESM-Ausgabe stellt weiterhin die
volle Ausdruckssprache zur Verfügung und lässt sich besser optimieren.

Die isolierten Messungen verwenden denselben esbuild 0.28.1 mit `bundle`,
`minify`, Browserplattform, ESM-Ausgabe und Ziel ES2022. Sie messen keine bereits
umgesetzte Ersparnis im vollständigen Angular-HTML:

| Isolierter Probe-Build | Größe |
| --- | ---: |
| mathjs, bisheriger CommonJS-Zugriff | 1.075.263 B |
| mathjs, ESM-Import von `evaluate` mit vollem Funktionsumfang | 669.432 B |
| mathjs/number | 377.727 B |
| Responses einschließlich bisherigem mathjs-Import | 1.132.292 B |
| Responses mit ausschließlich für den Versuch auf ESM umgeleitetem Math-Import | 747.973 B |

Im Responses-Versuch spart ESM **384.319 B / 33,94 %**. Die 35 direkten
Ausdrucksfälle liefern gleiche Ergebnisse und Fehler für CommonJS und ESM.
Die ursprüngliche Probe der 180 Ableitungen enthielt kein
`sourceParameters.processing` und verglich deshalb nur Fehlerpfade. Der
inzwischen korrigierte Analyseskript setzt das Pflichtfeld und verlangt
ausdrücklich sowohl erfolgreiche Ableitungen als auch Fehlerfälle. Geprüft werden Rechenfunktionen,
sehr kleine Zahlen, Rundung, bedingte Ausdrücke, Arrays, komplexe Zwischenwerte,
BigNumber/Brüche, Einheiten, Syntaxfehler, leere/nichtnumerische Quellwerte und
drei Antwortstatus. Dies ist eine gezielte Stichprobe, keine vollständige
Kompatibilitätsfreigabe einer neuen Responses-Ausgabe.

`mathjs/number` ist kein kompatibler Ersatz: Beispielsweise liefern
`sum([1,2,3])`, `mean([1,2,3])` und `abs(complex(3,4))` mit dem vollständigen
mathjs gültige numerische Ergebnisse, mit der reduzierten Ausgabe Fehler.
Auch bei ausschließlich numerischen SOLVER-Endergebnissen werden diese
Funktionen benötigt.

Reproduktion ohne Änderung installierter Pakete oder Produktionskonfiguration:

```sh
node scripts/analyze-mathjs-bundle.mjs
```

Der nächste saubere Schritt ist ein zusätzlicher ESM-Einstieg in Responses mit
ESM-Import von mathjs, bei weiter verfügbarem CommonJS-Einstieg für Node-Hosts.
Dazu gehören die dortigen Engine-Tests und ein erneuter Vergleich des gesamten
Schemer-Bundles. Die Math-Instanz, Toleranzen und unterstützten Funktionen
sollten dabei erhalten bleiben. Eine alleinige Importänderung in Schemer
behebt den `require` innerhalb des veröffentlichten Responses-Pakets nicht.
Der Produktionsimport bleibt in dieser Optimierung unverändert.
