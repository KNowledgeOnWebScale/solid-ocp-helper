import fetch from 'node-fetch';
import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import urljoin from 'url-join';
/*
We took most of the code in this file literally from
https://github.com/CommunitySolidServer/CommunitySolidServer/blob/862cc9a365f668df1b02f857a6eb9caf9639db5b/documentation/markdown/usage/client-credentials.md
*/


async function getAuthorisation(email, password, serverUrl){
// First we request the account API controls to find out where we can log in
  const indexResponse = await fetch(urljoin(serverUrl, '.account/'));
  const { controls } = await indexResponse.json();

// And then we log in to the account API
  const response = await fetch(controls.password.login, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: email, password: password }),
  });
// This authorization value will be used to authenticate in the next step
  const { authorization } = await response.json();
  return authorization;
}

async function generateToken(webId, serverUrl, authorization){
  // First we need to request the updated controls from the server now that we are logged in.
  // These will now have more values than in the previous example.
  const indexResponse = await fetch(urljoin(serverUrl + '.account/'), {
      headers: { authorization: `CSS-Account-Token ${authorization}` }
    });
  const { controls } = await indexResponse.json();

  // Here we request the server to generate a token on our account
  const response = await fetch(controls.account.clientCredentials, {
      method: 'POST',
      headers: { authorization: `CSS-Account-Token ${authorization}`, 'content-type': 'application/json' },
      // The name field will be used when generating the ID of your token.
      // The WebID field determines which WebID you will identify as when using the token.
      // Only WebIDs linked to your account can be used.
      body: JSON.stringify({ name: 'my-token', webId: webId }),
  });

  // These are the identifier and secret of your token.
  // Store the secret somewhere safe as there is no way to request it again from the server!
  // The `resource` value can be used to delete the token at a later point in time.
    //const { id, secret, resource } = await response.json();
    const token = await response.json() // contains id, secret, resource
    return token;
}

async function requestAccessToken(token, serverUrl) {
  const { id, secret} = token;

  // A key pair is needed for encryption.
  // This function from `solid-client-authn` generates such a pair for you.
  const dpopKey = await generateDpopKeyPair();

// These are the ID and secret generated in the previous step.
// Both the ID and the secret need to be form-encoded.
  const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
// This URL can be found by looking at the "token_endpoint" field at
// http://localhost:3000/.well-known/openid-configuration
// if your server is hosted at http://localhost:3000/.
  const tokenUrl = urljoin(serverUrl, '.oidc/token');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      // The header needs to be in base64 encoding.
      authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
    },
    body: 'grant_type=client_credentials&scope=webid',
  });

// This is the Access token that will be used to do an authenticated request to the server.
// The JSON also contains an "expires_in" field in seconds,
// which you can use to know when you need request a new Access token.
  const {access_token, expires_in} = await response.json();

  const today = new Date();
  today.setSeconds(today.getSeconds() + expires_in);

  return {
    accessToken: access_token,
    expiresOn: today,
    dpopKey
  }
}

export async function getAuthenticatedFetch(email, password, serverUrl, webId) {

  //console.log('Generating access token');
  const authorisation = await getAuthorisation(email, password, serverUrl);
  const token = await generateToken(webId, serverUrl, authorisation);
  const { accessToken, dpopKey } = await requestAccessToken(token, serverUrl);

// The DPoP key needs to be the same key as the one used in the previous step.
// The Access token is the one generated in the previous step.
  const authFetch = await buildAuthenticatedFetch(accessToken, { dpopKey });
// authFetch can now be used as a standard fetch function that will authenticate as your WebID.
  //console.log("authFetch ready");
  return authFetch;
}
