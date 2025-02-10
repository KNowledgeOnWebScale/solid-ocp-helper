import fs from 'fs';
import YAML from 'yaml';
import { getAuthenticatedFetch } from './client-credentials.js';
import { newEngine, queryTermsNotVariables } from './comunicaEngineWrapper.js';

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
  for (const setupObject of Object.values(yarrrmlInfo)) {
    console.log(`Getting authenticated fetch function for ${setupObject.webId}.`);
    authFetchFunctions[setupObject.webId] = await getAuthenticatedFetch(
      setupObject.username,
      setupObject.password,
      setupObject.oidcIssuer,
      setupObject.webId)
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
  for (const setupObject of Object.values(yarrrmlInfo)) {
    console.log(`Getting data sources for ${setupObject.webId}.`);
    const indexQuery = setupObject.indexQuery || defaultIndexQuery;
    const context = {
      fetch: authFetchFunctions[setupObject.webId],
      // start at the index in first iteration
      sources: [setupObject.index],
      lenient: true
    }
    let allSources = [];
    let newSources = [];
    newEngine();
    do {
      newSources = await queryTermsNotVariables(indexQuery, context);
      allSources = [...allSources, ...newSources];
      // dig deeper in next iteration
      context.sources = newSources;
    } while (newSources.length > 0)
    dataSources[setupObject.webId] = Array.from(new Set(allSources));
  }
  return dataSources;
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
  const dataSources = await getAllDataSources(yarrrmlInfo, authFetchFunctions);
  const status = {
    yarrrmlInfo: yarrrmlInfo,
    originalDataSources: dataSources
  };
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log(`Step 1 finished; results in ${statusFile}.`);
}
