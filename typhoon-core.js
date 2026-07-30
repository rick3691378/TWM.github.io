/* =========================================================================
   TWCore — shared logic for CWA typhoon dashboard pages
   Used by both index.html (full map + info) and info.html (info-only widget)
   ========================================================================= */
(function(global){

const WARNING_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-001?Authorization=CWA-80A71402-253A-4E26-8688-93693ED70011&format=JSON';
const TRACK_URL   = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-005?Authorization=CWA-80A71402-253A-4E26-8688-93693ED70011&format=JSON';

/* ---- 22 counties/cities, aliases must include the exact COUNTYNAME string
   used by the taiwan-atlas topojson (traditional "臺") plus common "台" form
   and the bare name without 縣/市, so text-matching against CWA bulletins
   (which mix both forms) is robust. ---- */
const COUNTIES = [
  { id:'keelung',   name:'基隆市', aliases:['基隆市','基隆'] },
  { id:'taipei',    name:'臺北市', aliases:['臺北市','台北市','臺北','台北'] },
  { id:'newtaipei', name:'新北市', aliases:['新北市','新北'] },
  { id:'taoyuan',   name:'桃園市', aliases:['桃園市','桃園'] },
  { id:'hsinchuC',  name:'新竹縣', aliases:['新竹縣'] },
  { id:'hsinchuS',  name:'新竹市', aliases:['新竹市'] },
  { id:'miaoli',    name:'苗栗縣', aliases:['苗栗縣','苗栗'] },
  { id:'taichung',  name:'臺中市', aliases:['臺中市','台中市','臺中','台中'] },
  { id:'changhua',  name:'彰化縣', aliases:['彰化縣','彰化'] },
  { id:'nantou',    name:'南投縣', aliases:['南投縣','南投'] },
  { id:'yunlin',    name:'雲林縣', aliases:['雲林縣','雲林'] },
  { id:'chiayiC',   name:'嘉義縣', aliases:['嘉義縣'] },
  { id:'chiayiS',   name:'嘉義市', aliases:['嘉義市'] },
  { id:'tainan',    name:'臺南市', aliases:['臺南市','台南市','臺南','台南'] },
  { id:'kaohsiung', name:'高雄市', aliases:['高雄市','高雄'] },
  { id:'pingtung',  name:'屏東縣', aliases:['屏東縣','屏東'] },
  { id:'yilan',     name:'宜蘭縣', aliases:['宜蘭縣','宜蘭'] },
  { id:'hualien',   name:'花蓮縣', aliases:['花蓮縣','花蓮'] },
  { id:'taitung',   name:'臺東縣', aliases:['臺東縣','台東縣','臺東','台東'] },
  { id:'penghu',    name:'澎湖縣', aliases:['澎湖縣','澎湖'] },
  { id:'kinmen',    name:'金門縣', aliases:['金門縣','金門'] },
  { id:'lienchiang',name:'連江縣', aliases:['連江縣','馬祖'] },
];

/* ---- sea warning zones, with an angular position (clockwise degrees,
   0 = due north) used to draw a compass wedge around the real map ---- */
const SEAZONES = [
  { id:'north',   label:'北部海面',     aliases:['北部海面'],                   a0:340, a1:20  },
  { id:'ne',      label:'東北部海面',   aliases:['東北部海面'],                 a0:20,  a1:65  },
  { id:'east',    label:'東部海面',     aliases:['東部海面'],                   a0:65,  a1:110 },
  { id:'se',      label:'東南部海面',   aliases:['東南部海面'],                 a0:110, a1:150 },
  { id:'south',   label:'南部海面',     aliases:['南部海面'],                   a0:150, a1:195 },
  { id:'bashi',   label:'巴士海峽',     aliases:['巴士海峽'],                   a0:195, a1:225 },
  { id:'sw',      label:'西南部海面',   aliases:['西南部海面'],                 a0:225, a1:255 },
  { id:'straitS', label:'臺灣海峽南部', aliases:['臺灣海峽南部','台灣海峽南部'], a0:255, a1:285 },
  { id:'strait',  label:'臺灣海峽',     aliases:['臺灣海峽','台灣海峽'],         a0:285, a1:340 },
];

/* =========================================================================
   generic schema-agnostic deep search helpers
   (CWA's exact JSON field names aren't guaranteed to stay stable, so we
   search by partial key match rather than hardcoding one exact path)
   ========================================================================= */
function deepCollect(obj, cb, seen){
  seen = seen || new Set();
  if(!obj || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);
  for(const k in obj){
    const v = obj[k];
    cb(k, v, obj);
    if(v && typeof v === 'object') deepCollect(v, cb, seen);
  }
}
function findValuesByKey(obj, needleLower){
  const out = [];
  deepCollect(obj, (k,v)=>{
    if(typeof k === 'string' && k.toLowerCase().includes(needleLower)){
      if(v === null || typeof v !== 'object') out.push(v);
    }
  });
  return out;
}
function firstNumber(obj, needleLower){
  for(const v of findValuesByKey(obj, needleLower)){
    const n = parseFloat(v);
    if(!isNaN(n)) return n;
  }
  return null;
}
function firstString(obj, needleLower){
  for(const v of findValuesByKey(obj, needleLower)){
    if(typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}
/* try several candidate substrings in priority order, first hit wins — the
   exact CWA field name for a given value isn't guaranteed, so this trades a
   little false-positive risk for much better recall */
function firstNumberAny(obj, candidates){
  for(const c of candidates){
    const n = firstNumber(obj, c);
    if(n!=null) return n;
  }
  return null;
}
function firstStringAny(obj, candidates){
  for(const c of candidates){
    const s = firstString(obj, c);
    if(s!=null) return s;
  }
  return null;
}
function findArraysByKey(obj, needleLower){
  const out = [];
  deepCollect(obj, (k,v)=>{
    if(typeof k === 'string' && k.toLowerCase().includes(needleLower)){
      if(Array.isArray(v)) out.push(v);
      else if(v && typeof v === 'object') out.push([v]);
    }
  });
  return out;
}
function parseCoordinate(fixObj){
  if(!fixObj) return null;
  let raw = fixObj.coordinate || fixObj.Coordinate;
  if(typeof raw === 'string' && raw.includes(',')){
    const [lon,lat] = raw.split(',').map(s=>parseFloat(s.trim()));
    if(!isNaN(lon) && !isNaN(lat)) return {lat,lon};
  }
  const lat = firstNumber(fixObj,'lat');
  const lon = firstNumber(fixObj,'lon') ?? firstNumber(fixObj,'lng');
  if(lat!=null && lon!=null) return {lat,lon};
  return null;
}

/* =========================================================================
   fetch (with CORS-proxy fallbacks)
   CWA's opendata API doesn't reliably send Access-Control-Allow-Origin, so
   a direct browser fetch can be blocked by CORS. corsproxy.io alone used to
   be the only fallback here, but it's a free third-party service that goes
   down / rate-limits fairly often — when it does, the whole dashboard shows
   "連線失敗" with no other recourse. Try direct fetch first, then walk
   through several independent proxy services in turn so a single proxy
   outage doesn't take the whole app down with it.
   ========================================================================= */
const CORS_PROXIES = [
  url => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
  url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
  url => 'https://thingproxy.freeboard.io/fetch/' + url,
];
async function fetchJSON(url){
  let lastErr = null;
  try{
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(err){ lastErr = err; }
  for(const buildProxyUrl of CORS_PROXIES){
    try{
      const res = await fetch(buildProxyUrl(url), { cache:'no-store' });
      if(!res.ok){ lastErr = new Error('HTTP '+res.status+' ('+buildProxyUrl('').slice(0,30)+'…)'); continue; }
      return await res.json();
    }catch(err){ lastErr = err; }
  }
  throw lastErr || new Error('all fetch attempts failed');
}

/* =========================================================================
   cyclone list extraction — for the W-C0034-005 track/info dataset, which
   nests the real cyclone array two levels deep: records.TropicalCyclones
   (a wrapper object) .TropicalCyclone (the actual array). deepCollect visits
   the wrapper key before recursing into it and finding the real array, so
   the LAST match (not the first) is the specific one we want — taking the
   first would return a single-item list containing the wrapper object
   itself, which silently breaks multi-storm handling.
   (W-C0034-001, the warning bulletin dataset, has a different CAP shape
   entirely with no tropicalCyclone array — see getWarningInfoList below.)
   ========================================================================= */
function getCycloneList(data){
  const arrs = findArraysByKey(data, 'tropicalcyclone');
  if(arrs.length) return arrs[arrs.length-1].filter(x=>x && typeof x==='object');
  return [];
}
function cycloneChineseName(cyclone){
  return firstString(cyclone,'cwatyphoonname') || firstString(cyclone,'chinesename') || firstString(cyclone,'typhoonname') || null;
}
function cycloneEnglishName(cyclone){
  return firstString(cyclone,'englishname') || firstString(cyclone,'tyname') || null;
}
function cycloneKey(cyclone){
  // best-effort stable key to match the same storm across the warning + track datasets
  return cycloneChineseName(cyclone) || cycloneEnglishName(cyclone) || firstString(cyclone,'cwatdno') || firstString(cyclone,'datasetsequenceno') || JSON.stringify(cyclone).slice(0,40);
}

/* =========================================================================
   land / sea warning-area detection for one cyclone entry (text-scan
   heuristic: CWA's warning bulletin only lists areas that ARE under
   warning, so presence of the exact county/sea-zone name is a reliable
   signal within a single cyclone's warning block)
   ========================================================================= */
function warningAreasForCyclone(cycloneWarningObj){
  const text = JSON.stringify(cycloneWarningObj || {});
  const activeLand = new Set();
  const activeSea = new Set();
  COUNTIES.forEach(c=>{ if(c.aliases.some(a=>text.includes(a))) activeLand.add(c.id); });
  SEAZONES.forEach(z=>{ if(z.aliases.some(a=>text.includes(a))) activeSea.add(z.id); });
  const bulletinNo = firstString(cycloneWarningObj,'bulletinno') || firstString(cycloneWarningObj,'wpsn') || firstString(cycloneWarningObj,'reportno');
  const issueTime = firstString(cycloneWarningObj,'senttime') || firstString(cycloneWarningObj,'issuetime') || firstString(cycloneWarningObj,'sent');
  return { activeLand, activeSea, bulletinNo, issueTime };
}

/* =========================================================================
   fix (position report) extraction
   ========================================================================= */
function extractLatestFix(cyclone){
  if(!cyclone) return null;
  let analysisFix = null;
  deepCollect(cyclone, (k,v)=>{
    if(k.toLowerCase()==='analysisdata' && v){
      const fx = findArraysByKey(v,'fix');
      if(fx.length) analysisFix = fx[0];
    }
  });
  const arr = analysisFix || findArraysByKey(cyclone,'fix')[0];
  if(!arr || !arr.length) return null;
  return arr[arr.length-1];
}
function extractForecastFixes(cyclone){
  if(!cyclone) return [];
  let fArr = null;
  deepCollect(cyclone, (k,v)=>{
    if(k.toLowerCase()==='forecastdata' && v){
      const fx = findArraysByKey(v,'fix');
      if(fx.length) fArr = fx[0];
    }
  });
  return fArr || [];
}

/* =========================================================================
   circle radius (7-level / 10-level average storm radius) extraction
   NOTE: in W-C0034-005 the radius value is nested one level down —
   fix.Circle15ms = { Radius: "220", QuadrantRadii: {...} } — it is NOT a
   bare number on the fix object itself. firstNumber()/firstNumberAny()
   intentionally skip object values (see findValuesByKey above), so a plain
   "circle15ms" key search matches the key but then discards it because its
   value is an object. This opens that object first, then reads .Radius.
   ========================================================================= */
function findChildObjectByExactKey(obj, keyLower){
  let found = null;
  deepCollect(obj, (k,v)=>{
    if(found) return;
    if(typeof k === 'string' && k.toLowerCase()===keyLower && v && typeof v==='object' && !Array.isArray(v)){
      found = v;
    }
  });
  return found;
}
function extractRadiusKm(fixObj, circleKeyLower){
  if(!fixObj) return null;
  const circleObj = findChildObjectByExactKey(fixObj, circleKeyLower);
  if(circleObj){
    const r = firstNumber(circleObj, 'radius');
    if(r!=null) return r;
  }
  // fallback in case some alternate/flat schema puts the number directly on a key of this name
  return firstNumber(fixObj, circleKeyLower);
}

/* =========================================================================
   W-C0034-001 (颱風警報) parsing — CAP bulletin format, structurally
   unrelated to W-C0034-005. records.info is a list of CAP alert entries;
   there is no tropicalCyclone array here at all. The numeric/text fields
   we care about live inside description["typhoon-info"][0].section as
   {title, value} pairs (not as plain object keys), so they need dedicated
   lookups rather than the generic firstString/firstNumber key search.
   ========================================================================= */
function getWarningInfoList(warningJson){
  const info = warningJson && warningJson.records && warningJson.records.info;
  if(Array.isArray(info)) return info;
  if(info) return [info];
  return [];
}
// finds {title,value} inside any "section" array anywhere in the object —
// e.g. findSectionValue(info, '警報報數') -> "12"
function findSectionValue(infoObj, titleText){
  let result = null;
  deepCollect(infoObj, (k,v)=>{
    if(result!=null) return;
    if(k==='section' && Array.isArray(v)){
      const item = v.find(it=>it && it.title===titleText && 'value' in it);
      if(item) result = item.value;
    }
  });
  return result;
}
// finds the classification text nested at .../"颱風資訊"/analysis.scale: [{value,lang}]
function findSectionScale(infoObj){
  let result = null;
  deepCollect(infoObj, (k,v)=>{
    if(result) return;
    if(k==='scale' && Array.isArray(v) && v.length){
      const zh = v.find(it=>it && typeof it.lang==='string' && it.lang.toLowerCase().startsWith('zh'));
      result = ((zh || v[0]).value) || null;
    }
  });
  return result;
}
function warningTyphoonNames(infoObj){
  return {
    zh: firstStringAny(infoObj, ['cwa_typhoon_name','cwatyphoonname']),
    en: firstStringAny(infoObj, ['typhoon_name','typhoonname']),
  };
}
// an "info" record is only a live/active warning if it hasn't been lifted —
// CWA marks the final bulletin with headline "解除颱風警報" and 警報類別=END
function isWarningActive(infoObj){
  if(!infoObj) return false;
  const headline = infoObj.headline || firstStringAny(infoObj,['headline']) || '';
  if(headline.includes('解除')) return false;
  const alertType = findSectionValue(infoObj, '警報類別');
  if(alertType && /^end$/i.test(String(alertType).trim())) return false;
  return true;
}
// match a W-C0034-005 cyclone entry to its W-C0034-001 bulletin (if any) by typhoon name
function findWarningInfoForCyclone(warningInfoList, cyclone){
  if(!warningInfoList || !warningInfoList.length) return null;
  const zh = cycloneChineseName(cyclone);
  const en = cycloneEnglishName(cyclone);
  return warningInfoList.find(info=>{
    const names = warningTyphoonNames(info);
    return (zh && names.zh && names.zh===zh) || (en && names.en && names.en===en);
  }) || null;
}
// land/sea areas under warning, read from the bulletin's own area[] list
// (exact areaDesc match — far more precise than scanning the whole bulletin
// text, which also contains unrelated county names in advisory prose)
function warningAreasFromInfo(infoObj){
  const activeLand = new Set(), activeSea = new Set();
  const areaList = (infoObj && infoObj.area) || [];
  const descs = areaList.map(a=>a && (a.areaDesc || a.AreaDesc)).filter(Boolean);
  COUNTIES.forEach(c=>{ if(c.aliases.some(a=>descs.includes(a))) activeLand.add(c.id); });
  SEAZONES.forEach(z=>{ if(z.aliases.some(a=>descs.includes(a))) activeSea.add(z.id); });
  return { activeLand, activeSea };
}
function warningBulletinMeta(infoObj){
  if(!infoObj) return { bulletinNo:null, issueTime:null, headline:null };
  return {
    bulletinNo: findSectionValue(infoObj,'警報報數'),
    issueTime: infoObj.effective || infoObj.onset || null,
    headline: infoObj.headline || null,
  };
}

/* =========================================================================
   intensity classification (CWA thresholds, m/s near-center max wind)
   used as a fallback when the API doesn't include a ready-made label
   ========================================================================= */
function classifyIntensity(windMS){
  if(windMS==null || isNaN(windMS)) return null;
  if(windMS >= 51.0) return '強烈颱風';
  if(windMS >= 32.7) return '中度颱風';
  if(windMS >= 17.2) return '輕度颱風';
  return '熱帶低氣壓';
}

/* =========================================================================
   formatting
   ========================================================================= */
function fmtTime(s){
  try{
    const d = new Date(s);
    if(isNaN(d.getTime())) return s;
    const p = n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }catch(e){ return s; }
}
function fmtZhDateTime(s){
  try{
    const d = new Date(s);
    if(isNaN(d.getTime())) return s;
    const mm = d.getMinutes();
    return `${d.getMonth()+1}月${d.getDate()}日${d.getHours()}時` + (mm ? `${String(mm).padStart(2,'0')}分` : '');
  }catch(e){ return s; }
}
function fmtLatLon(coord){
  if(!coord) return '座標未知';
  return `北緯${coord.lat.toFixed(1)}度　東經${coord.lon.toFixed(1)}度`;
}

global.TWCore = {
  WARNING_URL, TRACK_URL,
  COUNTIES, SEAZONES,
  fetchJSON, getCycloneList,
  cycloneChineseName, cycloneEnglishName, cycloneKey,
  warningAreasForCyclone, extractLatestFix, extractForecastFixes,
  extractRadiusKm,
  getWarningInfoList, findSectionValue, findSectionScale, warningTyphoonNames,
  isWarningActive, findWarningInfoForCyclone, warningAreasFromInfo, warningBulletinMeta,
  classifyIntensity, fmtTime, fmtZhDateTime, fmtLatLon,
  firstNumber, firstString, firstNumberAny, firstStringAny,
  findArraysByKey, parseCoordinate, deepCollect,
};

})(window);
