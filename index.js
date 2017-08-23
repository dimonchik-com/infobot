const TelegramBot = require('node-telegram-bot-api');
var moment = require('moment-timezone');
var request= require('request');

// replace the value below with the Telegram token you receive from @BotFather


fs = require('fs');
var buffer = fs.readFileSync('token.txt');
const token=buffer.toString();

var chatId;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/help/, (msg, match) => {
    chatId = msg.chat.id;
    var text=`/weather - get forecast on 12 hours\n/exchange - get current exchange rate\n/fuel - get fuel current price\n/all - get full information`;
    bot.sendMessage(chatId, text);
});

bot.onText(/\/weather/, (msg, match) => {
    chatId = msg.chat.id;
    set_task([
        httpGet('https://api.darksky.net/forecast/0bdd834b29db535e643826c7813375ca/49.427281,32.0969799?lang=en&extend=hourly&units=si')
    ], chatId,["weather"]);
});

bot.onText(/\/exchange/, (msg, match) => {
    chatId = msg.chat.id;
    set_task([
        httpGet('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5')
    ], chatId,["exchange"]);
});

bot.onText(/\/fuel/, (msg, match) => {
    chatId = msg.chat.id;
    set_task([
        httpGet(`https://finance.i.ua/fuel/25/`),
        httpGet(`http://vseazs.com/`),
    ], chatId,["fuel"]);
});

bot.onText(/\/all/, (msg, match) => {
    chatId = msg.chat.id;
    set_task([
        httpGet('https://api.darksky.net/forecast/0bdd834b29db535e643826c7813375ca/49.427281,32.0969799?lang=en&extend=hourly&units=si'),
        httpGet(`https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5`),
        httpGet(`https://finance.i.ua/fuel/25/`),
        httpGet(`http://vseazs.com/`),
    ], chatId,["exchange","fuel","weather"]);
});

bot.on('message', (msg) => {
    chatId = msg.chat.id;
});

var flag=1;
setInterval(function () {
    var time=moment(new Date().getTime()).tz("Europe/Kiev").format("HH:mm");
    var time_react="08:00";
    // console.log(time+" "+time_react+" "+flag+" "+chatId)
    if(time==time_react && flag && chatId) {
        flag=0;
        set_task([
            httpGet('https://api.darksky.net/forecast/0bdd834b29db535e643826c7813375ca/49.427281,32.0969799?lang=en&extend=hourly&units=si'),
            httpGet(`https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5`),
            httpGet(`https://finance.i.ua/fuel/25/`),
            httpGet(`http://vseazs.com/`),
        ], chatId,["exchange","fuel","weather"]);
    } else if(time!=time_react) {
        flag=1;
    }
}, 5000);

var dash="------------------------------";

function set_task(arr, chatId, tasks) {
    Promise.all(arr).then(results => {

        var text="";

        tasks.map((task)=>{
            switch(task) {
                case "weather":
                    var weather=JSON.parse(results[0]);
                    text+=format_weather(weather);
                    break;
                case "exchange":
                    var exchange_rate=JSON.parse((results.length>=2)?results[1]:results[0]);
                    text+=format_exchange(exchange_rate);
                    break;
                case "fuel":
                    text+=format_fuel(results);
                    break;
            }
        });

        bot.sendMessage(chatId, text);
    });
}

function format_exchange(exchange_rate) {
    var text="";
    exchange_rate.map((element)=>{
        if(element.ccy=="USD" || element.ccy=="BTC") {
            text += `${element.ccy}, buy: ${parseFloat(element.buy).toFixed(2)}\n         sale: ${parseFloat(element.sale).toFixed(2)}\n`;
        }
    });
    return text;
}

function format_fuel(results) {
    var text="";

    var gasoline=(results.length>=4)?results[2]:results[0];
    var a95=gasoline.match(/<th>Средняя<\/th><td>(.*?)<\/td><td>(.*?)<\/td>/ig,"$3");
    a95=a95[0].replace(/(.*?)<td>(.*?)<\/td><td>(.*?)>(\d+\.\d+)(.*)(.*)/i,"$4");


    var gas=(results.length>=4)?results[3]:results[1];
    gas=gas.match(/PriceID8(.*?)<p>(\d\d.\d\d)/ig);
    gas=gas[0].replace(/(.*)PriceID8(.*?)<p>(\d\d.\d\d)(.*)/,"$3");

    text+=`${dash}\nGasoline 95: - ${a95}\n`;
    text+=`Gas: - ${gas}\n`;
    return text;
}

function format_weather(weather) {
    var text="";
    for(var i=0; i<12; i++) {
        if(i==0) {
            text+=`${dash}\n- `;
        } else {
            text+="\n\n- "
        }
        text+=moment(new Date(weather.hourly["data"][i].time*1000)).tz("Europe/Kiev").format("HH:mm");
        text+="\nsummary: "+weather.hourly["data"][i].summary;
        text+="\ntemperature: "+weather.hourly["data"][i].temperature+" C";
        text+="\nwindSpeed: "+weather.hourly["data"][i].windSpeed;
    }
    return text;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (!error) {
                resolve(body);
            } else {
                console.log(error);
                reject(error);
            }
        });
    });
}
