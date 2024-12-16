const API_KEY = 'ctg88p9r01qn78n3a7i0ctg88p9r01qn78n3a7ig'; // Inserisci la tua API key di Finnhub qui!!!
const SYMBOL = 'XAU'; // Simbolo di XAU (Oro) per Finnhub
const TIME_PERIOD = 20; // Periodo per le medie mobili e RSI
const TAKE_PROFIT_PERCENT = 0.02; // 2% take profit
const STOP_LOSS_PERCENT = 0.01; // 1% stop loss
const UPDATE_INTERVAL = 120000; // intervallo di aggiornamento in millisecondi (es. 120000 = 2 minuti)

let chart; // Variabile globale per il grafico

// Funzione per ottenere i dati da Finnhub
async function getGoldData() {
    console.log("getGoldData: Inizio della funzione");
    const now = Math.floor(Date.now() / 1000); // Timestamp attuale in secondi
    const past = now - (86400 * 365); // Un anno fa
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${SYMBOL}&resolution=D&from=${past}&to=${now}&token=${API_KEY}`;

    try {
        console.log("getGoldData: Eseguo la chiamata API a: ", url);
        const response = await fetch(url);
        if (!response.ok) {
            console.error("getGoldData: Errore HTTP nella chiamata API:", response.status, response.statusText);
             return null;
         }
        const data = await response.json();
        console.log("getGoldData: Dati API ricevuti:", data);
        if (!data) {
            console.error("getGoldData: Errore: i dati API sono nulli.");
              return null;
        }
        if (Object.keys(data).length === 0) {
            console.error("getGoldData: Errore: i dati API sono vuoti.");
             return null;
       }
         if (!data.c){
           console.error("getGoldData: Errore: i dati API non hanno la chiave 'c'");
          return null;
        }
        console.log("getGoldData: Chiamata API riuscita.");
       return data;

    } catch (error) {
        console.error("getGoldData: Errore nel recupero dei dati da Finnhub:", error);
        return null;
    }
}

// Funzione per calcolare le medie mobili
function calculateSMA(data, timePeriod) {
    if(!data || !data.c) {
          console.error("calculateSMA: Errore: i dati necessari per l'SMA non sono stati restituiti dall'API");
           return null;
    }
  const dailyPrices = data.c.slice().reverse();
    if (dailyPrices.length < timePeriod) {
       console.warn("calculateSMA: Avviso: Dati insufficienti per calcolare l'SMA.");
        return null;
   }
   let sum = 0;
     for (let i = dailyPrices.length - timePeriod; i < dailyPrices.length; i++) {
         sum += dailyPrices[i];
     }
  const sma = sum / timePeriod;
  return sma;
}

// Funzione per calcolare l'RSI
function calculateRSI(data, timePeriod) {
     if(!data || !data.c){
         console.error("calculateRSI: Errore: i dati necessari per l'RSI non sono stati restituiti dall'API");
        return null;
      }
     const dailyPrices = data.c.slice().reverse();
    if (dailyPrices.length < timePeriod + 1) {
        console.warn("calculateRSI: Avviso: Dati insufficienti per calcolare l'RSI.");
         return null;
      }

     let gains = [];
     let losses = [];

     for (let i=1; i < dailyPrices.length; i++){
        const change = dailyPrices[i] - dailyPrices[i - 1];
        if (change > 0){
             gains.push(change);
           losses.push(0)
       } else{
            losses.push(Math.abs(change));
            gains.push(0);
        }
    }
    if (gains.length < timePeriod) {
        console.warn("calculateRSI: Avviso: Dati insufficienti per calcolare l'RSI.");
        return null;
    }
     const avgGain = gains.slice(gains.length - timePeriod).reduce((a,b) => a + b, 0) / timePeriod;
   const avgLoss = losses.slice(losses.length - timePeriod).reduce((a,b) => a + b, 0) / timePeriod;

  if(avgLoss === 0) {
      console.warn("calculateRSI: Avviso: avgLoss = 0, RSI = 100.");
       return 100;
 }
  const rs = avgGain / avgLoss;
    const rsi = 100 - (100/(1+rs));
  return rsi;
}

// Funzione per calcolare le bande di Bollinger
function calculateBollingerBands(data, timePeriod) {
    if(!data || !data.c) {
       console.error("calculateBollingerBands: Errore: i dati necessari per le bande di Bollinger non sono stati restituiti dall'API");
         return null;
     }
   const dailyPrices = data.c.slice().reverse();
    if (dailyPrices.length < timePeriod) {
      console.warn("calculateBollingerBands: Avviso: Dati insufficienti per calcolare le bande di Bollinger.");
       return null;
    }

   const sma = calculateSMA(data, timePeriod);
    const stdDev = Math.sqrt(
    dailyPrices
        .slice(dailyPrices.length - timePeriod)
       .reduce((a, b) => a + Math.pow(b - sma, 2), 0) / timePeriod
   );

     return {
        upper: sma + stdDev * 2,
      lower: sma - stdDev * 2,
     };
}

// Funzione per calcolare il MACD
function calculateMACD(data) {
    if(!data || !data.c) {
        console.error("calculateMACD: Errore: i dati necessari per il MACD non sono stati restituiti dall'API");
        return null;
    }
     const dailyPrices = data.c.slice().reverse();
    if (dailyPrices.length < 26) {
         console.warn("calculateMACD: Avviso: Dati insufficienti per calcolare il MACD.");
          return null;
    }
  const ema12 = calculateEMA(dailyPrices, 12);
  const ema26 = calculateEMA(dailyPrices, 26);
     const macd = ema12 - ema26;
  const signalLine = calculateEMA(dailyPrices.slice(dailyPrices.length - 9),9);

    return { macd, signal: signalLine};
}

// Funzione per calcolare l'EMA
function calculateEMA(prices, timePeriod) {
    if(prices.length < timePeriod) return null;
    let ema = 0;
    let k = 2 / (timePeriod + 1);
    for (let i=0; i<prices.length; i++){
      ema = (prices[i] * k) + (ema * (1 - k))
  }
  return ema;
}

// Funzione per simulare l'analisi fondamentale con un indicatore di sentiment
function simulateFundamentalAnalysis(){
   const sentiment =  Math.random() < 0.6 ? "positivo" : "negativo";
    return sentiment;
}

// Funzione per generare i segnali
function generateSignal(price, sma, rsi, macd, fundamentalSentiment, bollingerBands) {
    if (!price || !sma || !rsi || !macd) {
         return null;
    }
  let signal = null;
     if (price > sma && rsi < 70 && fundamentalSentiment == "positivo" && macd.macd > macd.signal && price < bollingerBands.upper) {
       signal = { type: 'Acquista', entryPrice: price,
          stopLoss: price * (1 - STOP_LOSS_PERCENT),
            takeProfit: price * (1 + TAKE_PROFIT_PERCENT) };
   } else if (price < sma && rsi > 30 && fundamentalSentiment == "negativo" && macd.macd < macd.signal && price > bollingerBands.lower ) {
         signal = { type: 'Vendi', entryPrice: price,
            stopLoss: price * (1 + STOP_LOSS_PERCENT),
            takeProfit: price * (1 - TAKE_PROFIT_PERCENT)};
   }
    return signal;
}

// Funzione per visualizzare il grafico
async function aggiornaGrafico(data, signal) {
  console.log("aggiornaGrafico: Inizio della funzione.");
    if(!data || !data.c) {
         console.error("aggiornaGrafico: Errore: i dati necessari per visualizzare il grafico non sono stati restituiti dall'API");
         return null;
   }
    const dailyPrices = data.c.slice().reverse();
 const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) {
       console.error("aggiornaGrafico: Errore: Elemento con ID 'chartContainer' non trovato.");
       return;
    }
    console.log("aggiornaGrafico: Recupero dell'elemento 'chartContainer' riuscito.");

   if (chart) {
      console.log("aggiornaGrafico: Rimuovo il grafico precedente.");
     chart.remove(); // Rimuove il grafico precedente.
   }
      console.log("aggiornaGrafico: Creo il grafico.");
    chart = LightweightCharts.createChart(chartContainer, { width: 600, height: 300});
  const lineSeries = chart.addLineSeries();
  const chartData = dailyPrices.map((price, index) => ({ time: index+1, value: price}));
   lineSeries.setData(chartData);
    console.log("aggiornaGrafico: Aggiungo i livelli di supporto e resistenza.");
   //Aggiungi i livelli di supporto e resistenza
    const supportLevels = [
      calculateSupport(dailyPrices) - 0.0015, //esempio
       calculateSupport(dailyPrices),
        calculateSupport(dailyPrices) + 0.0015, //esempio
   ]
   const resistanceLevels = [
     calculateResistance(dailyPrices)- 0.0015,//esempio
      calculateResistance(dailyPrices),
       calculateResistance(dailyPrices)+ 0.0015//esempio
  ]
    supportLevels.forEach(level =>{
        const supportLine = chart.addLineSeries({color:'green', lineWidth: 1})
       supportLine.setData(dailyPrices.map((value,index) =>({time: index+1, value: level})))
   });
    resistanceLevels.forEach(level =>{
        const resistanceLine = chart.addLineSeries({color:'red', lineWidth: 1})
          resistanceLine.setData(dailyPrices.map((value,index) =>({time: index+1, value: level})))
  });

//  Aggiungi le bande di Bollinger
 const bollingerBands = calculateBollingerBands(data, TIME_PERIOD);
    if(bollingerBands){
        console.log("aggiornaGrafico: Aggiungo le bande di bollinger.");
      const upperBollingerLine = chart.addLineSeries({color:'blue', lineWidth: 1})
     upperBollingerLine.setData(dailyPrices.map((value,index) =>({time:index+1, value: bollingerBands.upper})))

     const lowerBollingerLine = chart.addLineSeries({color:'blue', lineWidth: 1})
        lowerBollingerLine.setData(dailyPrices.map((value,index) =>({time:index+1, value: bollingerBands.lower})))
  }

    //aggiungi RSI
 const rsi = calculateRSI(data, TIME_PERIOD)
    if (rsi){
        console.log("aggiornaGrafico: Aggiungo l'RSI.");
         const rsiSeries = chart.addLineSeries({ color: 'orange', lineWidth: 1 });
         rsiSeries.setData(dailyPrices.map((value, index) => ({ time: index + 1, value: rsi})));
      }

//Aggiungi Macd
const macd = calculateMACD(data);
    if(macd){
       console.log("aggiornaGrafico: Aggiungo il MACD.");
        const macdSeries = chart.addLineSeries({ color: 'purple', lineWidth: 1 });
          macdSeries.setData(dailyPrices.map((value, index) => ({ time: index+1, value: macd.macd})));

        const signalSeries = chart.addLineSeries({ color: 'gray', lineWidth: 1 });
          signalSeries.setData(dailyPrices.map((value, index) => ({ time: index+1, value: macd.signal})));
    }
  //Aggiungi le ritracciamenti di fibonacci
 const fiboLevels = calculateFibonacciRetracements(dailyPrices)
      console.log("aggiornaGrafico: Aggiungo i ritracciamenti di Fibonacci.");
        fiboLevels.forEach(level =>{
         const fiboLine = chart.addLineSeries({color:'grey', lineWidth: 0.5})
        fiboLine.setData(dailyPrices.map((value,index) =>({time:index+1, value: level})))
    });

 if(signal){
       console.log("aggiornaGrafico: Aggiungo i markers al grafico.");
      const lastPriceIndex = dailyPrices.length -1;
    const markers = [
         { time: lastPriceIndex+1 , position: 'aboveBar', color: signal.type ==="Acquista" ? 'green' : 'red', shape:  signal.type === 'Acquista' ? 'arrowUp' : 'arrowDown'  ,text: signal.type},
          { time: lastPriceIndex+1, position: 'belowBar', color: 'green', shape:'circle', text: "TP", textVisible:false, y: signal.takeProfit},
            {time: lastPriceIndex + 1, position: 'belowBar', color: 'red', shape: 'circle',text: "SL",textVisible:false, y: signal.stopLoss  }
      ]
     lineSeries.setMarkers(markers)
  }
  console.log("aggiornaGrafico: Grafico aggiornato con successo.");
}

//Funzione per calcolare i ritracciamenti di Fibonacci
function calculateFibonacciRetracements(prices) {
     const minPrice = Math.min(...prices);
   const maxPrice = Math.max(...prices);
    const diff = maxPrice - minPrice;
   return [
       maxPrice,
        maxPrice - diff * 0.236,
        maxPrice - diff * 0.382,
        maxPrice - diff * 0.5,
        maxPrice - diff * 0.618,
      minPrice
    ];
}
function calculateSupport(prices) {
    return Math.min(...prices) //minimo valore del periodo
}
function calculateResistance(prices){
    return Math.max(...prices); //massimo valore del periodo
}


// Funzione per aggiornare la pagina dei segnali
async function aggiornaSegnaliPagina() {
  const data = await getGoldData();
      if(!data) {
          console.error("aggiornaSegnaliPagina: Errore: dati API nulli, impossibile aggiornare la pagina.");
          const segnaliContainer = document.getElementById('segnali-container');
           if(segnaliContainer){
              segnaliContainer.innerHTML = "<p>Nessun segnale generato al momento (errore API)</p>";
         }
           return;
    }
 const dailyPrices = data.c.slice().reverse();
   const sma = calculateSMA(data, TIME_PERIOD);
 const rsi = calculateRSI(data, TIME_PERIOD);
    const bollingerBands = calculateBollingerBands(data, TIME_PERIOD);
  const macd = calculateMACD(data)
  const fundamentalSentiment = simulateFundamentalAnalysis();
    const price = dailyPrices[dailyPrices.length - 1];
  const signal = generateSignal(price, sma, rsi, macd, fundamentalSentiment, bollingerBands);
  const segnaliContainer = document.getElementById('segnali-container');

    if (segnaliContainer && signal) {
       let html = '<table class="segnali-table">';
       html += '<thead><tr><th>Tipo</th><th>Prezzo Ingresso</th><th>Stop Loss</th><th>Take Profit</th></tr></thead>';
      html += '<tbody>';
        html += `<tr><td>${signal.type}</td><td>${signal.entryPrice.toFixed(2)}</td><td>${signal.stopLoss.toFixed(2)}</td><td>${signal.takeProfit.toFixed(2)}</td></tr>`;
      html += '</tbody></table>';
      segnaliContainer.innerHTML = html;
  } else if (segnaliContainer){
       segnaliContainer.innerHTML = "<p>Nessun segnale generato al momento</p>";
   }
    aggiornaGrafico(data, signal);
}


// Aggiorna i segnali al caricamento della pagina e imposta l'intervallo per gli aggiornamenti futuri
document.addEventListener('DOMContentLoaded', () => {
    aggiornaSegnaliPagina();
     setInterval(aggiornaSegnaliPagina, UPDATE_INTERVAL); // Aggiorna ogni UPDATE_INTERVAL millisecondi
});
