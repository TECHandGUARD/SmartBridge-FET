"""Build versioned public review PDFs; reportlab and pypdf are build-time dependencies."""
import json,re
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Flowable
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("LegalSans","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("LegalSansBold","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/legal';OUT.mkdir(parents=True,exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='LegalBody',fontName='LegalSans',fontSize=9.5,leading=14,spaceAfter=8,allowWidows=0,allowOrphans=0,textColor=colors.HexColor('#203545')))
styles.add(ParagraphStyle(name='LegalTitle',fontName='LegalSansBold',fontSize=23,leading=28,spaceAfter=18,textColor=colors.HexColor('#0F766E')))
styles.add(ParagraphStyle(name='LegalHeading',fontName='LegalSansBold',fontSize=12,leading=17,spaceBefore=10,spaceAfter=8,keepWithNext=True,textColor=colors.HexColor('#0F766E')))
FIELDS=['signer_name','email','learner_name','guardian_authority','date_signed','signature']
class SignatureFields(Flowable):
 def __init__(self):super().__init__();self.width=460;self.height=310
 def draw(self):
  c=self.canv
  labels=['Full name of person signing','Email address','Learner name (where applicable)','Guardian authority / tutor capacity','Date signed (YYYY-MM-DD)','Signature (typed or printed; verification is separate)']
  for i,(name,label) in enumerate(zip(FIELDS,labels)):
   y=285-i*48;c.setFont('LegalSans',9);c.setFillColor(colors.HexColor('#203545'));c.drawString(0,y,label)
   c.acroForm.textfield(name=name,tooltip=label,x=0,y=y-27,width=455,height=22,fontName='Helvetica',fontSize=10,borderStyle='underlined',borderColor=colors.HexColor('#0F766E'),fillColor=colors.HexColor('#F3F8F7'),textColor=colors.HexColor('#203545'),relative=True,maxlen=200)
def footer(c,doc):
 c.saveState();w,h=A4;c.setStrokeColor(colors.HexColor('#0F766E'));c.line(48,42,w-48,42);c.setFont('LegalSans',8);c.setFillColor(colors.HexColor('#526474'));c.drawString(48,29,'SmartBridge FET | Draft review copy | v1.1-draft');c.drawRightString(w-48,29,f'Page {doc.page}');c.restoreState()
def stable_canvas(*args,**kwargs):return canvas.Canvas(*args,**{**kwargs,'invariant':1})
for item in json.loads((ROOT/'legal/legal-documents.json').read_text()):
 story=[]
 for block in item['content'].split('\n\n'):
  text=block.strip().replace('–','-').replace('—','-').replace('’',"'")
  if not text:continue
  if text.startswith('# '):story.append(Paragraph(escape(text[2:]),styles['LegalTitle']))
  elif text.startswith('## '):
   heading,*rest=text[3:].split('\n',1);story.append(Paragraph(escape(heading),styles['LegalHeading']))
   if rest:story.append(Paragraph(escape(rest[0]).replace('\n','<br/>'),styles['LegalBody']))
  else:story.append(Paragraph(escape(text).replace('\n','<br/>'),styles['LegalBody']))
 if item['fillable']:
  story.extend([PageBreak(),Paragraph('Participation / signature record',styles['LegalTitle']),Paragraph(escape(item['title']+' | '+item['version']),styles['LegalHeading']),Paragraph('Complete only relevant fields. Do not enter ID numbers, medical or banking details. Retain a copy; use an approved secure submission process. This draft does not activate unpublished terms or verify authority.',styles['LegalBody']),Spacer(1,14),SignatureFields()])
 target=OUT/(item['key']+'.pdf')
 SimpleDocTemplate(str(target),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=48,bottomMargin=58,title=item['title'],author='Tech & GUARD (Pty) Ltd').build(story,onFirstPage=footer,onLaterPages=footer,canvasmaker=stable_canvas)
 reader=PdfReader(target)
 if item['fillable']:
  fields=reader.get_fields() or {};assert set(fields)==set(FIELDS),(target,list(fields))
  widgets=[a.get_object() for page in reader.pages for a in page.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Widget'];assert len(widgets)==len(FIELDS)
  assert all(w.get('/AP',{}).get('/N') for w in widgets)
 print(target.name,len(reader.pages),'pages',len(reader.get_fields() or {}),'fields')
