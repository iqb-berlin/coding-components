param(
  [Parameter(Mandatory = $true)][string]$Directory,
  [switch]$IncludeStudioReferences
)
# Windows desktop Word acceptance for the staged synthetic codebook documents.
# Sources are opened read-only, without OpenAndRepair, and never saved.
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Windows desktop Word is required.' }
$folder = (Resolve-Path -LiteralPath $Directory).Path
$expectations = Get-Content (Join-Path $folder 'word-expectations.json') -Raw | ConvertFrom-Json
# Accept both the original three-case matrix and the seven-case inline-image matrix.
$baseline = @('', '-rich-no-scores', '-rich-scores')
$inline = @('-inline-mixed-code-no-scores', '-inline-mixed-code-scores',
  '-inline-mixed-general-no-scores', '-inline-mixed-general-scores')
$suffixes = @($expectations.cases | ForEach-Object { $_.suffix })
$accepted = if ($suffixes.Count -eq 3) { $baseline } else { $baseline + $inline }
if ($suffixes.Count -ne $accepted.Count -or
    (Compare-Object ($suffixes | Sort-Object) ($accepted | Sort-Object))) {
  throw 'Expected the complete three- or seven-case Word acceptance matrix.'
}
$files = @()
foreach ($expected in $expectations.cases) {
  foreach ($hostName in @('studio', 'kodierbox')) {
    $name = "$hostName$($expected.suffix).docx"
    $files += [pscustomobject]@{
      file = $name; uiAlias = ('W{0:D2}.docx' -f ($files.Count + 1))
      sha256 = (Get-FileHash -LiteralPath (Join-Path $folder $name) -Algorithm SHA256).Hash
      kind = 'current-installed-host-export'; host = $hostName
      case = $expected.suffix; expected = $expected
    }
  }
}
if ($IncludeStudioReferences) {
  foreach ($scoreMode in @('scores', 'no-scores')) {
    $name = "original-studio-$scoreMode.docx"
    $expected = @($expectations.cases | Where-Object { $_.suffix -eq "-rich-$scoreMode" })[0]
    $files += [pscustomobject]@{
      file = $name; uiAlias = ('W{0:D2}.docx' -f ($files.Count + 1))
      sha256 = (Get-FileHash -LiteralPath (Join-Path $folder $name) -Algorithm SHA256).Hash
      kind = 'independent-pre-harmonization-studio-reference'; host = 'original-studio'
      case = $expected.suffix; expected = $expected
    }
  }
}
$manifest = [pscustomobject]@{ files = $files }
$output = Join-Path $folder ('WordResults' + (Get-Date -Format 'yyyyMMddHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6))
New-Item -ItemType Directory -Path $output | Out-Null
function Write-Stage([string]$message) {
  Add-Content -Path $progressFile -Value ((Get-Date -Format o) + ' ' + $message) -Encoding UTF8
}
$localInput = Join-Path $env:TEMP ('CodebookWord' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $localInput | Out-Null
$progressFile = Join-Path $localInput 'progress.log'
Write-Stage "Starting process $PID"
$results = @()
$word = $null
$ownInstance = $false
$failure = $null
try {
  $word = New-Object -ComObject Word.Application
  Write-Stage 'Created isolated Word instance'
  # Refuse to operate on a COM instance containing the user's open documents.
  if ($word.Documents.Count -ne 0) { throw 'Word instance already contains open documents; stopping.' }
  $ownInstance = $true
  $word.Visible = $true
  $word.DisplayAlerts = 0
  $word.AutomationSecurity = 3
  foreach ($file in $manifest.files) {
    $document = $null
    try {
      [string]$source = Join-Path $folder $file.file
      if ((Get-FileHash $source -Algorithm SHA256).Hash -ne $file.sha256) {
        throw "Input checksum mismatch: $($file.uiAlias)"
      }
      [string]$path = Join-Path $localInput $file.uiAlias
      Copy-Item -LiteralPath $source -Destination $path
      Write-Stage "Opening $($file.uiAlias) from verified local copy"
      # ConfirmConversions=false, ReadOnly=true, AddToRecentFiles=false.
      # OpenAndRepair remains its default false; no repair fallback is used.
      $confirmConversions = $false
      $readOnly = $true
      $addToRecentFiles = $false
      $document = $word.Documents.Open([ref]$path, [ref]$confirmConversions, [ref]$readOnly, [ref]$addToRecentFiles)
      Write-Stage "Opened $($file.uiAlias)"
      $document.Repaginate()
      Write-Stage 'Repaginated'
      if ($document.Fields.Update() -ne 0) { throw 'Failed to update document fields.' }
      foreach ($section in $document.Sections) {
        foreach ($footer in $section.Footers) {
          if ($footer.Range.Fields.Update() -ne 0) { throw 'Failed to update footer fields.' }
        }
      }
      $document.Repaginate()
      Write-Stage 'Updated fields'
      $pages = $document.ComputeStatistics(2)
      $tables = $document.Tables.Count
      $images = $document.InlineShapes.Count
      $formulas = $document.OMaths.Count
      $headings = @($document.Paragraphs | Where-Object { $_.OutlineLevel -eq 2 }).Count
      $text = $document.Content.Text
      $footerText = $document.Sections.Item(1).Footers.Item(1).Range.Text
      Write-Stage "Collected counts: pages $pages tables $tables images $images formulas $formulas"
      $expected = $file.expected
      if ($tables -ne $expected.tables) { throw "Lost tables: $tables / $($expected.tables)" }
      if ($images -ne $expected.images) { throw "Lost images: $images / $($expected.images)" }
      if ($formulas -ne $expected.formulas) { throw "Lost equations: $formulas / $($expected.formulas)" }
      if ($headings -ne $expected.variableHeadings) { throw 'Lost variable headings.' }
      if (-not $file.case.Contains('-inline-') -and $pages -lt 2) { throw 'Multi-page coverage missing.' }
      Write-Stage 'Validating tables'
      for ($tableIndex = 1; $tableIndex -le $document.Tables.Count; $tableIndex++) {
        $table = $document.Tables.Item($tableIndex)
        if ($table.Columns.Count -ne $expected.columns) { throw 'Incorrect table column count.' }
        if ($table.Rows.AllowBreakAcrossPages -ne 0) { throw 'Code rows can split across pages.' }
      }
      Write-Stage 'Validated tables'
      $footerLabel = if ($file.host -eq 'original-studio') { 'IQB-Studio Codebook' } else { 'IQB Codebook' }
      if (-not $footerText.Contains($footerLabel)) { throw 'Footer label missing.' }
      $footerFields = $document.Sections.Item(1).Footers.Item(1).Range.Fields
      Write-Stage "Validating $($footerFields.Count) footer fields"
      $pageFields = @()
      $totalFields = @()
      for ($fieldIndex = 1; $fieldIndex -le $footerFields.Count; $fieldIndex++) {
        $field = $footerFields.Item($fieldIndex)
        if ($field.Type -eq 33) { $pageFields += $field }
        if ($field.Type -eq 26) { $totalFields += $field }
      }
      if ($pageFields.Count -ne 1 -or $totalFields.Count -ne 1) { throw 'PAGE / NUMPAGES missing.' }
      if ([int]$totalFields[0].Result.Text.Trim() -ne $pages) { throw 'Incorrect total page field.' }
      $pageValue = [int]$pageFields[0].Result.Text.Trim()
      if ($pageValue -lt 1 -or $pageValue -gt $pages) { throw 'Incorrect current page field.' }
      Write-Stage 'Validated page fields'
      if ($expected.hasMissingZero -and -not $text.Contains('0 Missing zero')) { throw 'Missing 0 lost.' }
      if ($file.case.Contains('-inline-')) {
        foreach ($token in @('VOR', 'NACH', 'WEITER', 'HTML konnte nicht verarbeitet werden.')) {
          if (-not $text.Contains($token)) { throw "Inline-image surrounding content lost: $token" }
        }
      }
      $pdf = [IO.Path]::GetFileNameWithoutExtension($file.uiAlias) + '.pdf'
      [string]$pdfPath = Join-Path $output $pdf
      Write-Stage "Exporting $pdf"
      $document.ExportAsFixedFormat($pdfPath, 17)
      Write-Stage "Exported $pdf"
      $results += [pscustomobject]@{
        file = $file.file; alias = $file.uiAlias; kind = $file.kind; host = $file.host
        case = $file.case; pages = $pages; tables = $tables; images = $images
        formulas = $formulas; variableHeadings = $headings; text = $text; footer = $footerText
        pdf = $pdf; wordVersion = $word.Version; wordBuild = $word.Build
      }
      Write-Host "PASS $($file.uiAlias) $pages pages $tables tables $images images $formulas equations"
    } finally {
      if ($null -ne $document) {
        $saveChanges = 0
        $document.Close([ref]$saveChanges)
        Write-Stage "Closed $($file.uiAlias) without saving"
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
      }
    }
  }
  foreach ($group in @($results | Where-Object { $_.kind -eq 'current-installed-host-export' } | Group-Object -Property case)) {
    $pair = @($group.Group)
    if ($pair.Count -ne 2) { throw 'Host pair missing.' }
    if ($pair[0].text -cne $pair[1].text) { throw "Different host text: $($group.Name)" }
    if ($pair[0].pages -ne $pair[1].pages) { throw "Different host page counts: $($group.Name)" }
    if ($pair[0].footer -cne $pair[1].footer) { throw "Different host footers: $($group.Name)" }
  }
} catch {
  $failure = $_.Exception.ToString()
  Write-Host $failure -ForegroundColor Red
} finally {
  if ($null -ne $word) {
    try {
      if ($ownInstance) {
        $saveChanges = 0
        $word.Quit([ref]$saveChanges)
      }
    } catch {
      $failure = "$failure`nWord cleanup: $($_.Exception)"
    } finally {
      [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
  }
  $hashesUnchanged = $true
  foreach ($file in $manifest.files) {
    if ((Get-FileHash (Join-Path $folder $file.file) -Algorithm SHA256).Hash -ne $file.sha256) {
      $hashesUnchanged = $false
    }
  }
  if (-not $hashesUnchanged) { $failure = "$failure`nSource checksums changed." }
  $report = [pscustomobject]@{
    checkedAtUtc = [DateTime]::UtcNow.ToString('o'); platform = 'Windows desktop Word'
    automatedChecksPassed = ($null -eq $failure -and $results.Count -eq $manifest.files.Count -and $hashesUnchanged)
    visualAcceptanceComplete = $false; inputHashesUnchanged = $hashesUnchanged
    failure = $failure; documents = $results; inputs = $manifest
  }
  Copy-Item -LiteralPath $progressFile -Destination (Join-Path $output 'progress.log')
  $pendingReport = Join-Path $output 'word-windows-result.pending.json'
  $report | ConvertTo-Json -Depth 12 | Set-Content $pendingReport -Encoding UTF8
  Move-Item -LiteralPath $pendingReport -Destination (Join-Path $output 'word-windows-result.json')
  Write-Host "Evidence: $output"
  Remove-Item -LiteralPath $localInput -Recurse -Force
}
if ($null -ne $failure) { throw $failure }
Write-Host 'Automated checks complete. Visually inspect all Word PDFs before acceptance.'
