//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
var FBMessenger = require('fb-messenger');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var webpages = require('./webpages')



// ...



var messenger = new FBMessenger(process.env.PAGE_ACCESS_TOKEN );
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<footer id=\"gWidget\"></footer><script src=\"https://widget.glitch.me/widget.min.js\"></script></body></html>";
var google = require('googleapis');
//var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var googleAuth = require('google-auth-library');

const ClientId = process.env.GClientID;
const ClientSecret = process.env.GClientSecret;
const RedirectionUrl = process.env.HERE + "/oauthCallback";

var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = process.env.MONGODB_URI;
var mongoconnection;
var Agenda = require('agenda');

var kids = ["Sophie", "Skylar", "Storm"];
var me = ["Sebas"];
var insession = false;
var endofsession = false;
var reports = []

var reporttemplate = {name : "kids", type : "kids" ,questions : [{ "Humeur" : ["Ok", "Verdrietig", "Boos", "Lief"]}, {"Stress" : ["Geen", "Beetje" , "Veel"]}]}
var reportme = {name : "me", type : "me", questions : [{ "Mood" : ["Happy", "Sad", "Angry", "Loving"]}, {"Food" : ["Normal", "Lots" , "None"]} , {"Stress" : ["None", "Some" , "High"]}, {Remarks : ["None"]}]}
var medicine ={name : "R", type: "me", questions :[{"Amount" : [0.5 , 1 , 1.5, 2, 2.5]}]};



reports.push(reporttemplate);
reports.push(reportme);

//var today = new Date();

function formatDate(date) {
  var hours = date.getHours() + 2;
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ':' + seconds;
  return date.getDate() + "-" + (date.getMonth()+1) + "-" + date.getFullYear() + " " + strTime;
}

var d = new Date();
var today = formatDate(d);


var currentsession = {"kid" : "", date : today}

var currentreport = { template : "", kidreports : []};

var kidindex = 0;
var templateindex = 0;
var payloadt = [];



// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to MongoDB server");
  //findConnections(db, allgood);
  mongoconnection = db;
  //addRows();
 // db.close();
});



var store = new MongoDBStore(
      {
        uri: process.env.MONGODB_URI,
        collection: 'QuipBotSessions'
      });
 
    // Catch errors 
    store.on('error', function(error) {
      //assert.ifError(error);
      //assert.ok(false);
      console.log(error);
    });

// The rest of the code implements the routes for our Express server.
let app = express();

var mongoConnectionString = url;

var agenda = new Agenda({db: {
      address: url,
      collection: 'jobs'
    }});

agenda.on('ready', function() {
 

  agenda.define('greet the world', function(job, done) {
  console.log(job.attrs.data.time, 'hello world!');
  done();

  });

//agenda.schedule('in 10 seconds', 'greet the world', {time: new Date()});
agenda.start();

console.log('Wait 10 seconds...');


});



agenda.define('send reminder', function(job, done) {
  var data = job.attrs.data;
  sendTextMessage(data.to, data.text);
  console.log('send reminder');
  done()
});

app.use(require('express-session')({
      secret: process.env.COOKIE_SECRET,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week 
      },
      store: store,
      // Boilerplate options, see: 
      // * https://www.npmjs.com/package/express-session#resave 
      // * https://www.npmjs.com/package/express-session#saveuninitialized 
      resave: true,
      saveUninitialized: true
    }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/birds', webpages)



function findReport(reports) { 
    return reports.name === this;
}


function runreport(senderID, reportname){
  var reptemplate = reports.find(findReport, reportname)
  startSession(reptemplate, senderID);
}

function selectReport(senderID){
  console.log('sendreportlist');
  var quickreplies = []
  
var arrayLength = reports.length;
for (var i = 0; i < arrayLength; i++) {
    
  var thispayload = {context : "reportselection", report : reports[i].name}
  var strpay = JSON.stringify(thispayload);   
  var quickreply = 
      {
        "content_type":"text",
        "title": reports[i].name,
        "payload": strpay
      }
  quickreplies.push(quickreply);
    //Do something
}
  
  //console.log(quickreplies);
  messenger.sendQuickRepliesMessage(senderID, "report", quickreplies) 
}

function startSession(template, senderID){
d = new Date();
today = formatDate(d);
  currentreport = { template : template.questions, kidreports : [], reportfor : [], date : today, time : Date.now()};
  insession = true;
  if(template.type == "me"){
    me.forEach(createReport)
  } else {
  kids.forEach(createReport);
  }
  //console.log(currentreport);
  kidindex = 0;
 templateindex = 0;
 askquestion(senderID);   
  
  
}

function createReport(kidname, index){
  //currentreport.kidreports.push({ name : kidname, status : 'new'})
  currentreport.reportfor.push({ name : kidname, status : 'new'})
}

//startSession(reporttemplate);
//askquestion('')

function findkid(kid) { 
    return kid.name === this;
}


function updatereport(payload){
  currentreport.kidreports.push({kid : payload.kid, question : payload.question, answer : payload.answer});
  if(insession == false){
    console.log('last answer');
    console.log(currentreport);
  }
}



function askquestion(senderID){
  //console.log(currentreport)
  console.log('askquestion');
  if(insession == false){return;}
  var kid = currentreport.reportfor[kidindex].name;
  var question = currentreport.template[templateindex];
  var qlist = Object.keys(question); 
  //console.log(qlist[0])
  
  var answers = question[qlist[0]];
  
  //console.log(answers)
  
  
  //var payload = {kid : kid, }
  var quickreplies = []
  
var arrayLength = answers.length;
for (var i = 0; i < arrayLength; i++) {
    
  var thispayload = {kid : kid, question : qlist[0], answer : answers[i], context : "report"}
  var strpay = JSON.stringify(thispayload);   
  var quickreply = 
      {
        "content_type":"text",
        "title": answers[i],
        "payload": strpay
      }
  quickreplies.push(quickreply);
    //Do something
}
  
  //console.log(quickreplies);
  messenger.sendQuickRepliesMessage(senderID, kid + ' ' + qlist[0], quickreplies) 
  //kidindex = kidindex + 1;
  //console.log(currentreport.template.length);
  if(currentreport.template.length == (templateindex + 1)){
    console.log('end of kid ' + kidindex + 'kids length ' + kids.length);
    templateindex = 0;
    
    if(currentreport.reportfor.length == (kidindex + 1)){
      console.log('end of kids');
      kidindex = 0;
      templateindex = 0;
      //lastquestion = true;
      insession = false;
      endofsession = true;
      console.log('end report');
      
      //return;
    } else {
      //templateindex = 0;
   kidindex = kidindex + 1;
   console.log('kidindex ' + kidindex); 
    }
  }
  else {
   console.log('prep for next question');
    templateindex = templateindex + 1;
 } 
}


// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  //console.log(req.session);
  var url = getAuthUrl();
  res.writeHead(200, {'Content-Type': 'text/html'});  
  res.write(`
        &lt;h1&gt;Authentication using google oAuth&lt;/h1&gt;
        <a href="${url}">Login</a>
    `)
  
  //
  //res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  //console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        //console.log(event);
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          //console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});


// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickreply = message.quick_reply;
  
  if(quickreply){
    var payload = JSON.parse(quickreply.payload);
    //console.log(payload);
    
    switch(payload.context){
      case 'reportselection':
        runreport(senderID, payload.report)
        break;
        
      case 'report':
        console.log('in session: ' + insession);
        
        updatereport(payload);
        
        if(endofsession){
          uploadreport(senderID);
          endofsession = false;
        } else {
        
        askquestion(senderID);
        }
         }
    
  }
  
  if (messageText && !quickreply) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    
    
    
    
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID);
        break;

      case 'report':
        selectReport(senderID);
        break;
        
      default:
        var happy= '\u23F3'
        //messenger.sendTextMessage(senderID, 'fbmes ' + happy);
        uploadevent(senderID, messageText);
        
     //   messenger.sendQuickRepliesMessage(senderID, null, quickreplies) 
        //messenger.sendButtonsMessage(senderID, 'I like buttons', buttons); // Sends a buttons message
        
        sendTextMessage(senderID, 'Aan dagboek toegevoegd');
        //askquestion(senderID);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  switch(payload){
    case "taker":
      startSession(medicine, senderID);
    break;
    case "checkr":
      replyCheck(senderID);
      break;
    case "reportkids":
      startSession(reporttemplate, senderID);
      break;
      
                }
  
  if(payload.startsWith('gemeen')){
    
    uploadevent(senderID, payload)
    
  }
  
  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  //sendTextMessage(senderID, "Postback called");
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}



function callProfileAPI(messageData){

  messageData = {"persistent_menu":[
    {
      "locale":"default",
      "composer_input_disabled":false,
      "call_to_actions":[
        {
          "title":"Report",
          "type":"nested",
          "call_to_actions":[
            {
              "title":"Kids",
              "type":"postback",
              "payload":"reportkids"
            },
            {
              "title":"Gemeen Ok Skylar",
              "type":"postback",
              "payload":"gemeenoksky"
            },
             {
              "title":"Gemeen Slaan Skylar",
              "type":"postback",
              "payload":"gemeenslaansky"
            },
             {
              "title":"Gemeen Ok Sophie",
              "type":"postback",
              "payload":"gemeenoksophie"
            }, {
              "title":"Gemeen Slaan Sophie",
              "type":"postback",
              "payload":"gemeenslaansophie"
            }
          ]
        },
        {
          "title":"R",
          "type":"nested",
          "call_to_actions":[
            {
              "title":"Take",
              "type":"postback",
              "payload":"taker"
            },
            {
              "title":"Check",
              "type":"postback",
              "payload":"checkr"
            }
          ]
        }
      ]
    }
  ]
}
  
  
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully updated menu", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });   
  
  
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

function getOAuthClient () {
  
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(ClientId, ClientSecret, RedirectionUrl);
  return oauth2Client
  //  return new OAuth2(ClientId ,  ClientSecret, RedirectionUrl);
}
 
function getAuthUrl () {
    var oauth2Client = getOAuthClient();
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = ['https://www.googleapis.com/auth/spreadsheets'];

 
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });
 
    return url;
}
 

app.use("/oauthCallback", function (req, res) {
    var oauth2Client = getOAuthClient();
    var session = req.session;
    var code = req.query.code;
  console.log(code);
    oauth2Client.getToken(code, function(err, tokens) {
      // Now tokens contains an access_token and an optional refresh_token. Save them.
      if(!err) {
        oauth2Client.setCredentials(tokens);
        session["tokens"]=tokens;
        //req.session.auth = oauth2Client;
        res.send(`
            &lt;h3&gt;Login successful!!&lt;/h3&gt;
            &lt;a href="/details"&gt;Go to details page&lt;/a&gt;
        `);
      }
      else{
        console.log(err);
        res.send(`
            &lt;h3&gt;Login failed!!&lt;/h3&gt;
        `);
      }
    });
});
 

function uploadreport(senderID){
  var tokens;
  mongoconnection.collection('QuipBotSessions').find({"session.tokens" : {"$exists" : true}}).toArray(function(e, d) {
            console.log('number of sessions ' + d.length);
        
  console.log(d[d.length - 1].session);
   tokens = d[d.length - 1].session.tokens;
    console.log(tokens);
    if(currentreport.reportfor[0].name == 'Sophie'){
     addKidsExcel(tokens, senderID); 
    } else {
    addtoExcel(tokens, senderID);
    }
        });
  
  
  
}

function addtoExcel(tokens, senderID){
    
  var sheets = google.sheets('v4');
  
  //  var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
    
  console.log(currentreport);
  if(currentreport.reportfor[0].name == 'Sebas'){
    var values = [[currentreport.date, currentreport.kidreports[0].answer]]
  
  
    var spreadsheetId = process.env.GSHEETID
    var body = {
  range:"Ik!A:B",
  "majorDimension": "ROWS",
  "values": values
}
    
    
    sheets.spreadsheets.values.append({
  auth: oauth2Client,
   spreadsheetId: spreadsheetId,
  range:"Ik!A:B",
  valueInputOption: 'USER_ENTERED',
  resource: body,
}, function (err, response) {
  console.log(err)
  console.log(response)
      sendTextMessage(senderID, 'uploaded ' + err);
  agenda.schedule('in 180 minutes', 'send reminder', {to: senderID, text : 'R Time!'});
 //lastTaken(tokens);
});
  
    
    
    
    }
    }

function uploadevent(senderID, event){
  var tokens;
  mongoconnection.collection('QuipBotSessions').find({"session.tokens" : {"$exists" : true}}).toArray(function(e, d) {
            console.log('number of sessions ' + d.length);
        
  console.log(d[d.length - 1].session);
   tokens = d[d.length - 1].session.tokens;
    console.log(tokens);
    
     addEvent(tokens, senderID, event); 
    
        });
  
  
  
}

function addEvent(tokens, senderID, event){
    
  var sheets = google.sheets('v4');
  
  //  var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
    
  console.log(currentreport);
  
    var nu = new Date();
var fnu = formatDate(d);
    var values = [[fnu, event]]
  
  
    var spreadsheetId = process.env.GSHEETID
    var body = {
  range:"Dagboek!A:B",
  "majorDimension": "ROWS",
  "values": values
}
    
    
    sheets.spreadsheets.values.append({
  auth: oauth2Client,
   spreadsheetId: spreadsheetId,
  range:"Dagboek!A:B",
  valueInputOption: 'USER_ENTERED',
  resource: body,
}, function (err, response) {
  console.log(err)
  console.log(response)
      sendTextMessage(senderID, 'uploaded ' + err);
  agenda.schedule('in 180 minutes', 'send reminder', {to: senderID, text : 'R Time!'});
 //lastTaken(tokens);
});
  
    
    
    
    
    }




function addKidsExcel(tokens, senderID){
    
  var sheets = google.sheets('v4');
  
  //  var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
    
  console.log(currentreport);
  if(currentreport.reportfor[0].name == 'Sophie'){
    var values = [["","","",""],
      [currentreport.date, currentreport.kidreports[0].answer, currentreport.kidreports[2].answer, currentreport.kidreports[4].answer],   
    ["", currentreport.kidreports[1].answer, currentreport.kidreports[3].answer, currentreport.kidreports[5].answer]
    ]
  
  
    var spreadsheetId = process.env.GSHEETID
    var body = {
  range:"Kinderen!A:D",
  "majorDimension": "ROWS",
  "values": values
}
    
    
    sheets.spreadsheets.values.append({
  auth: oauth2Client,
   spreadsheetId: spreadsheetId,
  range:"Kinderen!A:D",
  valueInputOption: 'USER_ENTERED',
  resource: body,
}, function (err, response) {
  console.log(err)
  console.log(response)
  sendTextMessage(senderID, 'uploaded ' + err);
  agenda.schedule('in 180 minutes', 'send reminder', {to: senderID, text : 'Kinderen report Time!'});
 //lastTaken(tokens);
});
  
    
    
    
    }
    }


function replyCheck(senderID){
  var tokens;
  mongoconnection.collection('QuipBotSessions').find({"session.tokens" : {"$exists" : true}}).toArray(function(e, d) {
            console.log('number of sessions ' + d.length);
        
  console.log(d[d.length - 1].session);
   tokens = d[d.length - 1].session.tokens;
    console.log(tokens);
    var timedif = lastTaken(tokens, senderID);
    console.log('diff ' + timedif)
    //return timedif;
         
        });
}

var lastTaken = function(tokens, senderID){
  var sheets = google.sheets('v4');
  
  //  var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: process.env.GSHEETID,
    range: 'Ik',
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.values;
    if (rows.length == 0) {
      console.log('No data found.');
    } else {
      console.log('Date, Hoeveel');
      
        var row = rows[rows.length -1];
        // Print columns A and E, which correspond to indices 0 and 4.
        console.log('%s, %s', row[0], row[1]);
      var datetimearray = row[0].split(' ');
      var datearray = datetimearray[0].split('-');
      var timearray = datetimearray[1].split(':');
      var datetimelast = new Date(datearray[2], datearray[1] - 1, datearray[0], timearray[0]-2, timearray[1], timearray[2]);
      console.log('last ' + datetimelast)
      var epochlast = datetimelast.getTime();
      console.log(Date.now());
      console.log(epochlast);
      var diff =  Date.now() - epochlast;
      
      var msec = diff;
var hh = Math.floor(msec / 1000 / 60 / 60);
msec -= hh * 1000 * 60 * 60;
var mm = Math.floor(msec / 1000 / 60);
msec -= mm * 1000 * 60;
var ss = Math.floor(msec / 1000);
msec -= ss * 1000;
      var statustext;
      console.log(typeof hh);
      console.log(row[1]);
      if(hh == 2 && (row[1] == 0.5 || row[1] == 1 || row[1] == 1.5)){
        statustext = ' Ga d\'r voor!';
        console.log('2 of meer');
      } else if(hh == 3 )
      { statustext = ' Ga d\'r voor!';
      console.log('3 uur of meer');
      } else if(hh == 0 || hh == 1)
      {
        statustext = ' Nog even wachten'
      }
      
      
      sendTextMessage(senderID, hh + ' uur ' + mm + ' minuten geleden nam je er ' + row[1] + statustext);
      //agenda.schedule('in 30 seconds', 'send reminder', {to: senderID, text : 'checked 30 seconds ago'});
    }
  });
  
}

function addRows(){
  var tokens;
  mongoconnection.collection('QuipBotSessions').find({"session.tokens" : {"$exists" : true}}).toArray(function(e, d) {
            console.log('number of sessions ' + d.length);
        
  console.log(d[d.length - 1].session);
   tokens = d[d.length - 1].session.tokens;
    console.log(tokens);
    spread(tokens);
         
        });
  
  
  
    };

  
  function spread(tokens){
    
  var sheets = google.sheets('v4');
  
  //  var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
    
    var spreadsheetId = process.env.GSHEETID
    var body = {
  range:"Kids",
  "majorDimension": "ROWS",
  "values": [
    ["Door", "$15", "2", "3/15/2016"],
    ["Engine", "$100", "1", "3/20/2016"],
  ],
}
    
    
    
 sheets.spreadsheets.values.append({
  auth: oauth2Client,
   spreadsheetId: spreadsheetId,
  range:"Kids",
  valueInputOption: 'USER_ENTERED',
  resource: body,
}, function (err, response) {
  console.log(err)
  console.log(response)
});
    
  
  };



app.use("/details", function (req, res) {
    var sheets = google.sheets('v4');
  
    var tokens =    req.session["tokens"];
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: process.env.GSHEETID,
    range: 'A1:E',
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.values;
    if (rows.length == 0) {
      console.log('No data found.');
    } else {
      console.log('Name, Major:');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        // Print columns A and E, which correspond to indices 0 and 4.
        console.log('%s, %s', row[0], row[4]);
      }
    }
  });

});
callProfileAPI();
// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});
