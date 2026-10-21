"""Build lightweight original explanatory SVGs from the published topic data.
No remote images, learner data or publisher pages are copied. Rebuild with Python.
"""
import hashlib,html,json,math,pathlib,textwrap
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'public/study-visuals';OUT.mkdir(exist_ok=True)
INK='#193e36';GREEN='#347864';GOLD='#a97936';PALE='#edf3ed';BLUE='#3c718c'
def esc(s):return html.escape(str(s))
def text(x,y,s,size=17,color=INK,anchor='start',weight='normal'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{esc(s)}</text>'
def lines(x,y,s,width=29,size=15,color=INK):
 return ''.join(text(x,y+i*(size+6),line,size,color) for i,line in enumerate(textwrap.wrap(str(s),width=width)))
def rect(x,y,w,h,fill=PALE):
 paint='url(#sage)' if fill==PALE else 'url(#forest)' if fill==GREEN else 'url(#brass)' if fill==GOLD else fill
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="{paint}" stroke="{INK}" stroke-opacity=".13" stroke-width=".8"/>'
def line(x,y,X,Y,color=GREEN,width=3):return f'<path d="M{x},{y} L{X},{Y}" stroke="{color}" stroke-width="{width}" stroke-linecap="round" fill="none"/>'
def arrow(x,y,X,Y,color=GREEN):
 a=math.atan2(Y-y,X-x);d=9
 pts=[(X-d*math.cos(a-.5),Y-d*math.sin(a-.5)),(X,Y),(X-d*math.cos(a+.5),Y-d*math.sin(a+.5))]
 return line(x,y,X,Y,color,2.1)+f'<polyline points="{" ".join(f"{i},{j}" for i,j in pts)}" stroke="{color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
def circle(x,y,r,fill=GREEN):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def flow(p):
 rows=p['visual']['rows'];out='';n=len(rows);h=min(94,320/n-8)
 for i,row in enumerate(rows):
  y=6+i*(h+8)
  if i<n-1:out+=line(21,y+22,21,y+h+28,'#c3cfc0',1.5)
  out+=circle(21,y+24,17,'url(#forest)')+text(21,y+29,f'{i+1:02}',12,'white','middle','bold')
  out+=rect(54,y,566,h,'#ffffff')+rect(54,y,172,h,PALE)
  out+=lines(68,y+26,row[0],width=19,size=15)
  out+=lines(247,y+25,row[1],width=39,size=15)
  detail_y=y+29+len(textwrap.wrap(row[1],width=39))*21
  out+=lines(247,detail_y,row[2],width=45,size=13,color='#576d62')
 return out

def draw(p):
 id=p['id'];out=''
 if id in ['math-11','math-12']:
  cubic=id=='math-12';xmin,xmax=(-2,2) if cubic else (0,4);ymin,ymax=(-3,3) if cubic else (-2,4)
  X=lambda x:75+(x-xmin)/(xmax-xmin)*480
  Y=lambda y:255-(y-ymin)/(ymax-ymin)*215
  f=lambda x:x**3-3*x if cubic else x*x-4*x+3
  out=rect(48,15,560,275,'#ffffff')
  for x in range(math.ceil(xmin),math.floor(xmax)+1):
   out+=line(X(x),30,X(x),270,'#dce5df',.7)
   if x:out+=text(X(x),Y(0)+18,str(x),11,'#708078','middle')
  for y in range(math.ceil(ymin),math.floor(ymax)+1):
   out+=line(65,Y(y),580,Y(y),'#dce5df',.7)
   if y:out+=text(X(0)-13,Y(y)+4,str(y),11,'#708078','end')
  out+=arrow(55,Y(0),585,Y(0))+arrow(X(0),275,X(0),25)+text(590,Y(0)-8,'x',14)+text(X(0)+12,28,'y',14)
  points=' '.join(f'{X(xmin+(xmax-xmin)*i/100):.2f},{Y(f(xmin+(xmax-xmin)*i/100)):.2f}' for i in range(101))
  out+=f'<polyline points="{points}" stroke="{GOLD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  for x in ([-1,1] if cubic else [1,2,3]):
   y=f(x);out+=circle(X(x),Y(y),9,'#ffffff')+circle(X(x),Y(y),4.5)+text(X(x),Y(y)+(-16 if y>=0 else 27),f'({x}; {y})',15,INK,'middle')
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
  out='<path d="M143 24 Q110 24 110 58 L110 217 Q110 258 151 258 L358 258 Q398 258 398 217 L398 66 Q398 24 355 24 Z" fill="url(#cell)" stroke="#719266" stroke-width="6"/>'
  out+='<path d="M144 37 Q124 37 124 63 L124 213 Q124 243 153 243 L354 243 Q383 243 383 212 L383 68 Q383 38 354 38 Z" fill="#edf4df" stroke="#a2bc8a" stroke-width="2"/>'
  out+='<path d="M239 61 Q205 67 210 104 L207 170 Q210 205 242 211 L321 209 Q354 203 352 168 L348 101 Q345 67 316 62 Z" fill="url(#vacuole)" stroke="#85b0bd" stroke-width="2"/>'
  out+=circle(167,100,27,'url(#nucleus)')+circle(173,104,10,'#7b6997')
  for x,y in [(147,182),(354,218),(345,49)]:
   out+=f'<ellipse cx="{x}" cy="{y}" rx="20" ry="11" transform="rotate(-24 {x} {y})" fill="url(#forest)" stroke="#426e44" stroke-width="1.4"/>'
   for j in [-7,0,7]:out+=line(x+j,y-4,x+j+1,y+4,'#b1d48b',1.5)
  for x,y in [(157,142),(178,178),(177,221),(280,230),(367,144),(192,54)]:out+=circle(x,y,2.2,'#8da785')
  for x,y,X,Y,label in [(110,52,24,52,'Cell wall'),(383,60,440,60,'Membrane'),(345,120,440,120,'Vacuole'),(140,100,24,130,'Nucleus'),(355,218,440,240,'Chloroplast')]:out+=line(x,y,X,Y,GOLD,1.5)+text(X,Y-9,label,14)
  out+=text(320,297,'Simplified photosynthetic plant cell · not to scale',16,INK,'middle')
 elif id=='lisc-11':
  out=circle(90,76,45,'url(#sun)')+text(90,82,'Light',16,INK,'middle')
  for a in range(0,360,45):
   r=math.radians(a);out+=line(90+53*math.cos(r),76+53*math.sin(r),90+61*math.cos(r),76+61*math.sin(r),'#d6ae59',2)
  out+=arrow(155,90,252,125,GOLD)
  out+='<path d="M254 208 Q215 72 396 60 Q419 205 270 224 Z" fill="url(#leaf)" stroke="#3f775a" stroke-width="2"/>'
  out+=line(258,223,380,80,'#bcd7a7',2)
  for x,y in [(280,193),(304,165),(328,137)]:out+=line(x,y,x-27,y-48,'#bcd7a7',1)+line(x,y,x+54,y-9,'#bcd7a7',1)
  out+=rect(278,135,102,48,'#eff5dc')+text(329,154,'Leaf',16,INK,'middle')+text(329,174,'chloroplasts',12,INK,'middle')
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
 elif id=='bst-12':
  cells=[('S','STRENGTHS',['Strong maths authors','Clear brand identity'],PALE),('W','WEAKNESSES',['Slow delivery process','Limited cash reserves'],'#f4ecd9'),('O','OPPORTUNITIES',['Digital demand'],PALE),('T','THREATS',['New competitors'],'#f4ecd9')]
  for i,(letter,label,items,color) in enumerate(cells):
   x=15+(i%2)*312;y=8+(i//2)*148
   out+=rect(x,y,298,137,color)+text(x+19,y+42,letter,33,GREEN if i%2==0 else GOLD,weight='bold')+text(x+67,y+33,label,11,weight='bold')
   out+=text(x+67,y+53,'INTERNAL' if i<2 else 'EXTERNAL',9,'#62756a')
   for j,item in enumerate(items):out+=text(x+20,y+86+j*23,item,15)
 elif id=='eco-12':
  out=text(25,21,'MPC = 0.8  /  each round spends 80% of the previous one',15)
  for i,v in enumerate([100,80,64]):
   x=44+i*177;h=v*1.65
   out+=rect(x,247-h,123,h,GREEN if i==0 else BLUE if i==1 else GOLD)+text(x+61,232-h,f'R{v}',21,INK,'middle')+text(x+61,274,f'Round {i+1}',14,INK,'middle')
   if i<2:out+=arrow(x+134,150,x+164,150,GOLD)
  out+=line(25,247,596,247,'#8da597',1)+text(320,310,'All rounds: total spending approaches R500',18,INK,'middle')
 elif id=='tour-11':
  values=[('Transport',600),('Room',800),('Activity × 2',240),('Meals × 2',300)]
  for i,(label,v) in enumerate(values):
   y=16+i*65;out+=text(20,y+23,label,16)+rect(160,y+3,v/800*325,30,GREEN if i%2==0 else BLUE)+text(510,y+25,f'R{v}',17)
  out+=rect(15,281,610,44,PALE)+text(35,309,'Total for two people',16)+text(602,311,'R1 940',23,INK,'end','bold')
 elif p['code']=='hist':
  rows=p['visual']['rows'];step=310/len(rows)
  out=line(130,22,130,296,'#b2c4b4',2)
  for i,(date,event,context) in enumerate(rows):
   y=8+i*step;out+=text(111,y+27,date,12,INK,'end')+circle(130,y+22,9,'#fffefa')+circle(130,y+22,4,GOLD)
   out+=rect(155,y,465,step-7,'#ffffff')+text(175,y+26,event,16)+lines(175,y+49,context,50,13,'#576d62')
 elif id=='tour-10':
  icons=['TRANSPORT','STAY','EXPLORE','DINE']
  for i,row in enumerate(p['visual']['rows']):
   x=15+(i%2)*315;y=8+(i//2)*158
   out+=rect(x,y,300,142,'#ffffff')+circle(x+29,y+30,16,'url(#forest)')+text(x+29,y+35,str(i+1),14,'#ffffff','middle')+text(x+56,y+32,icons[i],11,GOLD,weight='bold')
   out+=text(x+19,y+72,row[0],17)+text(x+19,y+99,row[2],14,'#576d62')
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
  for i,row in enumerate(p['visual']['rows']):
   y=7+i*103;out+=rect(15,y,610,94,'#ffffff')
   out+=text(33,y+30,'“',39,GOLD)+lines(57,y+35,row[0],19,18)
   out+=line(244,y+18,244,y+76,'#d9d3c3',1)+arrow(258,y+47,285,y+47,GOLD)
   out+=lines(305,y+29,row[1],31,16)+lines(305,y+64,row[2],37,13,color='#576d62')
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
DEFS='''<defs>
 <linearGradient id="paper" x2="0" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#f2f3ec"/></linearGradient>
 <linearGradient id="forest" x2=".8" y2="1"><stop stop-color="#3d806b"/><stop offset="1" stop-color="#183f35"/></linearGradient>
 <linearGradient id="sage" x2=".8" y2="1"><stop stop-color="#f0f5ee"/><stop offset="1" stop-color="#e0eadd"/></linearGradient>
 <linearGradient id="brass" x2="1" y2="1"><stop stop-color="#c7a36a"/><stop offset="1" stop-color="#98703b"/></linearGradient>
 <linearGradient id="cell" x2="1" y2="1"><stop stop-color="#d7e6bf"/><stop offset="1" stop-color="#9cb887"/></linearGradient>
 <linearGradient id="vacuole" x2="1" y2="1"><stop stop-color="#e7f3ed"/><stop offset="1" stop-color="#b7d6df"/></linearGradient>
 <radialGradient id="nucleus" cx=".3" cy=".25"><stop stop-color="#e0d7ec"/><stop offset="1" stop-color="#a596bd"/></radialGradient>
 <radialGradient id="sun"><stop stop-color="#faf0c6"/><stop offset="1" stop-color="#e6c77c"/></radialGradient>
 <linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#9dbb74"/><stop offset=".6" stop-color="#5f9361"/><stop offset="1" stop-color="#35694f"/></linearGradient>
 <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#8fa491" opacity=".18"/></pattern>
</defs>'''
for p in json.loads((ROOT/'src/data/study-packs.json').read_text()):
 description=p['visual']['title']+'. '+'. '.join(', '.join(row) for row in p['visual']['rows'])
 caption,description=DESCRIPTIONS.get(p['id'],(p['visual']['title'],description))
 heading=lines(40,79,p['title'],width=52,size=23)
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1040" viewBox="0 0 800 520" role="img" aria-labelledby="title desc"><title id="title">{esc(p['title'])}</title><desc id="desc">{esc(description)}</desc>{DEFS}
 <rect width="800" height="520" rx="0" fill="url(#paper)"/>
 <path d="M600 0H800V190C718 156 654 86 600 0Z" fill="#e4ebe1" opacity=".55"/>
 <rect x="20" y="122" width="760" height="350" rx="18" fill="url(#dots)"/>
 <g font-family="DejaVu Sans,Arial,sans-serif">
 {text(40,36,p['subject'].upper()+'  /  GRADE '+str(p['grade']),11,'#52675e',weight='bold')}
 <path d="M704 24H760M732 10V38" stroke="#ae8a50" stroke-width="1" opacity=".65"/>
 <g font-family="Georgia,DejaVu Serif,serif">{heading}</g>
 <path d="M40 116H760" stroke="#c6d0c0" stroke-width=".8"/>
 <g transform="translate(64 132) scale(1.05)">{draw(p)}</g>
 <path d="M40 484H760" stroke="#c6d0c0" stroke-width=".8"/>
 {text(40,506,'SMARTBRIDGE FET',10,'#52675e',weight='bold')}
 {text(760,506,'VISUAL NOTES  /  '+p['id'].upper(),10,'#52675e','end')}
 </g></svg>'''
 (OUT/(p['id']+'.svg')).write_text(svg)
 version=hashlib.sha256(svg.encode()).hexdigest()[:12]
 manifest[p['id']]={'src':'/study-visuals/'+p['id']+'.svg?v='+version,'alt':description,'caption':caption}
(ROOT/'src/data/study-visuals.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(manifest)} explanatory SVGs')
