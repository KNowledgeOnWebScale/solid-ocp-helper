/*
 * This module wraps a Comunica engine.
 */

import { QueryEngine } from "@comunica/query-sparql";

/**
* Execute one SPARQL query with the engine
* 
* @param {String} queryText - the SPARQL query text
* @param {Object} context - the Comunica context
* @returns {Array} the query result as an array of objects (property name: variable name; property value: term value)
*/
export async function query(queryText, context) {
  // a new engine per call; no history
  const engine = new QueryEngine();
  const results = [];

  let result = await engine.query(queryText, {
    ...context
  });
  switch (result.resultType) {
    case 'bindings':
      const bindingsStream = await result.execute();
      await new Promise((resolve, reject) => {
        bindingsStream.on('data', (bindings) => {
          const result = {};
          for (const [variable, term] of bindings) {
            result[variable.value] = term.value;
          }
          results.push(result);
        });
        bindingsStream.on('end', resolve);
        bindingsStream.on('error', reject);
      });
      break;
    case 'quads':
      throw new Error("Quads not expected as query result");
      break;
    case 'boolean':
      throw new Error("Boolean not expected as query result");
      break;
    default:
      throw new Error("Unknown query result type");
      break;
  }

  return results;
}

/**
* Execute one SPARQL query with the engine. Return only the terms, not the variables.
* (The variable name is omitted; most useful for single variable results, where variable name might be relevant).
*
* @param {String} queryText - the SPARQL query text
* @param {Object} context - the Comunica context
* @returns {Array} the query result as an array of terms
*/
export async function queryTermsNotVariables(queryText, context) {
  const queryResults = await query(queryText, context);
  const terms = [];
  for (const result of queryResults) {
    for (const value of Object.values(result)) {
      terms.push(value);
    }
  }
  return terms;
}