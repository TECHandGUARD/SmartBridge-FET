"""Compile original term practice into repeatable, non-destructive database seeds.

Run from the repository root. Source PDFs in tmp are research material, not copied
learning content. Questions and passages are SmartBridge originals.
"""
import json
import re
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'db' / 'seeds' / 'practice-20261021'
OUT.mkdir(parents=True, exist_ok=True)
SUBJECTS = {
    'math': ('Mathematics', 'Mathematics', 'en'),
    'matlit': ('Mathematical Literacy', 'Mathematical Literacy', 'en'),
    'phsc': ('Physical Sciences', 'Physical Sciences (2024)', 'en'),
    'lisc': ('Life Sciences', 'Life Sciences', 'en'),
    'acc': ('Accounting', 'Accounting', 'en'),
    'bst': ('Business Studies', 'Business Studies', 'en'),
    'eco': ('Economics', 'Economics', 'en'),
    'geo': ('Geography', 'Geography', 'en'),
    'hist': ('History', 'History', 'en'),
    'tour': ('Tourism', 'Tourism', 'en'),
    'lo': ('Life Orientation', 'Life Orientation', 'en'),
    'enhl': ('English HL', 'English', 'en'),
    'afhl': ('Afrikaans HL', 'Afrikaans', 'af'),
    'xhhl': ('isiXhosa HL', 'IsiXhosa', 'xh'),
    'zuhl': ('isiZulu HL', 'IsiZulu', 'zu'),
}
ATP_PATH = HERE / 'atp-sources.json'
if not ATP_PATH.exists():
    ATP_PATH.write_text((ROOT / 'tmp/curriculum/atp-links.json').read_text())
atps = json.loads(ATP_PATH.read_text())
caps = {x['name']: x['url'] for x in json.loads((HERE.parent / 'caps-sources.json').read_text())}
quizzes = []
quiz = None
stimulus = None
seen = set()
for source in ['questions.txt', 'nguni.txt']:
    for line_number, raw in enumerate((HERE / source).read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('@'):
            key, focus = line[1:].split('|', 1)
            assert key not in seen, f'Duplicate quiz: {key}'
            seen.add(key)
            code, grade, term = key.split('/')
            name, source_name, language = SUBJECTS[code]
            source_name = 'IsiZulu HL' if code == 'zuhl' and grade == '12' else source_name
            atp = next(x['url'] for x in atps if x['grade'] == int(grade) and x['subject'] == source_name)
            ident = str(uuid.uuid5(uuid.NAMESPACE_URL, f'https://smartbridge.fet/practice/{key}'))
            quiz = {
                'id': ident, 'title': f'{name} · Grade {grade} · Term {term}: {focus}',
                'subject': name, 'grade': f'Grade {grade}', 'questions': [],
                'created_by': 'SmartBridge FET content team', 'is_published': True,
                'description': f'Short formative practice: {focus}. Selected CAPS/ATP skills, with explanations. Not a complete term assessment.',
                'quiz_type': 'practice', 'difficulty_level': 'medium',
                'time_limit_minutes': 12, 'passing_score_percentage': 50,
                'total_questions': 4, 'allow_retakes': True,
                'show_answers_after_submission': True,
                'tags': ['CAPS', 'ATP', f'term-{term}', 'formative', code],
                'metadata': {
                    'term': int(term), 'focus': focus, 'language': language,
                    'content_version': '2026-10-21.1', 'content_origin': 'SmartBridge original',
                    'curriculum_year': 2026, 'atp_url': atp,
                    'caps_url': caps[{'enhl':'English', 'afhl':'Afrikaans', 'xhhl':'IsiXhosa', 'zuhl':'IsiZulu'}.get(code, name)],
                    'retention_circular_url': 'https://www.education.gov.za/Portals/0/Documents/Publications/2026/Circulars/Circular%20S19%20of%202025%20and%20Annexures.pdf',
                    'verified_on': '2026-10-21', 'lesson_path': f'/study-packs/{code}-{grade}',
                    'coverage': 'Selected topic and skill samples; not exhaustive term coverage or a full examination paper.',
                    'moderation_status': 'Independent teacher and language moderation pending',
                    'term_note': 'Revision included where specified by ATP; some Grade 10/11 Term 4 plans introduce new content.',
                },
            }
            quizzes.append(quiz)
            stimulus = None
        elif line.startswith('%'):
            stimulus = line[1:]
        else:
            fields = line.split('|')
            assert len(fields) == 6, f'{source}:{line_number}: expected 6 fields'
            question, correct, *rest = fields
            distractors, explanation = rest[:3], rest[3]
            assert len(set([correct, *distractors])) == 4, f'Duplicate options: {question}'
            assert len(explanation) > 35 and len(question) > 12
            index = (len(quizzes) + len(quiz['questions'])) % 4
            options = distractors[:]
            options.insert(index, correct)
            item = {'question': question, 'options': options, 'correct_index': index, 'explanation': explanation}
            if stimulus:
                item['stimulus'] = stimulus
            quiz['questions'].append(item)

expected = {f'{c}/{g}/{t}' for c in SUBJECTS for g in (10, 11, 12) for t in (2, 3, 4)}
assert seen == expected, f'Missing: {expected-seen}; unexpected: {seen-expected}'
assert all(len(q['questions']) == q['total_questions'] for q in quizzes)
(OUT / 'quizzes.json').write_text(json.dumps(quizzes, ensure_ascii=False, indent=2) + '\n')

def seed(table, records, columns, filename):
    payload = json.dumps(records, ensure_ascii=False, separators=(',', ':'))
    assert '$smartbridge$' not in payload
    updates = ', '.join(f'{c} = excluded.{c}' for c in columns if c != 'id')
    fields = ', '.join(columns)
    sql = f"-- Re-running this seed updates only its deterministic IDs.\nINSERT INTO public.{table} ({fields})\nSELECT {fields} FROM jsonb_populate_recordset(NULL::public.{table}, $smartbridge${payload}$smartbridge$::jsonb)\nON CONFLICT (id) DO UPDATE SET {updates}, updated_at = now();\n"
    (OUT / filename).write_text(sql)

for grade in (10, 11, 12):
    rows = [q for q in quizzes if q['grade'] == f'Grade {grade}']
    # Bounded batches keep the same scripts usable through SQL editors and MCP.
    for n in range(0, len(rows), 15):
        seed('quizzes', rows[n:n+15], list(rows[0]), f'quizzes-{grade}-{n//15+1}.sql')
print(json.dumps({'quizzes': len(quizzes), 'questions': sum(len(q['questions']) for q in quizzes), 'subjects': len(SUBJECTS), 'term_counts': dict(Counter(q['metadata']['term'] for q in quizzes))}))
