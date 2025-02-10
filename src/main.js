import fs from 'fs';
import YAML from 'yaml';
import { getAuthenticatedFetch } from './clientCredentials.js';
import { newEngine, queryTermsNotVariables } from './comunicaEngineWrapper.js';
import { preparePod } from './vcWrapper.js';

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
        username: auth.username,
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
 * Gets auth fetch functions for all entries in the step1 list
 *
 * @param {Object} yarrrmlInfo key: webId; value: object: relevant properties per webId from YARRRML file
 * @returns {Object} key: webId, value: fetch function
 */
async function getAllAuthFetchFunctions(yarrrmlInfo) {
  const authFetchFunctions = {};
  for (const infoObject of Object.values(yarrrmlInfo)) {
    console.log(`Getting authenticated fetch function for ${infoObject.webId}.`);
    authFetchFunctions[infoObject.webId] = await getAuthenticatedFetch(
      infoObject.username,
      infoObject.password,
      infoObject.oidcIssuer,
      infoObject.webId)
  }
  return authFetchFunctions;
}

/**
 * Gets all data sources for all entries in the step1 list
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
  for (const infoObject of Object.values(yarrrmlInfo)) {
    console.log(`Getting data sources for ${infoObject.webId}.`);
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
 * Prepares all pods for verifiable credentials
 *
 * @param {Object} status current status as in status file
 * @param {String} vcService URL of the VC service
 */
async function prepareAllPods(status, vcService) {
  for (const infoObject of Object.values(status.yarrrmlInfo)) {
    console.log(`Preparing pod of ${infoObject.webId}.`);
    await preparePod(infoObject, vcService);
  }
}

/**
 * Check if a resource is in the pod owned by a webId
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
 * Get a resource (as text)
 *
 * @param {String} resourceUrl the resource URL
 * @param {Function} authFunction the (authenticated) fetch function to use
 * @returns {String} the resource contents as text
 */
async function getResource(resourceUrl, authFunction) {
  const response = await authFunction(resourceUrl, {
    method: 'GET'
  });
  if (!response.ok) {
    throw new Error(`Could not get ${resourceUrl}: ${response.status}`);
  }
  return await response.text();
}

async function addAllVerifiableCredentials(status, authFetchFunctions) {
  for (const infoObject of Object.values(status.yarrrmlInfo)) {
    const webId = infoObject.webId;
    console.log(`Adding verifiable credentials for ${webId}.`);
    for (const resourceUrl of status.newDataSources[webId]) {
      if (await ownedBy(resourceUrl, webId)) {
        try {
          const data = await getResource(resourceUrl, authFetchFunctions[webId]);
          console.log(`Read resource ${resourceUrl}.`);
          //console.log(data);
          //const dataVC = await makeVC(data, vcService);
          //await putResource(dataVC, authFetchFunctions[webId]);
        } catch (e) {
          console.log(e);
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
  const authFetchFunctions = await getAllAuthFetchFunctions(yarrrmlInfo);
  const originalDataSources = await getAllDataSources(yarrrmlInfo, authFetchFunctions);
  const status = {
    yarrrmlInfo: yarrrmlInfo,
    originalDataSources: originalDataSources
  };
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
  const authFetchFunctions = await getAllAuthFetchFunctions(yarrrmlInfo);
  const newDataSources = await getAllDataSources(yarrrmlInfo, authFetchFunctions);
  status.newDataSources = newDataSources;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  await prepareAllPods(status, vcService);
  await addAllVerifiableCredentials(status, authFetchFunctions, vcService);
  //await deleteAllObsoleteDataSources(status, authFetchFunctions);
  //await deleteClientCredentials(status);
  console.log(`Step 2 finished; pods updated; see also updated ${statusFile}.`);
}
