import random, itertools
random.seed(4488)
W={"OE":30,"PT":35,"DE":15,"EO":10,"PI":5,"CF":5}
B={ # precio total c/IVA (Anexo 5), plazo Anexo 3
 "Aeroconce":  dict(price=7_378_000, plazo=15),
 "CERO.ai":    dict(price=4_134_060, plazo=14),
 "Innovit":    dict(price=4_760_000, plazo=15),
 "HCP/Keirón": dict(price=2_201_500, plazo=15),
 "AppointEase":dict(price=6_350_000, plazo=15),
 "Poliedro":   dict(price=6_400_000, plazo=20),
}
def de_scores(adm, tramos):
    out={}
    if tramos:
        for b in adm:
            p=B[b]["plazo"]; out[b]=100 if p<=15 else 75 if p<=20 else 50 if p<=25 else 25 if p<=30 else 0
    else:
        ranks=sorted(set(B[b]["plazo"] for b in adm))
        for b in adm:
            r=ranks.index(B[b]["plazo"]); out[b]=[100,75,50][r] if r<3 else 0
    return out
def draw(p): return random.random()<p
def pick(d):
    r=random.random(); acc=0
    for k,v in d.items():
        acc+=v
        if r<acc: return k
    return k
def one():
    strict=draw(0.5); tramos=draw(0.6)
    hcp_tech=draw(0.5); hcp_temeraria=draw(0.2)
    cero_docs=draw(0.35); cero_subsana=draw(0.4)
    adm={}
    adm["Aeroconce"]=draw(0.97)
    adm["CERO.ai"]=cero_docs or cero_subsana
    adm["Innovit"]=draw(0.85)
    adm["HCP/Keirón"]=hcp_tech and not hcp_temeraria
    adm["AppointEase"]=draw(0.8)
    adm["Poliedro"]=draw(0.7)
    A=[b for b in B if adm[b]]
    if not A: return None,None
    minp=min(B[b]["price"] for b in A)
    de=de_scores(A,tramos)
    PT={"Aeroconce":pick({100:0.6,70:0.4}),"CERO.ai":pick({100:0.75,70:0.25}),"Innovit":pick({70:0.45,50:0.45,100:0.1}),
        "HCP/Keirón":pick({100:0.5,70:0.5}),"AppointEase":pick({70:0.5,50:0.5}),"Poliedro":pick({70:0.5,50:0.3,100:0.2})}
    EO={"Aeroconce":0 if strict else 20,"CERO.ai":100,"Innovit":70 if strict else 100,"HCP/Keirón":0 if strict else 100,"AppointEase":0,"Poliedro":0}
    PI={"Aeroconce":100,"CERO.ai":100 if cero_docs else 0,"Innovit":0 if strict else 100,"HCP/Keirón":100,"AppointEase":100,"Poliedro":100}
    CF={b:100 for b in B}; 
    if not cero_docs: CF["CERO.ai"]=50
    S={}
    for b in A:
        S[b]=(minp/B[b]["price"]*W["OE"] + PT[b]/100*W["PT"] + de[b]/100*W["DE"] + EO[b]/100*W["EO"] + PI[b]/100*W["PI"] + CF[b]/100*W["CF"], PT[b], -B[b]["price"], de[b])
    win=max(A,key=lambda b:S[b])
    return win, dict(adm=adm, S={b:round(S[b][0],1) for b in A})
N=200000; wins={b:0 for b in B}; cond={}
for _ in range(N):
    w,info=one()
    if w is None: continue
    wins[w]+=1
    key=(info["adm"]["CERO.ai"],info["adm"]["HCP/Keirón"])
    cond.setdefault(key,{"n":0,"aero":0}); cond[key]["n"]+=1; cond[key]["aero"]+= (w=="Aeroconce")
print("P(ganar) global:"); 
for b,c in sorted(wins.items(), key=lambda kv:-kv[1]): print(f"  {b:12} {c/N*100:5.1f}%")
print("\nP(Aeroconce gana | admisibilidad de CERO.ai, HCP):")
for k,v in sorted(cond.items()): print(f"  CERO.ai {'IN ' if k[0] else 'OUT'} / HCP {'IN ' if k[1] else 'OUT'}: {v['aero']/v['n']*100:5.1f}%  (peso del escenario {v['n']/N*100:4.1f}%)")
# Escenarios deterministas centrales
def det(adm_list, strict=True, tramos=True, PT=None):
    A=adm_list; minp=min(B[b]["price"] for b in A); de=de_scores(A,tramos)
    PT=PT or {"Aeroconce":100,"CERO.ai":100,"Innovit":70,"HCP/Keirón":70,"AppointEase":50,"Poliedro":70}
    EO={"Aeroconce":0 if strict else 20,"CERO.ai":100,"Innovit":70 if strict else 100,"HCP/Keirón":0 if strict else 100,"AppointEase":0,"Poliedro":0}
    PI={"Aeroconce":100,"CERO.ai":0,"Innovit":0 if strict else 100,"HCP/Keirón":100,"AppointEase":100,"Poliedro":100}
    rows=[]
    for b in A:
        oe=minp/B[b]["price"]*30; s=oe+PT[b]*.35+de[b]*.15+EO[b]*.10+PI[b]*.05+5
        rows.append((s,b,oe,PT[b]*.35,de[b]*.15,EO[b]*.1,PI[b]*.05,5))
    rows.sort(reverse=True)
    for r in rows: print(f"  {r[1]:12} {r[0]:5.1f} = OE {r[2]:4.1f} + PT {r[3]:4.1f} + DE {r[4]:5.2f} + EO {r[5]:3.0f} + PI {r[6]:3.0f} + CF {r[7]:.0f}")
print("\nEscenario 1 — todos admisibles (salvo FLAQUER), comisión estricta, DE por tramos:"); det(list(B))
print("\nEscenario 2 — HCP inadmisible (sin propuesta técnica):"); det([b for b in B if b!="HCP/Keirón"])
print("\nEscenario 3 — HCP y CERO.ai inadmisibles:"); det([b for b in B if b not in ("HCP/Keirón","CERO.ai")])
print("\nEscenario 3b — igual, comisión laxa (EO/PI lenientes):"); det([b for b in B if b not in ("HCP/Keirón","CERO.ai")], strict=False)
print("\nEscenario 3c — igual que 3, pero Innovit PT=50 por propuesta genérica:"); det([b for b in B if b not in ("HCP/Keirón","CERO.ai")], PT={"Aeroconce":100,"Innovit":50,"AppointEase":50,"Poliedro":70})
