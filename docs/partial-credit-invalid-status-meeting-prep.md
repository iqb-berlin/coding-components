# Meeting Prep: INVALID-Status vs. Partial Credit (max. 60 min)

## Grobe Intro (für alle im Termin)

Ziel des Termins: Wir wollen klären, warum Fälle mit teilweise beantworteten Teilangaben aktuell auf `INVALID` landen und dadurch für Partial-Credit/IEA-Prozesse verloren gehen können – und wie wir das fachlich/technisch sauber lösen.

Kurz in einem Satz:
- **Problem:** Gemischte Teilstatus (z. B. `CODING_COMPLETE` + `DISPLAYED`) führen bei Ableitungen teils zu `INVALID`.
- **Auswirkung:** Partial-Credit-Fälle werden nicht als `CODING_INCOMPLETE` behandelt und können aus nachgelagerten Kodierwegen fallen.
- **Entscheidung im Termin:** Wann ist `INVALID` korrekt, wann muss stattdessen `CODING_INCOMPLETE` gesetzt werden?

---

## 1) Was wir im `coding-components` Repo verifiziert haben

1. Die UI/Prüf-Komponente (`SchemeChecker`) ruft für die eigentliche Kodierung nur `CodingSchemeFactory.code(...)` auf.
2. `SchemeChecker` setzt beim Aufruf lediglich Input-Status:
   - befüllt -> `VALUE_CHANGED`
   - leer bei BASE-Variable -> `DISPLAYED`
3. Damit liegt die entscheidende Status-Logik für Ableitungen **nicht** im UI-Repo, sondern in `@iqb/responses`.

---

## 2) Integration von `@iqb/responses` in die Analyse (entscheidend)

### 2.1 Woher kommt `INVALID` bei gemischten Quellen?
Im Paket `@iqb/responses` (hier installiert als `5.1.0`) wird die Ableitungslogik in `derive/derive-value.js` gesteuert.

Dort gibt es eine Status-Priorisierung für Source-Responses. Relevanter Punkt:
- Wenn **mindestens eine** Quellvariable `INVALID` ist, wird die Ziel-Ableitung auf `INVALID` gesetzt.

### 2.2 Wo kann `INVALID` vorher entstehen?
In `normalize/response-status.js` markiert `markEmptyValuesInvalidForBaseUnlessAllowed(...)` leere Werte (unter Bedingungen) auf BASE-Ebene als `INVALID`.

Konsequenz:
- Wenn ein Teilfeld leer/gelöscht in diesen Pfad fällt, kann schon auf BASE-Ebene `INVALID` entstehen.
- Bei der anschließenden Ableitung propagiert das in der Regel als `INVALID` weiter.

### 2.3 Warum das für Partial Credit kritisch ist
Für Fälle wie „2 von 3 Teilangaben kodierbar“ ist fachlich häufig eher `CODING_INCOMPLETE` sinnvoll.
Wenn aber früh `INVALID` gesetzt und dann strikt durchgereicht wird, wird der Fall nicht als „noch kodierbar“ behandelt.

---

## 3) Präzise Problemformulierung für den Termin

> Bei Aufgaben mit Teilangaben (z. B. 01a/01b/01c) führt eine gemischte Ausgangslage (ein Teil `DISPLAYED`/leer, andere `CODING_COMPLETE`) aktuell zu `INVALID` auf der abgeleiteten Variable (01) und ggf. auch auf `01_partial_credit`. Dadurch werden diese Fälle nicht als unvollständig (`CODING_INCOMPLETE`) behandelt und laufen potenziell nicht in die gewünschte IEA-Kodierung.

---

## 4) Fachliche Zielentscheidung (Sollbild)

Empfohlene Leitlinie:
- `INVALID` nur für echte Ungültigkeit/Regelverletzung.
- `CODING_INCOMPLETE` für teilweise beantwortete, prinzipiell kodierbare Fälle.
- Für `_partial_credit` ggf. explizite Sonderregel, falls fachlich gewünscht.

---

## 5) Konkrete Entscheidungsfragen

1. **Semantik:** Welche Zustände sollen zwingend `INVALID` bleiben?
2. **Partial-Credit-Policy:** Soll bei Mischfällen standardmäßig `CODING_INCOMPLETE` gelten?
3. **Einzigartigkeit (MZB090/MZB033):** Ist Verstoß gegen Uniqueness ein `INVALID`-Grund oder zunächst `CODING_INCOMPLETE`?
4. **Technik-Ort:** Anpassung in `@iqb/responses` (Derive/Normalize) oder ergänzendes Mapping nachgelagert?
5. **Downstream:** Welche Pipeline-Regel schließt heute `INVALID` von IEA-Übergabe aus?

---

## 6) 60-Minuten-Agenda (umsetzungsorientiert)

- **0–10 min**: Zielbild bestätigen, 2–3 reale Fälle anschauen.
- **10–25 min**: Semantik finalisieren (`INVALID` vs `CODING_INCOMPLETE`).
- **25–40 min**: Technische Lösung lokalisieren (`@iqb/responses` Normalize/Derive).
- **40–50 min**: Akzeptanzkriterien + Testmatrix beschließen.
- **50–60 min**: Owner, Ticket-Schnitt, Timeline.

---

## 7) Detaillierte Testmatrix für euren Review

### A. Teilantworten ohne Uniqueness
- A1: 3/3 kodierbar -> `CODING_COMPLETE`.
- A2: 2/3 kodierbar, 1 Teil leer/`DISPLAYED` -> **Soll: `CODING_INCOMPLETE`** (Haupt + Partial-Credit).
- A3: 1/3 kodierbar, 2 Teile leer/`DISPLAYED` -> **Soll: `CODING_INCOMPLETE`**.
- A4: 0/3, alle `DISPLAYED` -> fachlich klären (oft kein Coding-Fall).

### B. Uniqueness-Fälle (MZB090/MZB033)
- B1: Teilweise korrekt + uniqueness offen/gebrochen -> Sollstatus festlegen.
- B2: Eindeutig ungültiger Zustand -> `INVALID`.

### C. Prozess/Pipeline
- C1: `CODING_INCOMPLETE` Fälle müssen in IEA-Übergabe sichtbar sein.
- C2: Bestehende echte `INVALID`-Filterung darf nicht regressieren.

---

## 8) Vorbereitung vor dem Meeting (Checkliste)

1. Drei reale Datensätze mit Ist-Status mitbringen (inkl. MZB090/MZB033).
2. Für jeden Datensatz tabellarisch:
   - Teilvariablenstatus,
   - Hauptableitung,
   - `_partial_credit`-Ableitung,
   - IEA-Weitergabe ja/nein.
3. Vorab eine bevorzugte Fachentscheidung formulieren (1 Seite).

---

## 9) Erwartetes Ergebnis nach dem Termin

- Dokumentierte Regel „Wann `INVALID`, wann `CODING_INCOMPLETE`“.
- Klarer Implementationsort (vermutlich `@iqb/responses`) + Ticket.
- Akzeptanztests und kurze Regression-Strategie.
