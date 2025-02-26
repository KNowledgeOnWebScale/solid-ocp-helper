# helper

A command line interface to help getting things done on the Onto-DESIDE pods.

* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Set up infrastructure](#set-up-infrastructure)
* [Usage](#usage)
* [Testing](#testing)

## Prerequisites

[Node](https://nodejs.org/en) (tested with version v20.17.0).

For testing, you'll need a bash shell.

## Installation

```bash
cd main
npm i
cd ..
```

## Set up infrastructure

> This is only needed if you want to run the example or the tests.

```bash
cd test
npm i
npm run setup:test
```

Execute all commands below in a new terminal window.

To stop the test infrastructuree, press `<Ctrl-C>`.

## Usage

```bash
cd main
```

Execute the command line without parameters to get help:

```bash
node bin/cli.js
```

An example `yarrrml.yml` is provided. The resulting status is in `status.json`.

The command line is prepared for you in `package.json`. To run:

```bash
npm run example
```

## Testing

```bash
cd test
./test.sh
```
