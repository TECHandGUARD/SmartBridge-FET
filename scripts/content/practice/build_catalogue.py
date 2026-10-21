"""Compile original term practice into repeatable, non-destructive database seeds.

Run from the repository root. Source PDFs in tmp are research material, not copied
learning content. Questions and passages are SmartBridge originals.
"""
import copy
import json
import re
import uuid
from collections import Counter
from pathlib import Path
from cognition import FRAMEWORKS, LEVELS, CHALLENGES, classify

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
                'total_questions': 5, 'allow_retakes': True,
                'show_answers_after_submission': True,
                'tags': ['CAPS', 'ATP', f'term-{term}', 'formative', code],
                'metadata': {
                    'term': int(term), 'focus': focus, 'language': language,
                    'content_version': '2026-10-21.2', 'content_origin': 'SmartBridge original',
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
# Retain original quiz IDs and historical result links; add a second deterministic
# set rather than overwriting a learner's choice with whichever row is newest.
challenges = {}
for raw in (HERE / 'challenges.txt').read_text().splitlines():
    if not raw.strip() or raw.startswith('#'):
        continue
    key, question, correct, a, b, c, explanation = raw.split('|')
    assert key not in challenges
    assert len({correct,a,b,c}) == 4
    challenges[key] = {'question':question, 'options':[a,b,correct,c], 'correct_index':2, 'explanation':explanation}
assert set(challenges) == expected
bases = {}
for quiz in quizzes:
    code = quiz['tags'][-1]
    grade = int(quiz['grade'][-2:])
    term = quiz['metadata']['term']
    key = f'{code}/{grade}/{term}'
    index = (grade-10)*3 + term-2
    assert len(quiz['questions']) == 4
    for item, level in zip(quiz['questions'], LEVELS[code][index]):
        item['cognitive_level'] = classify(code, int(level))
    challenge = challenges[key]
    challenge['cognitive_level'] = classify(code, CHALLENGES.get(code, [len(FRAMEWORKS[code]) if not code.endswith('hl') else 4]*9)[index])
    if code.endswith('hl'):
        challenge['stimulus'] = quiz['questions'][0]['stimulus']
    quiz['questions'].append(challenge)
    quiz['title'] += ' · Set A'
    quiz['metadata'].update({
        'set_id':'A', 'set_label':'Term-focused practice',
        'cognitive_framework': ('CAPS-informed historical knowledge and source skills' if code == 'hist' else 'CAPS subject taxonomy') if not code.endswith('hl') else 'CAPS language response: Barrett-informed comprehension and literary analysis',
        'cognitive_levels': FRAMEWORKS[code],
        'classification_status':'Draft author classification; independent moderation pending',
        'assessment_note':'Five-question formative samples do not reproduce formal examination mark weightings or assess extended written responses.',
    })
    bases[key] = quiz

mixed = []
for key, base in bases.items():
    code, grade, term = key.split('/')
    others = [bases[f'{code}/{grade}/{t}'] for t in (2,3,4) if t != int(term)]
    quiz = copy.deepcopy(base)
    quiz['id'] = str(uuid.uuid5(uuid.NAMESPACE_URL, f'https://smartbridge.fet/practice/{key}/set-b'))
    quiz['title'] = f"{base['subject']} · Grade {grade} · Term {term} selection · Set B: Mixed revision"
    quiz['description'] = 'Mixed grade revision drawn from the other two terms. Includes later-term topics; revisit after studying those topics. Questions are reused deliberately across revision sets.'
    quiz['metadata'].update({'set_id':'B', 'set_label':'Mixed grade revision',
        'focus': 'Mixed revision: ' + '; '.join(q['metadata']['focus'] for q in others),
        'source_terms':[q['metadata']['term'] for q in others],
        'coverage':'Selected grade revision from other terms, including later-term content. Not a second paper covering only the selected term.',
        'atp_urls':list(dict.fromkeys(q['metadata']['atp_url'] for q in others)),
        'question_reuse':'Revision questions recur across term-focused and mixed sets; Set A and Set B within the same selection do not share questions.'})
    quiz['questions'] = copy.deepcopy([others[0]['questions'][0], others[0]['questions'][3], others[1]['questions'][1], others[1]['questions'][2], others[1]['questions'][4]])
    assert not {q['question'] for q in base['questions']} & {q['question'] for q in quiz['questions']}
    mixed.append(quiz)
quizzes.extend(mixed)
assert len(quizzes) == 270
assert all(len(q['questions']) == q['total_questions'] == 5 for q in quizzes)
assert all(len({x['cognitive_level']['label'] for x in q['questions']}) >= 2 for q in quizzes)
for stale in OUT.glob('quizzes-*.sql'):
    stale.unlink()

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
