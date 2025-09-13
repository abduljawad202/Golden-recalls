import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAllSources } from "./aggregator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

let CACHE = { items: [], ts: 0 };
async function refresh(){
  try{
    const items = await fetchAllSources();
    CACHE = { items, ts: Date.now() };
    console.log("Refreshed", items.length, "items at", new Date().toISOString());
  }catch(e){ console.error("Refresh failed", e); }
}
await refresh();
setInterval(refresh, 10*60*1000);

app.get("/api/recalls", (req,res)=>{
  res.json({ count: CACHE.items.length, items: CACHE.items, refreshedAt: new Date(CACHE.ts).toISOString() });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req,res)=>{
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("VIP Recall running on port", PORT));