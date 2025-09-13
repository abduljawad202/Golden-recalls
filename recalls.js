import { fetchAllSources } from "../../aggregator.js";

export const handler = async () => {
  try{
    const items = await fetchAllSources();
    return { statusCode:200, headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}, body: JSON.stringify({count:items.length, items}) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({error:String(e)}) };
  }
};