import json,sys,time,os,re,urllib.request,datetime
T = os.environ.get("MP_API_TICKET", "")
if not T:
    raise SystemExit("Falta MP_API_TICKET. Exportala antes de correr esto (docs/09: los secretos van solo en el entorno, nunca en el codigo).")
KW=r"contactabilidad|whatsapp|confirmaci[oó]n de (citas|horas)|agendamiento|recordatorio|chatbot|gesti[oó]n documental|documental|activos? fijos?|inventario|acreditaci[oó]n|calidad y seguridad|eventos adversos|sistema inform[aá]tico|plataforma (web|digital)|software|sistema de gesti[oó]n|sistemas? de informaci[oó]n|aplicaci[oó]n|desarrollo (de )?(sistema|web|plataforma)"
NEG=r"impresor|computador|licencia|reactivo|toner|tóner|c[aá]mara|telefon|internet|switch|hardware|equipos|curso|capacitaci[oó]n|asesor|consultor|encuesta|levantamiento|inventario (f[ií]sico|de bienes)|regularizaci"
start=datetime.date.fromisoformat(sys.argv[1]); end=datetime.date.fromisoformat(sys.argv[2])
out=json.load(open("hist_hits.json")) if os.path.exists("hist_hits.json") else {}
done=set(json.load(open("hist_done.json"))) if os.path.exists("hist_done.json") else set()
d=start; n=0
while d<=end:
    key=d.isoformat()
    if key not in done:
        url=f"https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha={d.strftime('%d%m%Y')}&estado=adjudicada&ticket={T}"
        data=None
        for i in range(3):
            try:
                with urllib.request.urlopen(url,timeout=90) as r: data=json.loads(r.read().decode())
            except Exception as e: data={"error":str(e)}
            if "Listado" in data: break
            time.sleep(6+4*i)
        if "Listado" in data:
            for l in data["Listado"]:
                nm=(l.get("Nombre") or ""); nl=nm.lower()
                if re.search(KW,nl) and not re.search(NEG,nl):
                    out[l["CodigoExterno"]]=dict(nombre=nm,fecha_adj=key,estado=l.get("CodigoEstado"))
            done.add(key); n+=1
        time.sleep(3.5)
    d+=datetime.timedelta(days=1)
json.dump(out,open("hist_hits.json","w"),ensure_ascii=False,indent=1); json.dump(sorted(done),open("hist_done.json","w"))
print(f"días procesados ahora: {n} | días acumulados: {len(done)} | coincidencias acumuladas: {len(out)}")
