"""Render the same original catalogue used by the app into compact vector PDFs."""
import json,pathlib,html,hashlib
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether,Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
ROOT=pathlib.Path(__file__).resolve().parents[2]
for name,file in [('SB','DejaVuSans.ttf'),('SB-Bold','DejaVuSans-Bold.ttf'),('SB-Serif','DejaVuSerif.ttf')]:
 pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
pdfmetrics.registerFontFamily('SB',normal='SB',bold='SB-Bold',italic='SB',boldItalic='SB-Bold')
GREEN=HexColor('#153e35'); GOLD=HexColor('#aa8038'); INK=HexColor('#233b36'); PALE=HexColor('#eef4ef')
styles={
 'title':ParagraphStyle('title',fontName='SB-Serif',fontSize=23,leading=29,textColor=GREEN,spaceAfter=14),
 'h':ParagraphStyle('h',fontName='SB-Bold',fontSize=11,leading=16,textColor=GREEN,spaceBefore=12,spaceAfter=6),
 'body':ParagraphStyle('body',fontName='SB',fontSize=10.5,leading=16,textColor=INK,spaceAfter=7),
 'small':ParagraphStyle('small',fontName='SB',fontSize=7.8,leading=11,textColor=INK,spaceAfter=5),
 'cell':ParagraphStyle('cell',fontName='SB',fontSize=8.8,leading=12,textColor=INK),
 'headcell':ParagraphStyle('headcell',fontName='SB-Bold',fontSize=8.8,leading=12,textColor=white),
}
def para(t,s='body'):return Paragraph(html.escape(t).replace('\n','<br/>'),styles[s])
class NumberLine(Flowable):
 def __init__(self,kind):super().__init__();self.width=475;self.height=96;self.kind=kind
 def draw(self):
  c=self.canv;c.setStrokeColor(GREEN);c.setLineWidth(1)
  if self.kind=='math-11':
   # Exact points of y=x²−4x+3, with labelled axes and turning point.
   ox,oy,sx,sy=75,30,70,14
   c.line(ox-20,oy,ox+4.5*sx,oy);c.line(ox,8,ox,90)
   path=c.beginPath()
   for i in range(101):
    x=i/25;y=x*x-4*x+3; px=ox+x*sx;py=oy+y*sy
    if i==0:path.moveTo(px,py)
    else:path.lineTo(px,py)
   c.setStrokeColor(GOLD);c.setLineWidth(2);c.drawPath(path)
   c.setFont('SB',8);c.setFillColor(INK)
   for x in [0,1,2,3,4]:c.drawString(ox+x*sx-2,oy-12,str(x))
   c.drawString(ox+2*sx-23,oy-sy-24,'(2; −1)');c.drawString(ox+4.5*sx+5,oy,'x');c.drawString(ox-13,86,'y')
  else:
   labels={'phsc-11':['← friction 5 N','crate 5 kg','pull 20 N →'],'lisc-12':['Tt parent','T or t gametes','TT / Tt / tt offspring'],'eco-10':['Households','Labour → / ← Wages','Firms']}.get(self.kind,['Recall','Check and explain','Try again'])
   c.setFont('SB',8);c.setFillColor(INK)
   for i,label in enumerate(labels):
    x=i*160;c.setFillColor(PALE);c.roundRect(x,25,150,45,7,fill=1,stroke=0);c.setFillColor(INK)
    # Text fitted to boxes, with the detailed accessible explanation in the table above.
    size=min(8,133/max(1,pdfmetrics.stringWidth(label,'SB',8))*8);c.setFont('SB',size);c.drawCentredString(x+75,45,label)
    if i<2:c.setStrokeColor(GOLD);c.line(x+151,47,x+158,47)
def footer(c,d):
 c.setFillColor(GREEN);c.rect(0,800,595,42,fill=1,stroke=0);c.setFillColor(white);c.setFont('SB-Bold',11);c.drawString(42,816,'SmartBridge FET')
 c.setFont('SB',8);c.drawRightString(553,817,'LEARN • PRACTISE • REFLECT')
 c.setStrokeColor(GOLD);c.line(42,39,553,39);c.setFillColor(INK);c.setFont('SB',7)
 c.drawString(42,25,'Original topic guide • Edition 2026.1 • Not DBE endorsed');c.drawRightString(553,25,f'{d.page} / 2')
packs=json.loads((ROOT/'src/data/study-packs.json').read_text());manifest=[]
for p in packs:
 path=ROOT/'public'/p['pdfUrl'].lstrip('/')
 doc=SimpleDocTemplate(str(path),pagesize=(595,842),rightMargin=42,leftMargin=42,topMargin=61,bottomMargin=53,title=f"SmartBridge FET | {p['subject']} | Grade {p['grade']} | {p['title']}",author='SmartBridge FET',pageCompression=1,invariant=1)
 story=[para(f"GRADE {p['grade']} / {p['subject']} / {p['language']}",'small'),para(p['title'],'title'),para('01  Understand','h')]
 story.append(para('Learning goals: '+' • '.join(p['goals']),'small'))
 for n in p['notes']:story.append(para(n))
 story.append(para(p['visual']['title'],'h'))
 rows=[[para(x,'headcell') for x in p['visual']['columns']]]+[[para(x,'cell') for x in r] for r in p['visual']['rows']]
 table=Table(rows,colWidths=[511/len(rows[0])]*len(rows[0]),hAlign='LEFT')
 table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[PALE,white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
 story+=[table,Spacer(1,7),para('02  Follow the reasoning','h'),para(p['example'])]
 for i,s in enumerate(p['steps']):story.append(para(f'{i+1}. {s}'))
 if p['id']=='math-11':story.append(NumberLine(p['id']))
 story+=[PageBreak(),para(f"GRADE {p['grade']} / {p['subject']}",'small'),para('Practise with purpose','title'),para('03  Try before checking','h'),para('Use paper or your notebook. Show your reasoning. For written responses, use evidence and explain your choices. Suggested time: 15–20 minutes.','small')]
 for i,q in enumerate(p['questions']):
  story+=[para(f'{i+1}. {q}'),Spacer(1,15)]
 story+=[para('04  Check and correct','h')]
 for i,a in enumerate(p['answers']):story.append(para(f'{i+1}. {a}'))
 story+=[para('Common mistake to avoid','h'),para(p['commonMistake']),para('Reflect and revisit','h'),para('Identify one correction in your own words. Attempt a similar question tomorrow without looking at the guide. If you are still unsure, take your attempt to a teacher or tutor.','small'),para('Coverage and sources','h'),para('CAPS topic focus: '+p['capsTopic'],'small'),para(p['sourceLabel']+'. Section 3 content and skills. This is a focused supplement, not a complete syllabus or prescribed literature replacement.','small')]
 # A clickable source avoids unreadable raw URLs and keeps source navigation intact offline readers.
 story.append(Paragraph('<a href="'+html.escape(p['sourceUrl'],quote=True)+'" color="#153e35"><u>Open the official DBE curriculum reference</u></a>',styles['small']))
 if p.get('furtherReading'):story.append(para(p['furtherReading'],'small'))
 story+=[para('Content and visuals: original SmartBridge FET. AI-assisted authoring; subject-teacher and language-specialist review pending. Report an issue with the pack ID '+p['id']+'.','small')]
 doc.build(story,onFirstPage=footer,onLaterPages=footer)
 manifest.append({'id':p['id'],'url':p['pdfUrl'],'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(ROOT/'src/data/study-pack-files.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Built',len(manifest),'PDFs;',sum(r['bytes'] for r in manifest),'bytes')
