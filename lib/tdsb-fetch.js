const { fetch, EnvHttpProxyAgent } = require('undici');
const { SOURCE_URL } = require('./tdsb');

const connectionFailure = error => {
  const codes=[];
  for(let cause=error;cause;cause=cause.cause){if(cause.code)codes.push(cause.code);if(codes.length>10)break;}
  if(error.name==='TimeoutError'||codes.includes('UND_ERR_CONNECT_TIMEOUT'))return {code:'TIMEOUT',message:'TDSB did not respond in time. Try again shortly.'};
  if(codes.some(code=>['ENOTFOUND','EAI_AGAIN'].includes(code)))return {code:'DNS_ERROR',message:'This computer could not find the TDSB website. Check its internet connection.'};
  if(codes.some(code=>/CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)))return {code:'TLS_ERROR',message:'The secure connection to TDSB could not be verified. Check this computer’s certificate or network settings.'};
  return {code:'CONNECTION_ERROR',message:'This computer could not connect to TDSB. Its network or proxy may be blocking access.'};
};

async function readTdsbHtml() {
  const dispatcher=new EnvHttpProxyAgent();
  try {
    const response=await fetch(SOURCE_URL,{dispatcher,signal:AbortSignal.timeout(12000),
      headers:{'User-Agent':'ParkdaleAthletics/1.0 (school sports schedule viewer)',Accept:'text/html','Cache-Control':'no-cache'}});
    if(!response.ok){
      await response.body?.cancel();
      const message=response.status===403?'TDSB or the network proxy denied access (HTTP 403).':response.status===429?'TDSB is limiting requests (HTTP 429). Wait before trying again.':`TDSB returned HTTP ${response.status}.`;
      throw Object.assign(Error(message),{diagnostic:{code:`HTTP_${response.status}`,message}});
    }
    // Limit response size as it streams instead of buffering an unlimited response.
    let size=0;const chunks=[];
    for await(const chunk of response.body){size+=chunk.length;if(size>5_000_000)throw Object.assign(Error('Response too large'),{diagnostic:{code:'RESPONSE_TOO_LARGE',message:'TDSB returned an unexpectedly large page.'}});chunks.push(Buffer.from(chunk));}
    return Buffer.concat(chunks).toString('utf8');
  }catch(error){
    if(!error.diagnostic)error.diagnostic=connectionFailure(error);
    throw error;
  }finally{await dispatcher.close();}
}
module.exports={readTdsbHtml,connectionFailure};
