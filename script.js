const API_KEY = 'CM210I4ASAM1JF3M'; // Inserisci la tua API key qui!!!
const SYMBOL = 'XAUUSD'; // Simbolo di XAU/USD
const TIME_PERIOD = 5; // Periodo per le medie mobili e RSI
const TAKE_PROFIT_PERCENT = 0.02; // 2% take profit
const STOP_LOSS_PERCENT = 0.01; // 1% stop loss
const UPDATE_INTERVAL = 120000; // intervallo di aggiornamento in millisecondi (es. 120000 = 2 minuti)

let myChart; // Variabile globale per il grafico

// Funzione per ottenere i dati da Alpha Vantage
async function getGoldData() {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=XAUUSD&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
         if (!response.ok) {
            console.error("Errore HTTP nella chiamata API:", response.status, response.statusText);
             return null;
         }
        const data = await response.json();
        console.log("getGoldData: Dati API ricevuti:", data);
         if (!data) {
            console.error("Errore: i dati API sono nulli.");
             return null;
         }
         if (Object.keys(data).length === 0) {
            console.error("Errore: i dati API sono vuoti.");
           return null;
        }
        if (!data["Time Series (Daily)"]){
            console.error("Errore: i dati API non hanno la chiave 'Time Series (Daily)'");
            return null;
        }

      console.log("getGoldData: chiamata riuscita.")

        return data;
    } catch (error) {
         console.error("Errore nel recupero dei dati da Alpha Vantage:", error);
        return null;
    }
}
// Funzione per calcolare le medie mobili
function calculateSMA(data, timePeriod) {
   if(!data || !data["Time Series (Daily)"]) {
      console.error("Errore: i dati necessari per l'SMA non sono stati restituiti dall'API");
      return null;
   }
   const dailyPrices = Object.values(data["Time Series (Daily)"]).map(item => parseFloat(item["4. close"])).reverse();
    if (dailyPrices.length < timePeriod) {
       console.warn("Avviso: Dati insufficienti per calcolare l'SMA.");
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
   if(!data || !data["Time Series (Daily)"]){
      console.error("Errore: i dati necessari per l'RSI non sono stati restituiti dall'API");
        return null;
    }
    const dailyPrices = Object.values(data["Time Series (Daily)"]).map(item => parseFloat(item["4. close"])).reverse();
    if (dailyPrices.length < timePeriod + 1) {
         console.warn("Avviso: Dati insufficienti per calcolare l'RSI.");
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
        console.warn("Avviso: Dati insufficienti per calcolare l'RSI.");
       return null;
   }
    const avgGain = gains.slice(gains.length - timePeriod).reduce((a,b) => a + b, 0) / timePeriod;
   const avgLoss = losses.slice(losses.length - timePeriod).reduce((a,b) => a + b, 0) / timePeriod;

    if(avgLoss === 0) {
        console.warn("Avviso: avgLoss = 0, RSI = 100.");
        return 100;
   }
    const rs = avgGain / avgLoss;
   const rsi = 100 - (100/(1+rs));
   return rsi;
}

//Funzione per simulare l'analisi fondamentale con un indicatore di sentiment
function simulateFundamentalAnalysis(){
    const sentiment =  Math.random() < 0.6 ? "positivo" : "negativo";
    return sentiment;
}

// Funzione per generare i segnali
function generateSignal(price, sma, rsi, fundamentalSentiment) {
   if (!price || !sma || !rsi) {
        return null;
    }
    let signal = null;
       if (price > sma && rsi < 70 && fundamentalSentiment == "positivo") {
         signal = { type: 'Acquista', entryPrice: price,
             stopLoss: price * (1 - STOP_LOSS_PERCENT),
            takeProfit: price * (1 + TAKE_PROFIT_PERCENT) };
        } else if (price < sma && rsi > 30 && fundamentalSentiment == "negativo") {
           signal = { type: 'Vendi', entryPrice: price,
             stopLoss: price * (1 + STOP_LOSS_PERCENT),
              takeProfit: price * (1 - TAKE_PROFIT_PERCENT)};
       }
    return signal;
}

// Funzione per visualizzare il grafico
async function aggiornaGrafico(data, signal) {
     if(!data || !data["Time Series (Daily)"]) {
        console.error("Errore: i dati necessari per visualizzare il grafico non sono stati restituiti dall'API");
          return null;
    }
    const dailyPrices = Object.values(data["Time Series (Daily)"]).map(item => parseFloat(item["4. close"])).reverse();
   const chartData = {
       labels: Array.from({ length: dailyPrices.length }, (_, i) => i + 1), // Etichette asse X (giorni)
       datasets: [{
           label: 'Prezzo XAU/USD',
              data: dailyPrices,
            borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
           }]
   };

   if(signal){
         chartData.datasets[0].pointBackgroundColor = dailyPrices.map((price, index) => {
            if(signal.entryPrice &&  index === dailyPrices.length -1){
               return signal.type ==="Acquista" ? 'green' : 'red'
          } else {
            return 'rgba(0, 0, 0, 0)'
          }
      })

         chartData.datasets[0].pointRadius = dailyPrices.map((price, index) => {
              if (signal.entryPrice && index === dailyPrices.length -1) {
                  return 5
              } else {
                  return 0
            }
        })
        chartData.datasets[0].annotations = [{
          type: 'line',
            xMin: dailyPrices.length - 1,
            xMax: dailyPrices.length - 1,
               yMin: signal.takeProfit,
           yMax: signal.takeProfit,
           borderColor: 'green',
             borderWidth: 2,
              label: {
                 content: 'Take Profit',
                  display: true,
              }
      }, {
          type: 'line',
            xMin: dailyPrices.length - 1,
            xMax: dailyPrices.length - 1,
              yMin: signal.stopLoss,
             yMax: signal.stopLoss,
           borderColor: 'red',
             borderWidth: 2,
             label: {
                content: 'Stop Loss',
                 display: true,
             }
        }]
   }

    const chartConfig = {
      type: 'line',
     data: chartData,
       options: {
          responsive: true,
            plugins: {
                annotation:{
                   annotations: chartData.datasets[0].annotations
                }
            }
        }
  };
 const chartCanvas = document.getElementById("myChart");
    if(chartCanvas){
        if (myChart) {
             myChart.destroy();
         }
         myChart = new Chart(chartCanvas, chartConfig);
   }
}



// Funzione per aggiornare la pagina dei segnali
async function aggiornaSegnaliPagina() {
   const data = await getGoldData();
     if(!data) {
        console.error("Errore: dati API nulli, impossibile aggiornare la pagina.");
       const segnaliContainer = document.getElementById('segnali-container');
       if(segnaliContainer){
             segnaliContainer.innerHTML = "<p>Nessun segnale generato al momento (errore API)</p>";
        }
        return;
    }

  const dailyPrices = Object.values(data["Time Series (Daily)"]).map(item => parseFloat(item["4. close"])).reverse();
    const sma = calculateSMA(data, TIME_PERIOD);
    const rsi = calculateRSI(data, TIME_PERIOD);
  const fundamentalSentiment = simulateFundamentalAnalysis();
   const price = dailyPrices[dailyPrices.length - 1];
    const signal = generateSignal(price, sma, rsi, fundamentalSentiment);
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
