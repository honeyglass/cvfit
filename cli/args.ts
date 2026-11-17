/**
 * The arguments of one call, read in full, so one answer names every mistake in them.
 *
 * readArgs: the values, the words, the options given and those given without a value, and the
 * mistakes the arguments hold by themselves.
 * Values: the value of each option a call gives.
 * optionText: one option with its value, written so a shell and readArgs read the value back.
 *
 * A strict parse stops at the first unknown option; this one reads every argument and collects.
 * A command oriko names may be run by an agent as it stands, so every value in it is quoted.
 *
 * @example const { values, words, issues } = readArgs(['plan', '--cv', 'jane']);
 */
import { parseArgs } from 'node:util';
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import { OPTIONS } from './commands.ts';
import type { OptionName } from './commands.ts';

type Options = typeof OPTIONS;
type Switch = {
  [Name in OptionName]: Options[Name] extends { type: 'boolean' } ? Name : never;
}[OptionName];
type Many = {
  [Name in OptionName]: Options[Name] extends { multiple: true } ? Name : never;
}[OptionName];
type One = Exclude<OptionName, Switch | Many>;

export type Values = { [Name in One]?: string } & { [Name in Switch]?: boolean } & {
  [Name in Many]?: string[];
};

/**
 * @param argv - the arguments after the program name
 * @returns what the arguments say, and every mistake they hold without knowing the command
 */
export function readArgs(argv: string[]) {
  const { tokens } = parseArgs({
    args: dashValuesEmptied(argv),
    strict: false,
    tokens: true,
    allowPositionals: true,
    options: OPTIONS,
  });
  const values: Values = {};
  const words: string[] = [];
  const given: OptionName[] = [];
  const empty: OptionName[] = [];
  const issues: Issue[] = [];
  for (const token of tokens) {
    if (token.kind === 'positional') words.push(token.value);
    if (token.kind !== 'option') continue;
    if (isOption(token.name) === false) {
      issues.push(unknownOption(token.name));
      continue;
    }
    const name = token.name;
    given.push(name);
    if (isSwitch(name)) {
      if (token.value === undefined) values[name] = true;
      else issues.push(unexpectedValue(name));
      continue;
    }
    if (token.value === undefined || token.value === '') empty.push(name);
    else if (isMany(name)) values[name] = [...(values[name] ?? []), token.value];
    else values[name] = token.value;
  }
  return { values, words, given, empty, issues: [...issues, ...repeated(given)] };
}

const isOption = (name: string): name is OptionName => Object.hasOwn(OPTIONS, name);
const isSwitch = (name: OptionName): name is Switch => OPTIONS[name].type === 'boolean';
const isMany = (name: OptionName): name is Many => 'multiple' in OPTIONS[name];

// Node's strict parse calls a separate value that starts with '-' ambiguous: it is the next
// option, so the option before it stays without a value; '--opt=-x' still gives one.
function dashValuesEmptied(argv: string[]) {
  const end = argv.includes('--') ? argv.indexOf('--') : argv.length;
  return argv.map((arg, index) =>
    index < end && takesText(arg) && isDashed(argv[index + 1]) ? `${arg}=` : arg,
  );
}

function takesText(arg: string) {
  const name = arg.slice(2);
  return arg.startsWith('--') && isOption(name) && OPTIONS[name].type === 'string';
}

// Node's own test: '-' alone is a value, so only a dash with more after it starts an option.
const isDashed = (arg: string | undefined) =>
  arg !== undefined && arg.length > 1 && arg.startsWith('-');

/**
 * @param name - the option
 * @param value - its value, from the call or the data folder
 * @returns ' --name value', or ' --name=value' when the value starts with a dash
 */
export function optionText(name: One, value: string) {
  const word = shellWord(value);
  return isDashed(value) ? ` --${name}=${word}` : ` --${name} ${word}`;
}

// Only letters, digits and '_ . / -' stay bare; a visible value, '~' too, goes in single quotes.
// A value with a character that does not show as itself goes in $'…' with that character as
// escaped bytes, so the command stays one visible line that bash, zsh and ksh read back.
function shellWord(word: string) {
  if (/^[\w./-]+$/.test(word)) return word;
  if (UNSAFE_CHAR.test(word) === false) return `'${word.replaceAll("'", `'\\''`)}'`;
  return `$'${[...word].map(escapedChar).join('')}'`;
}

// '\xHH' per UTF-8 byte: bash 3.2, the one macOS ships, knows no '\u' in $'…'.
function escapedChar(char: string) {
  if (char === '\\' || char === "'") return `\\${char}`;
  if (UNSAFE_CHAR.test(char) === false) return char;
  return [...Buffer.from(char)].map(byte => `\\x${byte.toString(16).padStart(2, '0')}`).join('');
}

// An option that takes several values may come again; any other only once.
function repeated(given: OptionName[]) {
  const twice = given.filter(
    (name, index) => isMany(name) === false && given.indexOf(name) !== index,
  );
  return [...new Set(twice)].map(repeatedOption);
}

const unknownOption = (name: string): Issue => ({
  code: 'UNKNOWN_OPTION',
  path: name,
  message: `No option is called --${name}`,
  hint: 'Run the command and use one of the options it lists',
  command: 'oriko schema',
});

const unexpectedValue = (name: string): Issue => ({
  code: 'UNEXPECTED_VALUE',
  path: name,
  message: `The option --${name} takes no value`,
  hint: `Write --${name} alone`,
});

const repeatedOption = (name: string): Issue => ({
  code: 'REPEATED_OPTION',
  path: name,
  message: `The option --${name} is given more than once`,
  hint: `Give --${name} once`,
});
