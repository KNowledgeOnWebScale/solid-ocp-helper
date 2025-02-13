# helper

A command line interface to help getting things done on the Onto-DESIDE pods.

## Prerequisites

[Node](https://nodejs.org/en) (tested with version v20.17.0)

## Installation

### In directory `main`

```bash
npm i
```

## Usage

### In directory `main`

This is the main command line. Execute without parameters to get help:

```bash
node bin/cli.js
```

## Testing

### In directory `test`

Install test infrastructure:

```bash
npm i
```

Spin up test infrastructure:

```bash
npm run setup:test
```

### In directory `main`

Run the steps of main with test data:

```bash
npm run test:steps
```

The test is successful if the final console line contains `verification summary: 6 passed, 0 failed, 0 invalid, 0 execution errors`.
