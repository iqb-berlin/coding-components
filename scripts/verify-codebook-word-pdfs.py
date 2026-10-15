# Reproduce native Word PDF checks after verify-codebook-word-windows.ps1.
# Requires Python 3, Pillow, pypdf and Poppler pdftoppm. Does not assert visual acceptance.
import argparse
import shutil
from pathlib import Path
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from PIL import Image, ImageChops
from pypdf import PdfReader

parser = argparse.ArgumentParser(description='Verify and raster-compare native Windows Word PDFs.')
parser.add_argument('directory', type=Path, help='WordResults folder containing the completed JSON and PDFs')
parser.add_argument('--pdftoppm', default=shutil.which('pdftoppm'), help='Path to Poppler pdftoppm')
args = parser.parse_args()
if not args.pdftoppm:
    parser.error('pdftoppm is required; add it to PATH or pass --pdftoppm')
root = args.directory
if not root.is_dir():
    parser.error('The completed WordResults directory does not exist')
evidence = root
report = json.loads((evidence / 'word-windows-result.json').read_text(encoding='utf-8-sig'))
assert report['automatedChecksPassed'], report['failure']
assert report['inputHashesUnchanged']
renders = root / 'renders'
renders.mkdir(exist_ok=True)
groups = defaultdict(list)
documents = []
for item in report['documents']:
    pdf = evidence / item['pdf']
    reader = PdfReader(pdf)
    assert len(reader.pages) == item['pages']
    assert 'Word' in reader.metadata.producer, reader.metadata
    stem = pdf.stem
    prefix = renders / stem
    subprocess.run([
        args.pdftoppm,
        '-r', '120', '-png', str(pdf), str(prefix)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pages = []
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text()
        match = re.search(r'Seite\s+(\d+)\s+von\s+(\d+)', text)
        assert match and tuple(map(int, match.groups())) == (number, len(reader.pages)), (stem, number, text)
        image = renders / f'{stem}-{number}.png'
        assert image.exists()
        pages.append({'page': number, 'png': image.name,
                      'pixelSha256': hashlib.sha256(Image.open(image).tobytes()).hexdigest()})
    record = {k: item[k] for k in ('file', 'alias', 'kind', 'host', 'case', 'pages', 'tables', 'images', 'formulas')}
    record.update(pdfSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                  creator=reader.metadata.creator, producer=reader.metadata.producer,
                  renderedPages=pages)
    documents.append(record)
    if item['kind'] == 'current-installed-host-export':
        groups[item['case']].append(record)

pairs = []
for case, pair in groups.items():
    assert len(pair) == 2
    assert pair[0]['pages'] == pair[1]['pages']
    for left, right in zip(pair[0]['renderedPages'], pair[1]['renderedPages']):
        a = Image.open(renders / left['png']).convert('RGB')
        b = Image.open(renders / right['png']).convert('RGB')
        assert a.size == b.size
        diff = ImageChops.difference(a, b)
        assert diff.getbbox() is None, (case, left['page'], diff.getbbox())
    pairs.append({'case': case, 'files': [d['file'] for d in pair], 'pagesPerHost': pair[0]['pages'],
                  'identicalRasterPixels': True})

result = {'platform': report['platform'], 'automatedChecksPassed': True,
          'totalDocuments': len(documents), 'totalPages': sum(d['pages'] for d in documents),
          'currentHostPairs': len(pairs), 'inputHashesUnchanged': True,
          'allPageNumbersVerifiedInWordPdfs': True, 'allCurrentHostPixelsIdentical': True,
          'visualInspectionComplete': False, 'documents': documents, 'pairs': pairs}
(root / 'word-pdf-comparison.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k not in ('documents', 'pairs')}, indent=2))
