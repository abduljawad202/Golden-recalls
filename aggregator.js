import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"" });

function normalize({title, source, date, scope="national", reason="", url}){
  return {title: (title||"").trim(), source, date, scope, reason: (reason||"").trim(), url};
}

async function fetchOpenFDA(){
  const url = "https://api.fda.gov/food/enforcement.json?search=report_date:[20240101+TO+*]&limit=100";
  const r = await fetch(url); const j = await r.json();
  if(!j.results) return [];
  return j.results.map(it => normalize({
    title: it.product_description || it.product_type || "FDA Recall",
    source: "FDA",
    date: it.report_date ? `${it.report_date.slice(0,4)}-${it.report_date.slice(4,6)}-${it.report_date.slice(6,8)}` : "",
    scope: (it.country && it.country.toLowerCase()!=="united states") ? "international" : "national",
    reason: it.reason_for_recall || "",
    url: it.more_code_info || `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`
  }));
}

async function fetchRSS(url, source, pick) {
  const r = await fetch(url);
  const xml = await r.text();
  const j = parser.parse(xml);
  const items = j.rss?.channel?.item || j.feed?.entry || [];
  return items.slice(0,100).map(it => pick(it, source));
}

const pickers = {
  FSIS: (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||it.published||Date.now()).toISOString().slice(0,10), scope: "national", url: it.link?.href || it.link }),
  FSA:  (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "national", url: (it.link?.href || it.link) }),
  CFIA: (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "national", url: it.link }),
  FSANZ:(it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "national", url: it.link }),
  MPI:  (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "national", url: it.link }),
  SFA:  (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "international", url: it.link }),
  FSAI: (it, source) => normalize({ title: it.title, source, date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope: "national", url: it.link }),
};

async function fetchRASFF(){
  try{
    const rss = "https://webgate.ec.europa.eu/rasff-window/portal/rss/consumers";
    const r = await fetch(rss);
    if (r.ok) {
      const xml = await r.text(); const j = parser.parse(xml);
      const items = j.rss?.channel?.item || [];
      return items.slice(0,100).map(it => normalize({
        title: it.title, source:"RASFF", date: new Date(it.pubDate||Date.now()).toISOString().slice(0,10), scope:"international", url: it.link
      }));
    }
  }catch(e){}
  try{
    const html = await (await fetch("https://webgate.ec.europa.eu/rasff-window/screen/consumers")).text();
    const itemRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const out=[]; let m;
    while((m=itemRegex.exec(html)) && out.length<50){
      const href=m[1].startsWith('http')?m[1]:"https://webgate.ec.europa.eu"+m[1];
      const title=m[2];
      if(href.includes('/rasff-window/')) out.push(normalize({title, source:"RASFF", date: new Date().toISOString().slice(0,10), scope:"international", url: href}));
    }
    return out;
  }catch(e){ return []; }
}

async function fetchSFDA(){
  try{
    const html = await (await fetch("https://www.sfda.gov.sa/en/warnings")).text();
    const cardRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<span[^>]*>(\d{4}-\d{2}-\d{2})<\/span>/g;
    const out=[]; let m;
    while((m=cardRegex.exec(html)) && out.length<100){
      const href=m[1].startsWith('http')?m[1]:"https://www.sfda.gov.sa"+m[1];
      const title=m[2]; const date=m[3]||new Date().toISOString().slice(0,10);
      out.push(normalize({title, source:"SFDA", date, scope:"national", url: href}));
    }
    if(out.length===0){
      const anchor=/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g; let n;
      while((n=anchor.exec(html)) && out.length<40){
        const href=n[1]; const title=n[2];
        if(/\/warnings\//.test(href)) out.push(normalize({title, source:"SFDA", date:new Date().toISOString().slice(0,10), scope:"national", url: href.startsWith('http')?href:"https://www.sfda.gov.sa"+href}));
      }
    }
    return out;
  }catch(e){ return []; }
}

export async function fetchAllSources(){
  const [fda, fsis, fsa, cfia, fsanz, mpi, sfa, fsai, rasff, sfda] = await Promise.all([
    fetchOpenFDA().catch(()=>[]),
    fetchRSS("https://www.fsis.usda.gov/feeds/recalls.xml","FSIS", pickers.FSIS).catch(()=>[]),
    fetchRSS("https://www.food.gov.uk/rss/food-alerts","FSA", pickers.FSA).catch(()=>[]),
    fetchRSS("https://recalls-rappels.canada.ca/en/rss/food","CFIA", pickers.CFIA).catch(()=>[]),
    fetchRSS("https://www.foodstandards.gov.au/rss/food-recalls","FSANZ", pickers.FSANZ).catch(()=>[]),
    fetchRSS("https://www.mpi.govt.nz/assets/Uploads/rss/food-recalls.xml","MPI", pickers.MPI).catch(()=>[]),
    fetchRSS("https://www.sfa.gov.sg/rss/annual-listing-food-alerts","SFA", pickers.SFA).catch(()=>[]),
    fetchRSS("https://www.fsai.ie/news-and-alerts/food-alerts/rss","FSAI", pickers.FSAI).catch(()=>[]),
    fetchRASFF().catch(()=>[]),
    fetchSFDA().catch(()=>[])
  ]);
  let data = [...fda, ...fsis, ...fsa, ...cfia, ...fsanz, ...mpi, ...sfa, ...fsai, ...rasff, ...sfda];
  const seen=new Set(); data=data.filter(x=>{const k=(x.title||'')+'|'+x.source; if(seen.has(k)) return false; seen.add(k); return true;});
  data.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return data;
}