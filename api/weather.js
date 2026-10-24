// V15.1 — Independent CWA Shenkang weather proxy. Set CWA_API_KEY in Vercel.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=300');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const key=process.env.CWA_API_KEY;
 if(!key)return res.status(503).json({error:'weather_not_configured'});
 try{
  const u=new URL('https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001');
  u.searchParams.set('Authorization',key);u.searchParams.set('format','JSON');u.searchParams.set('StationId','C0F9I0');
  const response=await fetch(u,{signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error('upstream_'+response.status);
  const j=await response.json();let a=j?.records?.Station||j?.records?.station||j?.records?.location||[];
  if(!Array.isArray(a))a=[a];const st=a.find(x=>String(x?.StationId||x?.StationID||x?.stationId||'').toUpperCase()==='C0F9I0');
  if(!st)throw Error('station_missing');
  const w=st.WeatherElement||st.weatherElement||{},now=w.Now||w.now||{};
  const pick=(o,ks)=>{for(const k of ks){let v=o?.[k];if(v!==undefined&&v!==null&&v!=='')return typeof v==='object'?(v.Value??v.value??null):v;}return null;};
  const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;};
  const observedAt=st.ObsTime?.DateTime||st.obsTime?.DateTime||st.DateTime||null;
  const age=observedAt?Date.now()-Date.parse(observedAt):Infinity;
  const temperature=num(pick(w,['AirTemperature','TEMP','Temperature']));
  if(!Number.isFinite(age)||age< -600000||age>10800000||temperature===null)return res.status(503).json({error:'weather_stale_or_incomplete'});
  return res.status(200).json({stationId:'C0F9I0',observedAt,temperature,rainfall:num(pick(now,['Precipitation','H_24R','Rainfall'])??pick(w,['Precipitation','H_24R','Rainfall'])),windSpeed:num(pick(w,['WindSpeed','WDSD'])),weather:String(pick(w,['Weather','WeatherPhenomenon'])||''),source:'中央氣象署神岡站'});
 }catch(e){return res.status(502).json({error:'weather_unavailable'});}
};