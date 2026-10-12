param(
  [Parameter(Mandatory = $true)][string]$Directory
)
# Run on Windows with desktop Microsoft Word installed. Opens copies read-only;
# never saves changes to the DOCX sources. PDF and JSON are acceptance evidence,
# not a replacement for inspecting the rendered pages.
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This check requires Microsoft Word on Windows.' }
$folder = (Resolve-Path $Directory).Path
$manifest = Get-Content (Join-Path $folder 'word-expectations.json') -Raw | ConvertFrom-Json
if (@($manifest.cases).Count -ne 3) { throw 'Expected three Word acceptance cases.' }
$suffixes = @($manifest.cases | ForEach-Object { $_.suffix } | Sort-Object -Unique)
if (($suffixes -join ',') -ne ',-rich-no-scores,-rich-scores') { throw 'Unexpected Word acceptance cases.' }
$word = $null
$results = @()
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $word.AutomationSecurity = 3
  foreach ($expected in $manifest.cases) {
   foreach ($hostName in @('studio', 'kodierbox')) {
    $name = "$hostName$($expected.suffix)"
    $document = $null
    try {
      $path = Join-Path $folder "$name.docx"
      # ConfirmConversions=false, ReadOnly=true, AddToRecentFiles=false.
      # Open normally; do not request Word's OpenAndRepair mode.
      $document = $word.Documents.Open($path, $false, $true, $false)
      $document.Repaginate()
      if ($document.Fields.Update() -ne 0) { throw "$name could not update all document fields." }
      foreach ($section in $document.Sections) {
        foreach ($footer in $section.Footers) {
          if ($footer.Range.Fields.Update() -ne 0) { throw "$name could not update all footer fields." }
        }
      }
      $document.Repaginate()
      $pages = $document.ComputeStatistics(2)
      $tables = $document.Tables.Count
      $images = $document.InlineShapes.Count
      $formulas = $document.OMaths.Count
      $headings = @($document.Paragraphs | Where-Object { $_.OutlineLevel -eq 2 }).Count
      if ($pages -lt 2) { throw "$name must exercise multiple pages." }
      if ($tables -ne $expected.tables) { throw "$name lost tables: $tables / $($expected.tables)" }
      if ($images -ne $expected.images) { throw "$name lost images: $images / $($expected.images)" }
      if ($formulas -ne $expected.formulas) { throw "$name lost equations: $formulas / $($expected.formulas)" }
      if ($headings -ne $expected.variableHeadings) { throw "$name lost variable headings." }
      foreach ($table in $document.Tables) {
        if ($table.Columns.Count -ne $expected.columns) { throw "$name has an incorrect table column count." }
        if ($table.Rows.AllowBreakAcrossPages -ne 0) { throw "$name allows code rows to split across pages." }
      }
      $footerText = $document.Sections.Item(1).Footers.Item(1).Range.Text
      if (-not $footerText.Contains('IQB Codebook')) { throw "$name is missing the footer label." }
      $footerFields = $document.Sections.Item(1).Footers.Item(1).Range.Fields
      $pageFields = @($footerFields | Where-Object { $_.Type -eq 33 }) # wdFieldPage
      $totalFields = @($footerFields | Where-Object { $_.Type -eq 26 }) # wdFieldNumPages
      if ($pageFields.Count -ne 1 -or $totalFields.Count -ne 1) { throw "$name lost PAGE or NUMPAGES." }
      if ([int]$totalFields[0].Result.Text.Trim() -ne $pages) { throw "$name has an incorrect total page field." }
      $pageValue = [int]$pageFields[0].Result.Text.Trim()
      if ($pageValue -lt 1 -or $pageValue -gt $pages) { throw "$name has an incorrect current page field." }
      $text = $document.Content.Text
      if ($expected.hasMissingZero -and -not $text.Contains('0 Missing zero')) { throw "$name is missing Missing 0." }
      $document.ExportAsFixedFormat((Join-Path $folder "$name-word-windows.pdf"), 17)
      $results += [pscustomobject]@{
        case = $expected.suffix; file = "$name.docx"; pages = $pages; tables = $tables; images = $images; formulas = $formulas
        text = $text; footer = $footerText; wordVersion = $word.Version; wordBuild = $word.Build
      }
    } finally {
      if ($null -ne $document) {
        $document.Close(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
      }
    }
   }
  }
  foreach ($group in @($results | Group-Object -Property case)) {
    $pair = $group.Group
    if ($pair.Count -ne 2) { throw 'Missing host document in Word comparison.' }
    if ($pair[0].text -cne $pair[1].text) { throw "$($group.Name): different content in Word." }
    if ($pair[0].pages -ne $pair[1].pages) { throw "$($group.Name): different page counts in Word." }
    if ($pair[0].footer -cne $pair[1].footer) { throw "$($group.Name): different footers in Word." }
  }
  $report = [pscustomobject]@{
    checkedAtUtc = [DateTime]::UtcNow.ToString('o'); platform = 'Windows desktop Word'
    automatedChecksPassed = $true; visualAcceptanceComplete = $false
    documents = @($results | Select-Object case,file,pages,tables,images,formulas,wordVersion,wordBuild)
  }
  $report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $folder 'word-windows-result.json') -Encoding UTF8
  Write-Output 'Word checks passed. Inspect all six PDFs for page breaks, fonts, formulas, images and page fields before visual acceptance.'
} finally {
  if ($null -ne $word) {
    $word.Quit(0)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
  }
}
