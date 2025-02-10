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
  console.log(`>>> Checking if ${webId} is ready for VC.`);
  const response = await fetch(webId);
  const card = await response.text();
  if (card.includes("https://w3id.org/security#assertionMethod")) {
    console.log('>>> it is...');
  } else {
    console.log('>>> Adding VC keypair.')
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
      console.log(`>>> ${webId} is ready for VC now.`);
    } else {
      throw new Error(`>>> Adding VC keypair to ${webId} failed.`);
    }
  }
}

