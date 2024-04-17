import express, { Request, Response, response } from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import Server from 'ws';
import fs from 'fs';
import path from 'path'

import dotenv from 'dotenv';
dotenv.config();


import twilio from 'twilio';

import { createOpenAPIChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate } from "langchain/prompts";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));




// For Twilio
// const accountSid = process.env.TWILIO_ACCOUNT_SID;;
// const authToken = process.env.TWILIO_AUTH_TOKEN; 

// const client = twilio(accountSid, authToken);

const server = http.createServer(app);
// const wss = new Server({ server });

// wss.on('connection', (ws) => {
//   console.log('Connected to WebSocket');

//   ws.on('message', (message) => {
//     console.log('Received message', message);
//   });

//   ws.on('close', () => {
//     console.log('Disconnected from WebSocket');
//   });
// });

// // Endpoint to handle Twilio webhook for incoming calls
// app.post('/voice', (req: Request, res: Response) => {
//   const twiml = new twilio.twiml.VoiceResponse();

//   twiml.say('Connecting to WebSocket server.');

//   // Connect the voice call to your WebSocket server
//   twiml.connect({
//     action: '/handle_connect_action'
//   }).stream({
//     url: 'wss://your-websocket-server-url/media' 
//   });

//   res.type('text/xml');
//   res.send(twiml.toString());
// });

app.get('/parse', async (req: Request, res: Response) => {
  // 0613 for function calling
  const chatModel = new ChatOpenAI({ model: "gpt-4", temperature: 0.4, openAIApiKey: process.env.OPENAI_API_KEY });
  const specPath = path.join(process.cwd(), 'openapi.yaml');
  const spec = await fs.promises.readFile(specPath, 'utf8')
  let apiResult = ''
  try {
   
    const chain = await createOpenAPIChain(spec);
    const result = await chain.run(req.query.question);
  
    apiResult = JSON.stringify(result);
    // res.send(result)
  }
  catch (err) {
      console.log(err)
    }
  
    const messages = [
      new SystemMessage(`
        You are a freight broker assistant. Your job is to answer queries of the client to answer them in a natural manner in English. Make the client be at ease by answering as an assistant based in the USA would, with relevant filler words.

        Verify their shipment's MC number and if asked get an estimate on the delivery time.

        The client asked: ${req.query.question}
        Here's the api response: ${apiResult}

        Let the client know about the api response, if the api response is not viable, ask the client for MC number.

      `),
    ];
    const result = await chatModel.invoke(messages);
    res.send(result.lc_kwargs.content)

});


// test routes

app.get('/verifyMCNumber', async (req: Request, res: Response) => {
  console.log("Verifying...");

  const MCNumber = req.query.MCNumber
  if(MCNumber === '123'){
    res.status(200).send({from:'Austin, TX',to:'Dallas, TX'})
  }else{
    res.status(400).send({from:null,to:null})
  }
})

app.get('/findEstimatedTime', async (req: Request, res: Response) => {
  console.log("Finding...");

  const MCNumber = req.query.MCNumber
  if(MCNumber == '123'){
    res.status(200).send({time:'7AM, 17th May, 2024'})
  }else{
    res.status(400).send({time:null})
  }  
})


const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
