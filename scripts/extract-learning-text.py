"""Local, bounded extraction only: no network or macros. Not a general document sanitizer."""
import json
import pathlib
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

path = pathlib.Path(sys.argv[1])
if path.stat().st_size > 10 * 1024 * 1024:
    raise ValueError('File exceeds 10 MB')
ext = path.suffix.lower()
pages = []
if ext in ('.txt', '.md'):
    text = path.read_text(encoding='utf-8-sig', errors='strict')
    if '\x00' in text:
        raise ValueError('Not a text document')
    pages = [{'page': 1, 'text': text[:100000]}]
elif ext == '.pdf':
    if path.read_bytes()[:5] != b'%PDF-':
        raise ValueError('Invalid PDF')
    result = subprocess.run(['pdftotext', '-f', '1', '-l', '30', '-layout', str(path), '-'], capture_output=True, timeout=20, check=True)
    text = result.stdout[:1000000].decode('utf-8', errors='replace')
    pages = [{'page': i + 1, 'text': t[:100000]} for i, t in enumerate(text.split('\f')) if t.strip()]
elif ext == '.docx':
    with zipfile.ZipFile(path) as archive:
        info = archive.getinfo('word/document.xml')
        if info.file_size > 10 * 1024 * 1024 or info.compress_size == 0 or info.file_size / info.compress_size > 100:
            raise ValueError('DOCX expansion limit')
        raw = archive.read(info)
        if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
            raise ValueError('XML entities are not allowed')
        document = ET.fromstring(raw)
        text = '\n'.join(''.join(p.itertext()) for p in document.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
        pages = [{'page': None, 'text': text[:100000]}]
else:
    raise ValueError('Unsupported format: DOC, images and video require a separate extraction process')
print(json.dumps({'pages': pages, 'limits': {'maxPages': 30, 'maxTextPerPage': 100000}, 'coverage': 'bounded; may omit content beyond extraction limits'}, ensure_ascii=False))
