"""Draft question classifications for subject-specific CAPS formative practice.

These are author judgements about the task as presented, not verified exam
weightings. Recognition MCQs are not labelled higher order merely by their verbs.
"""
FRAMEWORKS = {
 'math': ['Knowledge', 'Routine procedures', 'Complex procedures', 'Problem solving'],
 'matlit': ['Knowing', 'Applying routine procedures', 'Applying multi-step procedures', 'Reasoning and reflecting'],
 'phsc': ['Recall', 'Comprehension', 'Analysis and application', 'Evaluation and synthesis'],
 'lisc': ['Knowing science', 'Understanding science', 'Applying scientific knowledge', 'Evaluating, analysing and synthesising'],
 'hist': ['Historical knowledge and evidence retrieval', 'Concepts and straightforward interpretation', 'Evaluate evidence and perspectives'],
 'geo': ['Knowledge and remembering', 'Understanding and applying', 'Analysing and evaluating'],
 'acc': ['Knowledge and comprehension', 'Application and analysis', 'Synthesis and evaluation'],
 'bst': ['Knowledge and comprehension', 'Application and analysis', 'Synthesis and evaluation'],
 'eco': ['Knowledge and comprehension', 'Application and analysis', 'Synthesis and evaluation'],
 'tour': ['Knowledge and comprehension', 'Application and analysis', 'Evaluation and synthesis'],
 'lo': ['Knowledge and comprehension', 'Application and analysis', 'Evaluation and synthesis'],
}
LANGUAGE_LEVELS = ['Literal', 'Reorganisation', 'Inference', 'Evaluation', 'Appreciation']
for code in ['enhl','afhl','xhhl','zuhl']:
 FRAMEWORKS[code] = LANGUAGE_LEVELS
# Four entries correspond in order to the four existing original questions.
# Group order is grade 10 terms 2/3/4, then grade 11, then grade 12.
LEVELS = {
 'math': ['2222','2222','2222','2221','2222','3222','2112','2222','2222'],
 'matlit': ['2222','2222','2244','2222','3222','1232','3333','2232','2224'],
 'phsc': ['3312','3333','3333','3322','3332','1223','3222','3121','3323'],
 'lisc': ['1212','2111','1222','1211','2123','2214','3121','2222','3222'],
 'acc': ['1212','2222','1221','2222','1221','2221','2221','2122','2222'],
 'bst': ['1112','1111','2222','1112','1222','1222','1111','2111','1112'],
 'eco': ['2221','1221','2121','2222','1112','1212','1111','2121','2122'],
 'geo': ['1112','2112','2122','1121','1112','1122','1112','1212','2112'],
 'hist': ['1122','2212','1222','1112','2222','1222','1122','1222','2222'],
 'tour': ['1122','1112','2222','2211','2222','1222','2212','2222','2222'],
 'lo': ['2222','2112','1212','2222','2121','2222','2122','2222','2122'],
 'enhl': ['1134','3151','1313','3123','3544','1544','4334','5414','1134'],
 'afhl': ['1134','3151','1313','3123','3544','1544','4334','5414','1134'],
 'xhhl': ['1114','3454','1314','2341','4443','1334','1443','5414','1134'],
 'zuhl': ['1114','3454','1314','2341','4443','1334','1443','5414','1134'],
}
# The new challenge is classified on its actual reasoning demand.
CHALLENGES = {
 'math':[3,3,3,3,3,3,4,3,3],
 'matlit':[4]*9, 'phsc':[4,2,2,4,4,3,4,4,3],
 'lisc':[4,4,4,4,4,4,3,4,4],
}

def classify(code, number):
 labels = FRAMEWORKS[code]
 if code.endswith('hl'):
  band = 'lower' if number <= 2 else 'middle' if number == 3 else 'higher'
 elif len(labels) == 4:
  # Mathematics' complex procedures and problem solving are both higher demand.
  if code == 'math': band = 'lower' if number == 1 else 'middle' if number == 2 else 'higher'
  else: band = 'lower' if number <= 2 else 'middle' if number == 3 else 'higher'
 else: band = ['lower','middle','higher'][number-1]
 return {'code': f'L{number}', 'label': labels[number-1], 'band': band}
