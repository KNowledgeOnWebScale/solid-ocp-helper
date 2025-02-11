import fs from 'fs';
import YAML from 'yaml';
import { getToken, getAuthenticatedFetch, deleteTokenResource } from './clientCredentials.js';
import { newEngine, queryTermsNotVariables } from './comunicaEngineWrapper.js';
import { preparePod, makeVC } from './vcWrapper.js';

/**
 * Gets all info from YARRRML file
 *
 * @param {String} yarrrmlFile name of the YARRRML file
 * @returns {Object} key: webId; value: object: relevant properties per webId from YARRRML file
 */
function getNeededInfoFromYarrrmlFile(yarrrmlFile) {
  console.log(`Getting needed information from ${yarrrmlFile}.`);
  const file = fs.readFileSync(yarrrmlFile, 'utf8');
  const yarrrml = YAML.parse(file);
  const yarrrmlInfo = {};
  for (const auth of Object.values(yarrrml.authentications)) {
    if (auth.type == "cssclientcredentials") {
      yarrrmlInfo[auth.webId] = {
        email: auth.email,
        password: auth.password,
        oidcIssuer: auth.oidcIssuer,
        webId: auth.webId, 
        index: auth.index,
        indexQuery: auth.indexQuery
      };
    }
  }
  return yarrrmlInfo;
}

/**
 * Gets all auth fetch functions (and the tokens used to create them)
 *
 * @param {Object} yarrrmlInfo key: webId; value: object: relevant properties per webId from YARRRML file
 * @returns {Array} [0]: key: webID, value: token; [1]: key: webId, value: fetch function
 */
async function getAllAuthFetchFunctions(yarrrmlInfo) {
  const tokens = {};
  const authFetchFunctions = {};
  console.log('Getting authenticated fetch functions.');
  for (const infoObject of Object.values(yarrrmlInfo)) {
    console.log(`  Getting authenticated fetch function for ${infoObject.webId}.`);
    tokens[infoObject.webId] = await getToken(
      infoObject.email,
      infoObject.password,
      infoObject.oidcIssuer,
      infoObject.webId);
    authFetchFunctions[infoObject.webId] = await getAuthenticatedFetch(
      tokens[infoObject.webId],
      infoObject.oidcIssuer);
  }
  return [tokens, authFetchFunctions];
}

/**
 * Gets all data sources
 *
 * @param {Object} yarrrmlInfo key: webId; value: object: relevant properties per webId from YARRRML file
 * @param {Object} authFetchFunctions key: webId, value: fetch function
 * @returns {Object} key: webId, value: array of data sources
 */
async function getAllDataSources(yarrrmlInfo, authFetchFunctions) {
  const defaultIndexQuery = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?dataResource
WHERE {
  ?s rdfs:seeAlso ?dataResource .
}
`;
  const dataSources = {};
  console.log('Getting data sources.');
  for (const infoObject of Object.values(yarrrmlInfo)) {
    console.log(`  Getting data sources for ${infoObject.webId}.`);
    const indexQuery = infoObject.indexQuery || defaultIndexQuery;
    const context = {
      fetch: authFetchFunctions[infoObject.webId],
      // start at the index in first iteration
      sources: [infoObject.index],
      lenient: true
    }
    let allSources = [infoObject.index];
    let newSources = [];
    newEngine();
    do {
      newSources = await queryTermsNotVariables(indexQuery, context);
      allSources = [...allSources, ...newSources];
      // dig deeper in next iteration
      context.sources = newSources;
    } while (newSources.length > 0)
    dataSources[infoObject.webId] = Array.from(new Set(allSources));
  }
  return dataSources;
}

/**
 * Deletes all token resources used to create authFetchFunctions
 * 
 * Do this as soon as you do not need the authFetchFunctions any longer
 *
 * @param {Object} yarrrmlInfo key: webId; value: object: relevant properties per webId from YARRRML file
 */
async function deleteAllTokenResources(yarrrmlInfo, tokens) {
  console.log('Deleting all token resources used to create authFetchFunctions.');
  for (const infoObject of Object.values(yarrrmlInfo)) {
    console.log(`  Deleting token resource for ${infoObject.webId}.`);
    try {
      await deleteTokenResource(infoObject.email,
        infoObject.password,
        infoObject.oidcIssuer,
        tokens[infoObject.webId].resource);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Prepares all pods for verifiable credentials
 *
 * @param {Object} status current status as in status file
 * @param {String} vcService URL of the VC service
 */
async function prepareAllPods(status, vcService) {
  console.log('Preparing pods for VC.');
  for (const infoObject of Object.values(status.yarrrmlInfo)) {
    console.log(`  Preparing pod of ${infoObject.webId} for VC.`);
    await preparePod(infoObject, vcService);
  }
}

/**
 * Checks if a resource is in the pod owned by a webId
 *
 * @param {String} resourceUrl the resource URL
 * @param {String} webId the webId
 * @returns {Boolean} 
 */
async function ownedBy(resourceUrl, webId) {
  const podQuery = `
PREFIX pim: <http://www.w3.org/ns/pim/space#>

SELECT ?pod
WHERE {
  <${webId}> pim:storage ?pod .
}
`;
  const pods = await queryTermsNotVariables(podQuery, { sources: [webId] });
  let owned = pods.some((pod) => resourceUrl.startsWith(pod));
  if (!owned) {
    // fallback for the case of no pim:storage predicate
    const pod = webId.substring(0, webId.lastIndexOf('profile/card'));
    owned = resourceUrl.startsWith(pod);
  }
  return owned;
}

/**
 * Gets a resource as text
 *
 * @param {String} resourceUrl the resource URL
 * @param {Function} authFetchFunction the (authenticated) fetch function to use
 * @returns {Array} [content type, the resource contents as text]
 */
async function getResourceText(resourceUrl, authFetchFunction) {
  const response = await authFetchFunction(resourceUrl, {
    method: 'GET'
  });
  if (!response.ok) {
    throw new Error(`Could not get ${resourceUrl}: ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type");
  const text = await response.text();
  return [ contentType, text ];
}

/**
 * Puts a resource
 *
 * @param {String} resourceUrl the resource URL
 * @param {String} contentTypeOut the content type
 * @param {String} text the resource contents as text
 * @param {Function} authFetchFunction the (authenticated) fetch function to use
 */
async function putResource(resourceUrl, contentTypeOut, text, authFetchFunction) {
  const response = await authFetchFunction(resourceUrl, {
    method: 'PUT',
    headers: {
      'content-type': contentTypeOut
    },
    body: text
  });
  if (!response.ok) {
    throw new Error(`Could not put ${resourceUrl}: ${response.status}`);
  }
}

/**
 * Deletes a resource
 * 
 * Remark: linked .acl file will be deleted too, 
 *
 * @param {String} resourceUrl the resource URL
 * @param {Function} authFetchFunction the (authenticated) fetch function to use
 */
async function deleteResource(resourceUrl, authFetchFunction) {
  const response = await authFetchFunction(resourceUrl, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(`Could not put ${resourceUrl}: ${response.status}`);
  }
}

/**
 * Adds all verifiable credentials objects (replacing the original resources)
 *
 * @param {Object} status current status as in status file
 * @param {Object} authFetchFunctions object containing an (authenticated) fetch function per webId
 * @param {String} vcService URL of the VC service
 */
async function addAllVerifiableCredentials(status, authFetchFunctions, vcService) {
  console.log('Adding verifiable credentials.');
  for (const infoObject of Object.values(status.yarrrmlInfo)) {
    const webId = infoObject.webId;
    console.log(`  Adding verifiable credentials for ${webId}.`);
    for (const resourceUrl of status.newDataSources[webId]) {
      if (await ownedBy(resourceUrl, webId)) {
        try {
          const [ contentTypeIn, text ] = await getResourceText(resourceUrl, authFetchFunctions[webId]);
          //console.log(`Read resource ${resourceUrl}; contentType: ${contentTypeIn}; text: ${text}.`);
          const [ contentTypeOut, vc ] = await makeVC(infoObject, contentTypeIn, text, vcService);
          //console.log(`Verifiable credentials: contentType: ${contentTypeOut}; vc: ${vc}.`);
          await putResource(resourceUrl, contentTypeOut, vc, authFetchFunctions[webId]);
          console.log(`    Put resource ${resourceUrl}.`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

/**
 * Deletes all obsolete data sources
 *
 * @param {Object} status current status as in status file
 * @param {Object} authFetchFunctions object containing an (authenticated) fetch function per webId
 */
async function deleteAllObsoleteDataSources(status, authFetchFunctions) {
  console.log('Deleting obsolete data sources, if any.');
  for (const infoObject of Object.values(status.yarrrmlInfo)) {
    const webId = infoObject.webId;
    console.log(`  Deleting obsolete data sources for ${webId}, if any.`);
    const originalDataSources = status.originalDataSources[webId];
    const newDataSources = status.newDataSources[webId];
    for (const resourceUrl of originalDataSources) {
      if (!newDataSources.includes(resourceUrl)) {
        if (await ownedBy(resourceUrl, webId)) {
          try {
            await deleteResource(resourceUrl, authFetchFunctions[webId]);
            console.log(`    Deleted resource ${resourceUrl}.`);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }
}

/**
 * Do the entire step1
 *
 * @param {String} yarrrmlFile name of the YARRRML file
 * @param {String} statusFile name of the file where step1 saves its status
 */
export async function step1(yarrrmlFile, statusFile) {
  const yarrrmlInfo = getNeededInfoFromYarrrmlFile(yarrrmlFile);
  const [tokens, authFetchFunctions] = await getAllAuthFetchFunctions(yarrrmlInfo);
  const originalDataSources = await getAllDataSources(yarrrmlInfo, authFetchFunctions);
  const status = {
    yarrrmlInfo: yarrrmlInfo,
    originalDataSources: originalDataSources
  };
  await deleteAllTokenResources(yarrrmlInfo, tokens);
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log(`Step 1 finished; results in ${statusFile}.`);
}

/**
 * Do the entire step2
 *
 * @param {String} statusFile name of the file where step1 saved its status and where step2 saves an update
 * @param {String} vcService URL of the VC service
 */
export async function step2(statusFile, vcService) {
  const status = JSON.parse(fs.readFileSync(statusFile));
  const yarrrmlInfo = status.yarrrmlInfo; 
  const [tokens, authFetchFunctions] = await getAllAuthFetchFunctions(yarrrmlInfo);
  const newDataSources = await getAllDataSources(yarrrmlInfo, authFetchFunctions);
  status.newDataSources = newDataSources;
  await prepareAllPods(status, vcService);
  await addAllVerifiableCredentials(status, authFetchFunctions, vcService);
  await deleteAllObsoleteDataSources(status, authFetchFunctions);
  await deleteAllTokenResources(yarrrmlInfo, tokens);
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log(`Step 2 finished; pods updated; see also updated ${statusFile}.`);
}
