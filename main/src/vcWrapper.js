import 'node-self';
import { coreSetup, coreIssue, coreVerify } from './vcCore.js';

/**
 * Prepares a pod for verifiable credentials
 *
 * (Code based on https://gitlab.ilabt.imec.be/rml/util/solid-target-helper/-/blob/solid-target-helper-with-vc/podVCSetup.js?ref_type=heads)
 * 
 * @param {Object} authInfo authentication info of an actor
 * @param {Function} authFetchFunction the (authenticated) fetch function to use
 */
export async function preparePod(authInfo, authFetchFunction) {
  const { webId, email, password, oidcIssuer } = authInfo;
  console.log(`    Checking if ${webId} is ready for VC.`);
  const response = await fetch(webId);
  const card = await response.text();
  if (card.includes("https://w3id.org/security#assertionMethod")) {
    console.log('    It is...');
  } else {
    console.log('    Adding VC keypair.')
    try {
      await coreSetup(email, password, oidcIssuer, webId, { authFetch: authFetchFunction });
    } catch (e) {
      throw new Error(`Adding VC keypair to ${webId} failed.`, {cause: e});
    }
    console.log(`    ${webId} is ready for VC now.`);
  }
}

/**
 * Make a verifiable credentials object
 *
 * @param {Object} authInfo authentication info of an actor
 * @param {String} contentType content type of the input data
 * @param {String} text input data as text
 * @param {Function} authFetchFunction the (authenticated) fetch function to use
 * @returns {Array} [content type of the verifiable credentials object, the verifiable credentials object serialized as text]
 */
export async function makeVC(authInfo, contentType, text, authFetchFunction) {
  const { webId, email, password, oidcIssuer } = authInfo;
  let issued;
  try {
    issued = await coreIssue(email, password, oidcIssuer, webId, contentType, text, { authFetch: authFetchFunction });
  } catch (e) {
    throw new Error(`Making verifiable credential object failed for ${webId} failed.`, { cause: e });
  }
  return [issued.contentType, issued.signedCredentialText];
}

/**
 * Verify a verifiable credentials object
 *
 * @param {String} signedCredentialText the verifiable credentials object as text
 * @returns {String} 
 */
export async function verifyVC(signedCredentialText) {
  let v;

  let verifiableCredential;
  try {
    verifiableCredential = JSON.parse(signedCredentialText);
  } catch (e) {
    return "verification impossible; invalid contents (not JSON)";
  }

  try {
    v = await coreVerify(verifiableCredential);
    if (v.validationResult.valid) {
      if (v.verificationResult.verified) {
        return "verification passed";
      } else {
        return "verification failed";
      }
    } else {
      return "verification impossible; invalid contents";
    }
  } catch (e) {
    return `verifying error: ${e.message}`;
  }
}