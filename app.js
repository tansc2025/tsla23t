let FINNHUB_KEY = localStorage.getItem("finnhub_key") || "";

const CHARTS = {};

function destroyChart(id){
  if(CHARTS[id]){
    CHARTS[id].destroy();
  }
}

function updateClock(){
  const now = new Date();

  document.getElementById("clock").innerText =
    now.toLocaleTimeString();
}

setInterval(updateClock,1000);

function genData(days=120){

  let price = 200;

  const data = [];

  for(let i=0;i<days;i++){

    const move = (Math.random()-0.5)*8;

    const open = price;
    const close = open + move;

    const high = Math.max(open,close)+Math.random()*3;
    const low = Math.min(open,close)-Math.random()*3;

    data.push({
      date:i,
      open,
      high,
      low,
      close,
      volume:Math.random()*1000000
    });

    price = close;
  }

  return data;
}

async function fetchFinnhub(symbol,days){

  if(!FINNHUB_KEY){
    return genData(days);
  }

  try{

    const to = Math.floor(Date.now()/1000);

    const from =
      to - (days*86400);

    const url =
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;

    const res = await fetch(url);

    const json = await res.json();

    if(json.s !== "ok"){
      throw new Error("No data");
    }

    return json.c.map((close,i)=>({
      date:i,
      open:json.o[i],
      high:json.h[i],
      low:json.l[i],
      close:json.c[i],
      volume:json.v[i]
    }));

  }catch(err){

    console.log(err);

    return genData(days);
  }
}

function sma(arr,n){

  return arr.map((_,i)=>{

    if(i<n) return null;

    let sum = 0;

    for(let j=i-n;j<i;j++){
      sum += arr[j];
    }

    return sum/n;
  });
}

function rsi(closes,n=14){

  const out = [];

  let gains = 0;
  let losses = 0;

  for(let i=1;i<closes.length;i++){

    const diff = closes[i]-closes[i-1];

    gains += diff>0 ? diff : 0;
    losses += diff<0 ? -diff : 0;

    if(i<n){
      out.push(null);
      continue;
    }

    const rs = gains/(losses || 1);

    out.push(
      100 - (100/(1+rs))
    );
  }

  out.unshift(null);

  return out;
}

function detectSignal(data){

  const closes = data.map(d=>d.close);

  const ma20 = sma(closes,20);

  const last = closes.length-1;

  const r = rsi(closes)[last];

  if(closes[last] > ma20[last] && r < 70){
    return "BUY";
  }

  if(closes[last] < ma20[last] && r > 30){
    return "SELL";
  }

  return "HOLD";
}

function renderMainChart(data){

  destroyChart("main");

  const ctx =
    document.getElementById("mainChart");

  const closes =
    data.map(d=>d.close);

  CHARTS.main =
    new Chart(ctx,{
      type:"line",
      data:{
        labels:data.map(d=>d.date),
        datasets:[
          {
            data:closes,
            borderColor:"#f5c842",
            borderWidth:2,
            pointRadius:0
          }
        ]
      }
    });
}

function renderRSI(data){

  destroyChart("rsi");

  const ctx =
    document.getElementById("rsiChart");

  const closes =
    data.map(d=>d.close);

  CHARTS.rsi =
    new Chart(ctx,{
      type:"line",
      data:{
        labels:data.map(d=>d.date),
        datasets:[
          {
            data:rsi(closes),
            borderColor:"#00b0ff",
            borderWidth:2,
            pointRadius:0
          }
        ]
      }
    });
}

function renderMACD(data){

  destroyChart("macd");

  const ctx =
    document.getElementById("macdChart");

  const closes =
    data.map(d=>d.close);

  const fast = sma(closes,12);
  const slow = sma(closes,26);

  const macd =
    closes.map((_,i)=>
      (fast[i]||0)-(slow[i]||0)
    );

  CHARTS.macd =
    new Chart(ctx,{
      type:"bar",
      data:{
        labels:data.map(d=>d.date),
        datasets:[
          {
            data:macd,
            backgroundColor:"#00e676"
          }
        ]
      }
    });
}

async function runScan(){

  const symbol =
    document.getElementById("stock").value;

  const days =
    parseInt(
      document.getElementById("days").value
    );

  document.getElementById("signalBox")
    .innerHTML =
    "Loading...";

  const data =
    await fetchFinnhub(symbol,days);

  const signal =
    detectSignal(data);

  let cls = "hold";

  if(signal==="BUY") cls="buy";
  if(signal==="SELL") cls="sell";

  document.getElementById("signalBox")
    .innerHTML =
    `
      <h2>${symbol}</h2>
      <p class="${cls}">
        Signal: ${signal}
      </p>
    `;

  renderMainChart(data);
  renderRSI(data);
  renderMACD(data);
}

document
.getElementById("enterBtn")
.addEventListener("click",()=>{

  FINNHUB_KEY =
    document
      .getElementById("apikey")
      .value
      .trim();

  localStorage.setItem(
    "finnhub_key",
    FINNHUB_KEY
  );

  document
    .getElementById("splash")
    .style.display="none";

  document
    .getElementById("app")
    .style.display="block";

  runScan();
});

document
.getElementById("scanBtn")
.addEventListener("click",runScan);
