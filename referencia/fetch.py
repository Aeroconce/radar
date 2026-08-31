import json,sys,time,os,urllib.request
T = os.environ.get("MP_API_TICKET", "")
if not T:
    raise SystemExit("Falta MP_API_TICKET. Exportala antes de correr esto (docs/09: los secretos van solo en el entorno, nunca en el codigo).")
def get(url,tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url,timeout=60) as r: d=json.loads(r.read().decode("utf-8"))
        except Exception as e:
            d={"error":str(e)}
        if "Listado" in d: return d
        time.sleep(5+3*i)
    return d
codes=[c for c in sys.argv[1:]]
ok=0
for c in codes:
    p=f"det/{c}.json"
    if os.path.exists(p) and '"Listado"' in open(p).read(): ok+=1; continue
    d=get(f"https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo={c}&ticket={T}")
    json.dump(d,open(p,"w"),ensure_ascii=False)
    ok+= "Listado" in d
    time.sleep(3.5)
print(f"detalles OK: {ok}/{len(codes)}")
