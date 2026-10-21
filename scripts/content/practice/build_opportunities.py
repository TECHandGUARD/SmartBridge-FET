"""Build source-linked funding and NBT seeds; never invent opening dates or seats."""
import json
import uuid
from pathlib import Path
from build_catalogue import OUT, seed

HERE = Path(__file__).resolve().parent
funding = json.loads((HERE / 'funding.json').read_text())
for b in funding:
    b['id'] = str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://smartbridge.fet/bursaries/' + b.pop('key')))
    b['is_active'] = True  # Published, including closed application rounds.
    b['academic_year'] = 2027
    b['provinces'] = []
    b.setdefault('covers', None)
    b['metadata']['verified_on'] = '2026-10-21'
    b['metadata']['date_basis'] = 'Published provider or government notice; no estimated dates'
columns = ['id', 'name', 'provider', 'description', 'apply_link', 'fields_of_study', 'covers', 'deadline', 'is_active', 'academic_year', 'provinces', 'metadata']
seed('bursaries', funding, columns, 'bursaries.sql')
(OUT / 'bursaries.json').write_text(json.dumps(funding, ensure_ascii=False, indent=2) + '\n')

# Transcribed and visually checked against the official 2027-intake calendar.
# test date | registration deadline | payment deadline | institutional results | writer results
calendar = '''2026-05-09|2026-04-19|2026-04-27|2026-06-01|2026-06-08
2026-05-16|2026-04-26|2026-05-04|2026-06-08|2026-06-15
2026-05-30|2026-05-10|2026-05-18|2026-06-22|2026-06-29
2026-06-06|2026-05-17|2026-05-25|2026-06-29|2026-07-06
2026-06-07|2026-05-17|2026-05-25|2026-06-29|2026-07-06
2026-06-20|2026-05-31|2026-06-08|2026-07-13|2026-07-20
2026-06-27|2026-06-07|2026-06-15|2026-07-20|2026-07-27
2026-07-04|2026-06-15|2026-06-22|2026-07-27|2026-08-03
2026-07-05|2026-06-15|2026-06-22|2026-07-27|2026-08-03
2026-07-11|2026-06-21|2026-06-29|2026-08-03|2026-08-10
2026-07-18|2026-06-28|2026-07-06|2026-08-10|2026-08-17
2026-07-25|2026-07-05|2026-07-13|2026-08-17|2026-08-24
2026-08-01|2026-07-12|2026-07-20|2026-08-24|2026-08-31
2026-08-02|2026-07-12|2026-07-20|2026-08-24|2026-08-31
2026-08-15|2026-07-26|2026-08-03|2026-09-07|2026-09-14
2026-08-22|2026-08-02|2026-08-10|2026-09-14|2026-09-21
2026-08-29|2026-08-09|2026-08-17|2026-09-21|2026-09-28
2026-09-05|2026-08-16|2026-08-24|2026-09-28|2026-10-05
2026-09-12|2026-08-23|2026-08-31|2026-10-05|2026-10-12
2026-09-26|2026-09-06|2026-09-14|2026-10-19|2026-10-26
2026-10-03|2026-09-13|2026-09-21|2026-10-26|2026-11-02
2026-10-10|2026-09-20|2026-09-28|2026-11-02|2026-11-09
2027-01-09|2026-12-06|2026-12-14|2027-02-01|2027-02-08'''
online = {'2026-06-20', '2026-07-25', '2026-09-05'}
dates = []
for line in calendar.splitlines():
    test, register, pay, institutions, writers = line.split('|')
    remote = test in online
    row = {
        'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://smartbridge.fet/nbt/2027-intake/' + test)),
        'test_date': test, 'test_time': None,
        'venue': 'Online test session' if remote else 'National sitting · choose an official NBT venue',
        'city': 'Online' if remote else 'See NBT venue finder',
        'tests_available': ['AQL', 'MAT'], 'registration_deadline': register,
        'registration_link': 'https://nbtests.uct.ac.za/', 'is_active': True,
        'test_code': f'NBT-2027-{test}', 'is_remote': remote,
        'results_release_date': writers,
        'metadata': {
            'intake_year': 2027, 'payment_deadline': pay,
            'institution_results_date': institutions,
            'source_url': 'https://www.nbt.ac.za/content/calendar-test-0',
            'calendar_image_url': 'https://www.nbt.ac.za/sites/default/files/2027%20intake%20jpeg_1.jpg',
            'verified_on': '2026-10-21',
            'mode': 'Online' if remote else 'Pencil and paper',
            'seat_availability': 'Not verified; check the official booking portal',
            'note': 'National date, not a confirmed venue booking. Institutions may require results earlier. AQL includes academic literacy and quantitative literacy.',
        },
    }
    assert register < pay < test < institutions <= writers
    dates.append(row)
assert len(dates) == 23 and len({x['test_date'] for x in dates}) == 23
seed('nbt_test_dates', dates, list(dates[0]), 'nbt-dates.sql')
(OUT / 'nbt-dates.json').write_text(json.dumps(dates, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'bursaries': len(funding), 'nbt_dates': len(dates), 'online_sessions': len(online)}))
