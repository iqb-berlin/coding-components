# Codebook: Korrekturen zur Testrückmeldung vom 17.10.2026

Die Prüfung und Korrektur basieren auf dem Quellstand von PR #251 nach der
Übernahme von #252 (`a5db665`). Es gibt keine Versionsanhebung, kein neues
Alpha-Paket und keine Veröffentlichung. Frühere Release-Artefakte bleiben
unverändert und enthalten diese Korrekturen noch nicht.

## Korrigierte Punkte

- Die Auswahlspalte lässt Platz für Material-Zellabstände und die vollständige
  Checkbox. Der geometrische Render-Test prüft Kopf- und Datenzelle; er schlug
  vorher wegen des abgeschnittenen Bedienelements fehl.
- Absätze mit dem vom Editor serialisierten `padding-left: 0px` beziehungsweise
  `0pt` behalten denselben Grundabstand wie Absätze ohne diese Angabe. Positive
  Einzüge, hängende Einzüge und Listeneinzüge bleiben erhalten. Vier neue Fälle
  prüfen gemischte Text-/Formelabsätze mit und ohne Bewertungsspalte.
- Die Bibliotheksübersetzungen enthalten jetzt auch die `codebook.*`-Texte.
  Alle 41 im Dialog verwendeten Schlüssel sind auflösbar. Ein Render-Test prüft
  deutsche Beschriftungen, interpolierte Auswahlanzahl und Speicherhinweis mit
  dem Bibliotheks-Loader allein. Die Anwendung benötigt keine Textkopie aus
  Studio und kann weiterhin bewusst eigene Begriffe überschreiben.

Die unabhängige alte Studio-Referenz stammt aus
`2504265721a59c7c65425072951ce82ab16f0fb8`. Ein synthetischer Vergleich mit
diesem Generator und dem tatsächlich in Studio eingecheckten Paket
`4.1.0-alpha.1` bestätigt: Der alte Export und der korrigierte Generator setzen
beide unindentiere Absätze auf 100 Twips. Das bisherige Alpha-Paket setzte den
expliziten Null-Einzug auf 0 und verursachte damit den Versatz. Die unveränderten
Referenzdateien wurden nicht neu erzeugt.

## Lokale Prüfung

- 575 Bibliotheks- und 6 Schemer-Tests mit Coverage erfolgreich.
- 1.291 Codebook-Generator-/Vertragstests erfolgreich.
- Bibliotheksbuild erfolgreich; Lint ohne Fehler bei 19 verbleibenden Warnungen.
- Chrome-Prüfung der gebauten Codebook-Komponente mit Studio-Material-Theme bei
  320, 390 und 1350 px: vollständige Checkboxen, Auswahl aller Aufgaben trotz
  Suchfilter, Exportsperre ohne Auswahl und deutsche Texte erfolgreich.
- Die letzte Browserprüfung lädt ausschließlich die Bibliotheksübersetzungen,
  keine Studio-Übersetzungsdatei. Es treten keine JavaScript-Laufzeitfehler auf.

## Studio-Einbindung und offene Rückmeldung

Studio PR #1728 verweist weiterhin auf den eingecheckten Tarball
`vendor/iqb-ngx-coding-components-4.1.0-alpha.1.tgz`; dessen SHA-256 ist
`cb85078662e8fe4490aa90001e369db059571da73ec73a1457a7ffb89d49f296`.
`npm ci` installiert diesen Stand ohne separate manuelle Paketinstallation.
Quelländerungen in coding-components aktualisieren diesen Tarball nicht.
Für einen erneuten vollständigen Studio-Test muss der korrigierte
Bibliotheksbuild ausdrücklich übernommen werden.

Studio lädt den Kodierreiter über ein separates Schemer-HTML im iframe.
Die Version dieses HTMLs ist für die gemeldeten Screenshots unbekannt. Die
vorherige Chrome-Prüfung zeigte korrekt beschriftete Hinzufügen-/Umbenennen-
Dialoge mit veröffentlichtem alpha.2 und dem Quellstand aus #252. Mit alpha.1
reproduzierte sich der bekannte Fehler fehlender sichtbarer Basisvariablen.
Die konkrete Ursache der abgebildeten leeren Dialoge bleibt deshalb offen.

Die DOCX-Prüfung belegt die Absatz-/Formelstruktur im erzeugten Dokument. Sie
ersetzt keine erneute Abnahme des Originalfalls in Microsoft Word. Ein
Produktiv-Deployment sowie eine neue Firefox-/Safari-Abnahme sind nicht belegt;
die entfernte CI ist separat am aktuellen PR-Head zu prüfen.
