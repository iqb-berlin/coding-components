#!/usr/bin/env node
const fs = require('fs');
const https = require('node:https');
const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1lY2h0ZWxtIiwic3ViIjo2LCJzdWIyIjowLCJpYXQiOjE3MDAzMDAyMzAsImV4cCI6MTcwMDM4NjYzMH0.SQU5D05b4j0o2PUkeADNbRN1h8A9m7G_g-vxgy00wc8';
const workspaceId = '105';
let data_folder = '.';

const idListRaw = fs.readFileSync(`${data_folder}/id_list.txt`, 'utf8');
const idListLines = idListRaw.split('\n');

idListLines.forEach((idLine: string) => {
  const idMatches = idLine.match( /([0-9]+)/);
  if (idMatches && idMatches.length > 0) {
    const options = require('url').parse( /**String*/ `https://www.iqb-studio.de/api/workspace/${workspaceId}/${idMatches[0]}/scheme` );
    options.rejectUnauthorized = false;
    options.port = 443;
    options.headers = {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json, text/plain, /'
    }
    options.agent = new https.Agent( options );

    https.get( /**Object*/ options, function ( res: { statusCode: any; headers: any; setEncoding: (arg0: string) => void; on: (arg0: string, arg1: (chunk: any) => void) => void; } ) {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: any) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          console.log(`${jsonBody.scheme},`);
        } catch (err) {
          console.log(`${idMatches[0]}: error parsing body`);
          console.error(err);
        }
      })
    } ).on( 'error',function ( e: { message: any; } ) {
      console.error(`problem with request: ${e.message}`);
    } ).end();
  }
})
