/**
 * Prepares a pod for verifiable credentials
 *
 * (Code based on https://gitlab.ilabt.imec.be/rml/util/solid-target-helper/-/blob/solid-target-helper-with-vc/podVCSetup.js?ref_type=heads)
 * 
 * @param {Object} authInfo authentication info of an actor
 * @param {String} vcService URL of the VC service
 */
export async function preparePod(authInfo, vcService) {
  const { webId, username, password, oidcIssuer } = authInfo;
  console.log(`    Checking if ${webId} is ready for VC.`);
  const response = await fetch(webId);
  const card = await response.text();
  if (card.includes("https://w3id.org/security#assertionMethod")) {
    console.log('    It is...');
  } else {
    console.log('    Adding VC keypair.')
    const response = await fetch(`${vcService}/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        'email': username,
        'password': password,
        'css': oidcIssuer,
        'webId': webId
      })
    });
    const result = await response.text();
    if (result === 'true') {
      console.log(`    ${webId} is ready for VC now.`);
    } else {
      throw new Error(`Adding VC keypair to ${webId} failed.`);
    }
  }
}

/**
 * Make a verifiable credentials object
 *
 * @param {Object} authInfo authentication info of an actor
 * @param {String} contentType content type of the input data
 * @param {String} text input data as text
 * @param {String} vcService URL of the VC service
 * @returns {Array} [content type of the verifiable credentials object, the verifiable credentials object serialized as text]
 */
export async function makeVC(authInfo, contentType, text, vcService) {
  const { webId, username, password, oidcIssuer } = authInfo;
  const response = await fetch(`${vcService}/issue`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      'contentType': contentType,
      'email': username,
      'password': password,
      'css': oidcIssuer,
      'webId': webId,
      'data': text
    })
  })
  const vc = await response.text();
  return ['application/ld+json', vc];
}