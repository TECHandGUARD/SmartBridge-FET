"""Build lightweight original explanatory SVGs from the published topic data.
No remote images, learner data or publisher pages are copied. Rebuild with Python.
"""
import html,json,math,pathlib,textwrap
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'public/study-visuals';OUT.mkdir(exist_ok=True)
INK='#173d34';GREEN='#2d8068';GOLD='#a86b26';PALE='#e6efe8';BLUE='#386a98'
def esc(s):return html.escape(str(s))
def text(x,y,s,size=17,color=INK,anchor='start',weight='normal'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{esc(s)}</text>'
def lines(x,y,s,width=29,size=15,color=INK):
 return ''.join(text(x,y+i*(size+6),line,size,color) for i,line in enumerate(textwrap.wrap(str(s),width=width)))
def rect(x,y,w,h,fill=PALE):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}"/>'
def line(x,y,X,Y,color=GREEN,width=3):return f'<path d="M{x},{y} L{X},{Y}" stroke="{color}" stroke-width="{width}" fill="none"/>'
def arrow(x,y,X,Y,color=GREEN):
 a=math.atan2(Y-y,X-x);d=9
 pts=[(X-d*math.cos(a-.5),Y-d*math.sin(a-.5)),(X,Y),(X-d*math.cos(a+.5),Y-d*math.sin(a+.5))]
 return line(x,y,X,Y,color)+f'<polyline points="{" ".join(f"{i},{j}" for i,j in pts)}" stroke="{color}" stroke-width="3" fill="none"/>'
def circle(x,y,r,fill=GREEN):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def flow(p):
 rows=p['visual']['rows'];out='';n=len(rows);h=min(90,300/n-12)
 for i,row in enumerate(rows):
  y=15+i*(h+14);out+=circle(24,y+22,16)+text(24,y+28,str(i+1),16,'white','middle','bold')+rect(54,y,554,h)
  # Visually connect the specific evidence in the published table.
  out+=lines(70,y+24,row[0],width=26,size=14)
  out+=arrow(278,y+27,300,y+27,GOLD)
  out+=lines(320,y+24,' · '.join(row[1:]),width=33,size=14)
  if i<n-1:out+=line(24,y+39,24,y+h+12,GOLD,2)
 return out

def draw(p):
 id=p['id'];out=''
 if id in ['math-11','math-12']:
  cubic=id=='math-12';xmin,xmax=(-2,2) if cubic else (0,4);ymin,ymax=(-3,3) if cubic else (-2,4)
  X=lambda x:75+(x-xmin)/(xmax-xmin)*480
  Y=lambda y:255-(y-ymin)/(ymax-ymin)*215
  f=lambda x:x**3-3*x if cubic else x*x-4*x+3
  out=arrow(55,Y(0),585,Y(0))+arrow(X(0),275,X(0),25)+text(590,Y(0)-8,'x',14)+text(X(0)+12,28,'y',14)
  points=' '.join(f'{X(xmin+(xmax-xmin)*i/100):.2f},{Y(f(xmin+(xmax-xmin)*i/100)):.2f}' for i in range(101))
  out+=f'<polyline points="{points}" stroke="{GOLD}" stroke-width="4" fill="none"/>'
  for x in ([-1,1] if cubic else [1,2,3]):
   y=f(x);out+=circle(X(x),Y(y),5)+text(X(x),Y(y)+(-16 if y>=0 else 27),f'({x}; {y})',15,INK,'middle')
  out+=text(320,310,'f(x) = x³ − 3x' if cubic else 'y = x² − 4x + 3',20,INK,'middle')
 elif id=='math-10':
  out=rect(130,15,380,64)+text(320,55,'x² − 5x + 6 = 0',24,INK,'middle')+arrow(320,85,320,115)+rect(130,120,380,64)+text(320,160,'(x − 2)(x − 3) = 0',24,INK,'middle')
  out+=arrow(275,190,175,225)+arrow(365,190,465,225)+rect(90,230,170,64)+rect(380,230,170,64)+text(175,270,'x = 2',24,INK,'middle')+text(465,270,'x = 3',24,INK,'middle')
 elif id=='phsc-11':
  out=rect(260,120,120,80)+text(320,168,'5 kg',22,INK,'middle')
  for x,y,X,Y,label,tx,ty in [(320,120,320,30,'Normal 49 N',338,47),(320,200,320,280,'Weight 49 N',338,277),(260,160,175,160,'Friction 5 N',63,140),(380,160,550,160,'Pull 20 N',430,140)]:out+=arrow(x,y,X,Y)+text(tx,ty,label,16)
  out+=text(320,315,'Horizontal net force: 20 − 5 = 15 N right',17,INK,'middle')
 elif id=='phsc-10':
  out=text(320,30,'Same start and finish. Different total distance.',18,INK,'middle')+line(95,175,545,175,GOLD,4)
  out+=circle(110,175,12)+circle(530,175,12)+text(110,220,'Start / finish',16,INK,'middle')+text(530,220,'4 m east',16,INK,'middle')+arrow(120,95,520,95)+text(320,78,'Outward: 4 m east',17,INK,'middle')+arrow(520,140,120,140)+text(320,128,'Return: 4 m west',17,INK,'middle')
  out+=text(320,272,'Distance = 8 m',21,INK,'middle')+text(320,305,'Displacement = 0 m',21,INK,'middle')
 elif id=='phsc-12':
  out=text(28,30,'BEFORE',15)+rect(35,80,140,70)+text(105,122,'2 kg',23,INK,'middle')+arrow(180,110,265,110)+text(217,88,'3 m/s',16,INK,'middle')+rect(365,80,100,70)+text(415,122,'1 kg',23,INK,'middle')+text(415,175,'at rest',16,INK,'middle')
  out+=text(28,220,'AFTER: STUCK TOGETHER',15)+rect(180,235,235,65)+text(297,275,'3 kg',23,INK,'middle')+arrow(425,267,550,267)+text(487,245,'2 m/s',16,INK,'middle')
 elif id=='lisc-10':
  out=rect(110,26,285,230,'#c1d9ac')+rect(122,38,261,206,'#eaf3d9')+rect(205,70,140,130,'#cbe0ef')
  out+=circle(167,100,25,'#bcb0d3')+circle(148,183,14,GREEN)+circle(355,218,14,GREEN)
  for x,y,X,Y,label in [(110,52,24,52,'Cell wall'),(383,60,440,60,'Membrane'),(345,120,440,120,'Vacuole'),(169,100,440,180,'Nucleus'),(355,218,440,240,'Chloroplast')]:out+=line(x,y,X,Y,GOLD,2)+text(X,Y-9,label,14)
  out+=text(320,297,'Simplified photosynthetic plant cell · not to scale',16,INK,'middle')
 elif id=='lisc-11':
  out=circle(90,76,42,'#efcb70')+text(90,82,'Light',16,INK,'middle')+arrow(145,90,245,125,GOLD)
  out+=rect(246,95,150,125,'#bad3ad')+text(321,150,'Leaf',26,INK,'middle')+text(321,178,'chloroplasts',16,INK,'middle')
  out+=text(24,240,'CO₂ + water',18)+arrow(165,230,250,192)+arrow(395,145,475,145)+text(480,137,'Glucose',18)+text(480,163,'+ oxygen',18)
  out+=text(320,300,'Light energy supports the production of glucose.',17,INK,'middle')
 elif id=='lisc-12':
  out=text(320,28,'Tt × Tt',24,INK,'middle')
  for i,l in enumerate(['T','t']):out+=text(280+i*115,70,l,22,INK,'middle')+text(155,120+i*90,l,22,INK,'middle')
  for i,l in enumerate(['TT','Tt','Tt','tt']):
   x=225+(i%2)*115;y=85+(i//2)*90;out+=rect(x,y,105,80,'#e1ebcf' if l!='tt' else '#f4dfbb')+text(x+52,y+49,l,25,INK,'middle')
  out+=text(320,300,'Tall: 3/4 · Short: 1/4 (probabilities, not promises)',17,INK,'middle')
 elif id=='matlit-10':
  parts=[('Transport',400,GREEN),('Food',350,BLUE),('Data',150,GOLD),('Other',100,'#8f6c9c'),('Surplus',200,'#82a957')];x=45
  out=text(320,35,'Monthly income: R1 200',24,INK,'middle')
  for label,v,color in parts:
   w=v/1200*550;out+=f'<rect x="{x}" y="70" width="{w}" height="65" fill="{color}"/>';x+=w
  for i,(label,v,color) in enumerate(parts):out+=circle(65+(i%3)*200,182+(i//3)*60,7,color)+text(80+(i%3)*200,188+(i//3)*60,f'{label}: R{v}',15)
  out+=text(320,304,'R1 200 − R1 000 expenses = R200 surplus',18,INK,'middle')
 elif id in ['matlit-11','matlit-12','eco-11','geo-11','acc-11']:
  values={'matlit-11':[('A at 8 GB',130),('B at 8 GB',160)],'matlit-12':[('Simple: year 3',1300),('Compound: year 3',1331)],'eco-11':[('Revenue before',1000),('Revenue after',880)],'geo-11':[('Water access A',70),('Water access B',95)],'acc-11':[('Partner A',60200),('Partner B',39800)]}[id]
  maximum=max(v for _,v in values)
  out=text(25,30,{'matlit-11':'Illustrative tariffs · same usage','matlit-12':'R1 000 at 10% · annual interest','eco-11':'Revenue = price × quantity demanded','geo-11':'Invented data · access to safe water','acc-11':'Allocation of R100 000 profit'}[id],19)
  for i,(label,v) in enumerate(values):
   y=80+i*100;out+=text(25,y,label,17)+rect(25,y+14,440*v/maximum,39,GREEN if i==0 else BLUE)+text(480,y+40,f'{v:,}'+('%' if id=='geo-11' else ''),18)
  out+=text(25,305,'Compare the same measure, period and units.',17)
 elif id=='eco-10':
  out=rect(35,110,180,85)+rect(425,110,180,85)+text(125,162,'Households',22,INK,'middle')+text(515,162,'Firms',22,INK,'middle')
  for y,label,forward in [(50,'Labour →',True),(90,'← Wages',False),(225,'← Goods',False),(280,'Spending →',True)]:
   out+=arrow(225,y,415,y) if forward else arrow(415,y,225,y)
   out+=text(320,y-12,label,16,INK,'middle')
 elif id=='acc-10':
  out=text(320,40,'Assets = Equity + Liabilities',25,INK,'middle')+rect(40,80,560,70,GREEN)+text(320,124,'Assets R12 000',25,'white','middle')
  out+=rect(40,180,390,70)+rect(445,180,155,70,'#f1dfbd')+text(235,222,'Equity R10 000',23,INK,'middle')+text(522,222,'R2 000',21,INK,'middle')+text(522,278,'Liabilities',16,INK,'middle')+text(235,278,'Owner’s interest',16,INK,'middle')
 elif id=='acc-12':
  out=text(320,35,'Sales: R500 000',23,INK,'middle')+rect(45,70,330,70,GREEN)+rect(375,70,220,70,GOLD)+text(210,110,'Cost: R300 000',19,'white','middle')+text(485,110,'GP: R200 000',17,'white','middle')
  out+=arrow(485,150,485,205)+rect(320,215,285,70)+text(462,257,'GP margin = 40%',22,INK,'middle')+text(25,305,'Gross profit ÷ sales × 100',19)
 elif id=='geo-10':
  out=circle(90,63,35,'#efcb70')+text(90,69,'Sun',18,INK,'middle')+rect(50,250,540,30,GREEN)+text(320,305,'Earth’s surface',18,INK,'middle')
  out+=arrow(130,90,235,245,GOLD)+text(110,175,'Shortwave',16)+arrow(340,245,340,70,BLUE)+text(355,100,'Infrared',16)
  out+=line(45,150,595,150,'#9ab7cb',8)+text(445,177,'Atmosphere',16)+arrow(400,155,460,240,BLUE)+text(453,220,'Re-emitted',14)
 elif id=='geo-12':
  pts='55,65 120,125 210,175 310,212 450,237 580,248'
  out=f'<polyline points="{pts}" stroke="{BLUE}" stroke-width="7" fill="none"/>'+arrow(50,280,600,280)+text(320,310,'Downstream →',18,INK,'middle')
  for x,y,title,body in [(60,35,'Upper','Steeper gradient'),(240,140,'Middle','Moderate gradient'),(430,200,'Lower','Gentler gradient')]:out+=text(x,y,title,19)+text(x,y+24,body,14)
 elif id=='tour-12':
  out=rect(25,25,590,65)+text(48,53,'Johannesburg · UTC+2',17)+text(48,77,'Monday 22:00 local → Monday 20:00 UTC',17)
  out+=arrow(320,98,320,130,GOLD)+text(345,119,'+10 hours flying',16)+rect(25,140,590,65)+text(48,180,'Tuesday 06:00 UTC',23)
  out+=arrow(320,213,320,242,GOLD)+text(345,233,'+1 hour at destination',15)+rect(25,250,590,65)+text(48,289,'Tuesday 07:00 local · UTC+1',22)
 elif p['code'] in ['enhl','afhl','xhhl','zuhl']:
  # Annotations retain the guide's language and original textual evidence.
  for i,row in enumerate(p['visual']['rows']):
   y=16+i*101;out+=rect(20,y,225,79,'#f2e4c5')+lines(37,y+27,'“'+row[0]+'”',21,18)+arrow(255,y+39,297,y+39)+rect(310,y,310,79)+lines(326,y+25,row[1],32,15)+lines(326,y+50,row[2],35,13)
 else:out=flow(p)
 return out
DESCRIPTIONS = {
 'math-10': ('Factorising splits the equation into two roots', 'x squared minus 5x plus 6 equals zero becomes (x minus 2)(x minus 3) equals zero. Arrows split to the roots x equals 2 and x equals 3.'),
 'math-11': ('Read the roots and turning point', 'Upward parabola y equals x squared minus 4x plus 3. The labelled roots are (1; 0) and (3; 0), with minimum (2; minus 1).'),
 'math-12': ('Stationary points on the cubic graph', 'Cubic graph f(x) equals x cubed minus 3x. The local maximum is labelled (minus 1; 2), and the local minimum (1; minus 2).'),
 'matlit-10': ('See where the monthly income goes', 'A R1 200 income bar is divided into transport R400, food R350, data R150, other R100 and surplus R200. Expenses total R1 000.'),
 'matlit-11': ('Compare two tariffs at the same usage', 'At 8 GB, illustrative plan A costs R130 and plan B R160. Bars start at the same baseline; plan B is longer because it costs R30 more.'),
 'matlit-12': ('Simple and compound growth after three years', 'R1 000 at an illustrative annual rate of 10 percent reaches R1 300 with simple interest and R1 331 with annual compound interest after three years.'),
 'phsc-10': ('A return journey: distance and displacement', 'A walker goes 4 metres east, then 4 metres west to the start. Opposing arrows show the two legs. Total distance is 8 metres; displacement is zero.'),
 'phsc-11': ('Forces on the crate', 'Simplified force diagram, not drawn to force scale: a 5 kilogram crate has normal force 49 newtons up, weight 49 newtons down, pull 20 newtons right and friction 5 newtons left. The horizontal resultant is 15 newtons right.'),
 'phsc-12': ('Before and after a sticking collision', 'Before: a 2 kilogram trolley moves right at 3 metres per second toward a stationary 1 kilogram trolley. After they stick together: the combined 3 kilograms move right at 2 metres per second.'),
 'lisc-10': ('Inside a photosynthetic plant cell', 'Simplified plant cell, not to scale. Labels point to the outer cellulose cell wall, inner cell membrane, large central vacuole, nucleus and chloroplast. Mitochondria are discussed in the notes but are not drawn.'),
 'lisc-11': ('How photosynthesis uses light', 'Light energy, carbon dioxide and water enter a leaf containing chloroplasts. An outgoing arrow identifies glucose and oxygen as products. This is a conceptual diagram, not a balanced chemical equation.'),
 'lisc-12': ('A Punnett square for Tt crossed with Tt', 'Each parent supplies T or t. Four equally likely cells show TT, Tt, Tt and tt. Under the stated dominant model, tall offspring have probability three quarters and short offspring one quarter.'),
 'acc-10': ('Keep the accounting equation balanced', 'Assets R12 000 equal equity R10 000 plus liabilities R2 000. Coloured blocks show that the two right-hand amounts add to total assets.'),
 'acc-11': ('Check the final partnership profit shares', 'Of R100 000 total profit, Partner A receives R60 200 and Partner B receives R39 800 after the agreement allocations. Two bars compare the final totals.'),
 'acc-12': ('Gross profit as a share of sales', 'A R500 000 sales bar is split into cost of sales R300 000 and gross profit R200 000. An arrow links gross profit to a 40 percent gross profit margin.'),
 'eco-10': ('Real and money flows connect households and firms', 'Households supply labour to firms and receive wages in return. Firms supply goods to households and receive spending in return. Opposing arrows show the directions.'),
 'eco-11': ('What happens to total revenue?', 'In the illustrative notebook market, revenue falls from R1 000 before the price change to R880 after it. Bars compare price multiplied by quantity demanded.'),
 'geo-10': ('Follow energy through the atmosphere', 'Sunlight travels down to Earth as shortwave radiation. The surface emits infrared upward. A simplified atmosphere layer re-emits some infrared back toward the surface.'),
 'geo-11': ('Compare access to safe water', 'In the invented dataset, 70 percent of Place A and 95 percent of Place B have access to safe water. Bars compare this social indicator, not overall development.'),
 'geo-12': ('A simplified river long profile', 'A downstream curve begins steep in the upper course, becomes moderate in the middle course and gentle in the lower course. A horizontal arrow marks downstream direction.'),
 'tour-12': ('Convert through UTC and check the day', 'Monday 22:00 in Johannesburg at UTC plus 2 is Monday 20:00 UTC. Add a 10 hour flight to reach Tuesday 06:00 UTC; add the destination offset of plus 1 to reach Tuesday 07:00 local.'),
}
manifest={}
for p in json.loads((ROOT/'src/data/study-packs.json').read_text()):
 description=p['visual']['title']+'. '+'. '.join(', '.join(row) for row in p['visual']['rows'])
 caption,description=DESCRIPTIONS.get(p['id'],(p['visual']['title'],description))
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" role="img" aria-labelledby="title desc"><title id="title">{esc(p['title'])}</title><desc id="desc">{esc(description)}</desc><rect width="640" height="380" rx="18" fill="#faf9f4"/><g font-family="DejaVu Sans,Arial,sans-serif">{draw(p)}{text(25,361,'SmartBridge FET · Grade '+str(p['grade'])+' · '+p['subject'],12,'#52675e')}</g></svg>'''
 (OUT/(p['id']+'.svg')).write_text(svg)
 manifest[p['id']]={'src':'/study-visuals/'+p['id']+'.svg','alt':description,'caption':caption}
(ROOT/'src/data/study-visuals.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(manifest)} explanatory SVGs')
