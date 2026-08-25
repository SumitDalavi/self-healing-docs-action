/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 2874:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __nccwpck_require__) => {

(function () {
  (__nccwpck_require__(8889).config)(
    Object.assign(
      {},
      __nccwpck_require__(9990),
      __nccwpck_require__(4531)(process.argv)
    )
  )
})()


/***/ }),

/***/ 4531:
/***/ ((module) => {

const re = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/

module.exports = function optionMatcher (args) {
  const options = args.reduce(function (acc, cur) {
    const matches = cur.match(re)
    if (matches) {
      acc[matches[1]] = matches[2]
    }
    return acc
  }, {})

  if (!('quiet' in options)) {
    options.quiet = 'true'
  }

  return options
}


/***/ }),

/***/ 9990:
/***/ ((module) => {

// ../config.js accepts options via environment variables
const options = {}

if (process.env.DOTENV_CONFIG_ENCODING != null) {
  options.encoding = process.env.DOTENV_CONFIG_ENCODING
}

if (process.env.DOTENV_CONFIG_PATH != null) {
  options.path = process.env.DOTENV_CONFIG_PATH
}

if (process.env.DOTENV_CONFIG_QUIET != null) {
  options.quiet = process.env.DOTENV_CONFIG_QUIET
}

if (process.env.DOTENV_CONFIG_DEBUG != null) {
  options.debug = process.env.DOTENV_CONFIG_DEBUG
}

if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
  options.override = process.env.DOTENV_CONFIG_OVERRIDE
}

if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
  options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY
}

module.exports = options


/***/ }),

/***/ 8889:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fs = __nccwpck_require__(9896)
const path = __nccwpck_require__(6928)
const os = __nccwpck_require__(857)
const crypto = __nccwpck_require__(6982)

// Array of tips to display randomly
const TIPS = [
  '◈ encrypted .env [www.dotenvx.com]',
  '◈ secrets for agents [www.dotenvx.com]',
  '⌁ auth for agents [www.vestauth.com]',
  '⌘ custom filepath { path: \'/custom/path/.env\' }',
  '⌘ enable debugging { debug: true }',
  '⌘ override existing { override: true }',
  '⌘ suppress logs { quiet: true }',
  '⌘ multiple files { path: [\'.env.local\', \'.env\'] }'
]

// Get a random tip from the tips array
function _getRandomTip () {
  return TIPS[Math.floor(Math.random() * TIPS.length)]
}

function parseBoolean (value) {
  if (typeof value === 'string') {
    return !['false', '0', 'no', 'off', ''].includes(value.toLowerCase())
  }
  return Boolean(value)
}

function supportsAnsi () {
  return process.stdout.isTTY // && process.env.TERM !== 'dumb'
}

function dim (text) {
  return supportsAnsi() ? `\x1b[2m${text}\x1b[0m` : text
}

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

// Parse src into an Object
function parse (src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}

function _parseVault (options) {
  options = options || {}

  const vaultPath = _vaultPath(options)
  options.path = vaultPath // parse .env.vault
  const result = DotenvModule.configDotenv(options)
  if (!result.parsed) {
    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`)
    err.code = 'MISSING_DATA'
    throw err
  }

  // handle scenario for comma separated keys - for use with key rotation
  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  const keys = _dotenvKey(options).split(',')
  const length = keys.length

  let decrypted
  for (let i = 0; i < length; i++) {
    try {
      // Get full key
      const key = keys[i].trim()

      // Get instructions for decrypt
      const attrs = _instructions(result, key)

      // Decrypt
      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key)

      break
    } catch (error) {
      // last key
      if (i + 1 >= length) {
        throw error
      }
      // try next key
    }
  }

  // Parse decrypted .env string
  return DotenvModule.parse(decrypted)
}

function _warn (message) {
  console.error(`⚠ ${message}`)
}

function _debug (message) {
  console.log(`┆ ${message}`)
}

function _log (message) {
  console.log(`◇ ${message}`)
}

function _dotenvKey (options) {
  // prioritize developer directly setting options.DOTENV_KEY
  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
    return options.DOTENV_KEY
  }

  // secondary infra already contains a DOTENV_KEY environment variable
  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY
  }

  // fallback to empty string
  return ''
}

function _instructions (result, dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    }

    throw error
  }

  // Get decrypt key
  const key = uri.password
  if (!key) {
    const err = new Error('INVALID_DOTENV_KEY: Missing key part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get environment
  const environment = uri.searchParams.get('environment')
  if (!environment) {
    const err = new Error('INVALID_DOTENV_KEY: Missing environment part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`
  const ciphertext = result.parsed[environmentKey] // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`)
    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT'
    throw err
  }

  return { ciphertext, key }
}

function _vaultPath (options) {
  let possibleVaultPath = null

  if (options && options.path && options.path.length > 0) {
    if (Array.isArray(options.path)) {
      for (const filepath of options.path) {
        if (fs.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`
        }
      }
    } else {
      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`
    }
  } else {
    possibleVaultPath = path.resolve(process.cwd(), '.env.vault')
  }

  if (fs.existsSync(possibleVaultPath)) {
    return possibleVaultPath
  }

  return null
}

function _resolveHome (envPath) {
  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath
}

function _configVault (options) {
  const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || (options && options.debug))
  const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || (options && options.quiet))

  if (debug || !quiet) {
    _log('loading env from encrypted .env.vault')
  }

  const parsed = DotenvModule._parseVault(options)

  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }

  DotenvModule.populate(processEnv, parsed, options)

  return { parsed }
}

function configDotenv (options) {
  const dotenvPath = path.resolve(process.cwd(), '.env')
  let encoding = 'utf8'
  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }
  let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || (options && options.debug))
  let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || (options && options.quiet))

  if (options && options.encoding) {
    encoding = options.encoding
  } else {
    if (debug) {
      _debug('no encoding is specified (UTF-8 is used by default)')
    }
  }

  let optionPaths = [dotenvPath] // default, look for .env
  if (options && options.path) {
    if (!Array.isArray(options.path)) {
      optionPaths = [_resolveHome(options.path)]
    } else {
      optionPaths = [] // reset default
      for (const filepath of options.path) {
        optionPaths.push(_resolveHome(filepath))
      }
    }
  }

  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
  // parsed data, we will combine it with process.env (or options.processEnv if provided).
  let lastError
  const parsedAll = {}
  for (const path of optionPaths) {
    try {
      // Specifying an encoding returns a string instead of a buffer
      const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }))

      DotenvModule.populate(parsedAll, parsed, options)
    } catch (e) {
      if (debug) {
        _debug(`failed to load ${path} ${e.message}`)
      }
      lastError = e
    }
  }

  const populated = DotenvModule.populate(processEnv, parsedAll, options)

  // handle user settings DOTENV_CONFIG_ options inside .env file(s)
  debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug)
  quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet)

  if (debug || !quiet) {
    const keysCount = Object.keys(populated).length
    const shortPaths = []
    for (const filePath of optionPaths) {
      try {
        const relative = path.relative(process.cwd(), filePath)
        shortPaths.push(relative)
      } catch (e) {
        if (debug) {
          _debug(`failed to load ${filePath} ${e.message}`)
        }
        lastError = e
      }
    }

    _log(`injected env (${keysCount}) from ${shortPaths.join(',')} ${dim(`// tip: ${_getRandomTip()}`)}`)
  }

  if (lastError) {
    return { parsed: parsedAll, error: lastError }
  } else {
    return { parsed: parsedAll }
  }
}

// Populates process.env from .env file
function config (options) {
  // fallback to original dotenv if DOTENV_KEY is not set
  if (_dotenvKey(options).length === 0) {
    return DotenvModule.configDotenv(options)
  }

  const vaultPath = _vaultPath(options)

  // dotenvKey exists but .env.vault file does not exist
  if (!vaultPath) {
    _warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`)

    return DotenvModule.configDotenv(options)
  }

  return DotenvModule._configVault(options)
}

function decrypt (encrypted, keyStr) {
  const key = Buffer.from(keyStr.slice(-64), 'hex')
  let ciphertext = Buffer.from(encrypted, 'base64')

  const nonce = ciphertext.subarray(0, 12)
  const authTag = ciphertext.subarray(-16)
  ciphertext = ciphertext.subarray(12, -16)

  try {
    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce)
    aesgcm.setAuthTag(authTag)
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
  } catch (error) {
    const isRange = error instanceof RangeError
    const invalidKeyLength = error.message === 'Invalid key length'
    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data'

    if (isRange || invalidKeyLength) {
      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    } else if (decryptionFailed) {
      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY')
      err.code = 'DECRYPTION_FAILED'
      throw err
    } else {
      throw error
    }
  }
}

// Populate process.env with parsed values
function populate (processEnv, parsed, options = {}) {
  const debug = Boolean(options && options.debug)
  const override = Boolean(options && options.override)
  const populated = {}

  if (typeof parsed !== 'object') {
    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate')
    err.code = 'OBJECT_REQUIRED'
    throw err
  }

  // Set process.env
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (override === true) {
        processEnv[key] = parsed[key]
        populated[key] = parsed[key]
      }

      if (debug) {
        if (override === true) {
          _debug(`"${key}" is already defined and WAS overwritten`)
        } else {
          _debug(`"${key}" is already defined and was NOT overwritten`)
        }
      }
    } else {
      processEnv[key] = parsed[key]
      populated[key] = parsed[key]
    }
  }

  return populated
}

const DotenvModule = {
  configDotenv,
  _configVault,
  _parseVault,
  config,
  decrypt,
  parse,
  populate
}

module.exports.configDotenv = DotenvModule.configDotenv
module.exports._configVault = DotenvModule._configVault
module.exports._parseVault = DotenvModule._parseVault
module.exports.config = DotenvModule.config
module.exports.decrypt = DotenvModule.decrypt
module.exports.parse = DotenvModule.parse
module.exports.populate = DotenvModule.populate

module.exports = DotenvModule


/***/ }),

/***/ 2732:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processDiff = void 0;
const llm_1 = __nccwpck_require__(6166);
async function processDiff(diff, docContent) {
    const staleness = await (0, llm_1.checkStaleness)(diff.oldCode, diff.newCode, docContent);
    if (!staleness.isStale) {
        return {
            docId: 'mock-doc-id',
            originalContent: docContent,
            isStale: false,
            reasoning: staleness.reasoning
        };
    }
    const repaired = await (0, llm_1.repairDoc)(docContent, diff.newCode, staleness.reasoning);
    return {
        docId: 'mock-doc-id',
        originalContent: docContent,
        isStale: true,
        reasoning: staleness.reasoning,
        repairedContent: repaired
    };
}
exports.processDiff = processDiff;


/***/ }),

/***/ 9407:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__nccwpck_require__(2874);
const core = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/core'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const diff_1 = __nccwpck_require__(2732);
async function run() {
    try {
        // Read Action inputs
        const openaiKey = core.getInput('openai_api_key') || process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('Missing OPENAI_API_KEY');
        }
        process.env.OPENAI_API_KEY = openaiKey;
        const autoMerge = core.getInput('auto_merge') === 'true';
        core.info('🚀 Starting Self-Healing Docs check...');
        // Mock Payload since we are running locally / as demonstration
        const mockOldCode = `function calculateDiscount(price, isVip) {
  if (isVip) return price * 0.9; // 10% discount
  return price;
}`;
        const mockNewCode = `function calculateDiscount(price, isVip, hasCoupon) {
  let discount = 1.0;
  if (isVip) discount -= 0.1; // 10% discount
  if (hasCoupon) discount -= 0.05; // 5% coupon
  return price * discount;
}`;
        const mockDoc = `### Discount Calculation
The system calculates discounts based on VIP status. Currently, VIPs receive a flat 10% discount, and no other parameters affect the final price.
`;
        core.info('🔍 Analyzing Code Diff and Document mapping...');
        // We simulate finding a linked chunk with 100% certainty for the demo
        const result = await (0, diff_1.processDiff)({ codeId: 'discount-logic', oldCode: mockOldCode, newCode: mockNewCode }, mockDoc);
        if (result.isStale) {
            core.warning('⚠️ Stale documentation detected!');
            core.info('Reasoning: ' + result.reasoning);
            core.info('Repaired Doc Suggestion:\n' + result.repairedContent);
            if (autoMerge) {
                core.info('🛠️ Auto-merge is enabled. Assuming PR was updated successfully.');
            }
            else {
                core.info('👤 Auto-merge is disabled. Flagging for human review via PR comment.');
            }
        }
        else {
            core.info('✅ Documentation is still accurate. No changes needed.');
        }
        core.setOutput('stale_found', result.isStale);
    }
    catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
run();


/***/ }),

/***/ 6166:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.repairDoc = exports.checkStaleness = void 0;
const openai_1 = __importDefault(__nccwpck_require__(2583));
let _openai = null;
function getOpenAI() {
    if (!_openai) {
        _openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}
const STALENESS_PROMPT = `You are a technical documentation reviewer.
You will receive:
1. The old version of a code block.
2. The new version of a code block.
3. A documentation section that refers to this code.

Is the documentation section now stale or inaccurate because of the code change?
Answer in JSON: { "isStale": true/false, "reasoning": "..." }`;
async function checkStaleness(oldCode, newCode, docContent) {
    const userMessage = `--- OLD CODE ---\n${oldCode}\n\n--- NEW CODE ---\n${newCode}\n\n--- DOC CONTENT ---\n${docContent}`;
    const res = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: STALENESS_PROMPT },
            { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
    });
    return JSON.parse(res.choices[0].message.content || '{"isStale": false, "reasoning": "Failed to parse"}');
}
exports.checkStaleness = checkStaleness;
const REPAIR_PROMPT = `You are a technical documentation writer.
A documentation section has been identified as stale because of a code change.
You will be provided with:
1. The stale documentation section.
2. The new code.
3. The reasoning for why it is stale.

Rewrite ONLY the parts of the documentation that are inaccurate. Preserve the original style, tone, and formatting. Do not hallucinate external context.
Return your answer in JSON: { "repaired_doc": "..." }`;
async function repairDoc(staleDoc, newCode, reasoning) {
    const userMessage = `--- STALE DOC ---\n${staleDoc}\n\n--- NEW CODE ---\n${newCode}\n\n--- REASONING ---\n${reasoning}`;
    const res = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: REPAIR_PROMPT },
            { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
    });
    const parsed = JSON.parse(res.choices[0].message.content || '{"repaired_doc": ""}');
    return parsed.repaired_doc || staleDoc;
}
exports.repairDoc = repairDoc;


/***/ }),

/***/ 6982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 6107:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MalformedJSON = exports.PartialJSON = exports.partialParse = void 0;
const STR = 1;
const NUM = 2;
const ARR = 4;
const OBJ = 8;
const NULL = 16;
const BOOL = 32;
const NAN = 64;
const INFINITY = 128;
const MINUS_INFINITY = 256;
const INF = INFINITY | MINUS_INFINITY;
const SPECIAL = NULL | BOOL | INF | NAN;
const ATOM = STR | NUM | SPECIAL;
const COLLECTION = ARR | OBJ;
const ALL = ATOM | COLLECTION;
const Allow = {
    STR,
    NUM,
    ARR,
    OBJ,
    NULL,
    BOOL,
    NAN,
    INFINITY,
    MINUS_INFINITY,
    INF,
    SPECIAL,
    ATOM,
    COLLECTION,
    ALL,
};
// The JSON string segment was unable to be parsed completely
// oxlint-disable-next-line unicorn/custom-error-definition -- preserve the vendored exported class name
class PartialJSON extends Error {
}
exports.PartialJSON = PartialJSON;
// oxlint-disable-next-line unicorn/custom-error-definition -- preserve the vendored exported class name
class MalformedJSON extends Error {
}
exports.MalformedJSON = MalformedJSON;
/**
 * Parse incomplete JSON
 * @param {string} jsonString Partial JSON to be parsed
 * @param {number} allowPartial Specify what types are allowed to be partial, see {@link Allow} for details
 * @returns The parsed JSON
 * @throws {PartialJSON} If the JSON is incomplete (related to the `allow` parameter)
 * @throws {MalformedJSON} If the JSON is malformed
 */
function parseJSON(jsonString, allowPartial = Allow.ALL) {
    if (typeof jsonString !== 'string') {
        throw new TypeError(`expecting str, got ${typeof jsonString}`);
    }
    if (!jsonString.trim()) {
        throw new Error(`${jsonString} is empty`);
    }
    return _parseJSON(jsonString.trim(), allowPartial);
}
const _parseJSON = (jsonString, allow) => {
    const length = jsonString.length;
    let index = 0;
    const markPartialJSON = (msg) => {
        throw new PartialJSON(`${msg} at position ${index}`);
    };
    const throwMalformedError = (msg) => {
        throw new MalformedJSON(`${msg} at position ${index}`);
    };
    const parseAny = () => {
        skipBlank();
        if (index >= length) {
            markPartialJSON('Unexpected end of input');
        }
        if (jsonString[index] === '"') {
            return parseStr();
        }
        if (jsonString[index] === '{') {
            return parseObj();
        }
        if (jsonString[index] === '[') {
            return parseArr();
        }
        if (jsonString.substring(index, index + 4) === 'null' ||
            (Allow.NULL & allow && length - index < 4 && 'null'.startsWith(jsonString.substring(index)))) {
            index += 4;
            return null;
        }
        if (jsonString.substring(index, index + 4) === 'true' ||
            (Allow.BOOL & allow && length - index < 4 && 'true'.startsWith(jsonString.substring(index)))) {
            index += 4;
            return true;
        }
        if (jsonString.substring(index, index + 5) === 'false' ||
            (Allow.BOOL & allow && length - index < 5 && 'false'.startsWith(jsonString.substring(index)))) {
            index += 5;
            return false;
        }
        if (jsonString.substring(index, index + 8) === 'Infinity' ||
            (Allow.INFINITY & allow && length - index < 8 && 'Infinity'.startsWith(jsonString.substring(index)))) {
            index += 8;
            return Infinity;
        }
        if (jsonString.substring(index, index + 9) === '-Infinity' ||
            (Allow.MINUS_INFINITY & allow &&
                length - index > 1 &&
                length - index < 9 &&
                '-Infinity'.startsWith(jsonString.substring(index)))) {
            index += 9;
            return -Infinity;
        }
        if (jsonString.substring(index, index + 3) === 'NaN' ||
            (Allow.NAN & allow && length - index < 3 && 'NaN'.startsWith(jsonString.substring(index)))) {
            index += 3;
            return Number.NaN;
        }
        return parseNum();
    };
    const parseStr = () => {
        const start = index;
        let escape = false;
        index++; // skip initial quote
        while (index < length && (jsonString[index] !== '"' || (escape && jsonString[index - 1] === '\\'))) {
            escape = jsonString[index] === '\\' ? !escape : false;
            index++;
        }
        if (jsonString.charAt(index) === '"') {
            try {
                return JSON.parse(jsonString.substring(start, ++index - Number(escape)));
            }
            catch (e) {
                throwMalformedError(String(e));
            }
        }
        else if (Allow.STR & allow) {
            try {
                return JSON.parse(jsonString.substring(start, index - Number(escape)) + '"');
            }
            catch {
                // SyntaxError: Invalid escape sequence
                return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf('\\')) + '"');
            }
        }
        markPartialJSON('Unterminated string literal');
    };
    const parseObj = () => {
        index++; // skip initial brace
        skipBlank();
        const obj = {};
        try {
            while (jsonString[index] !== '}') {
                skipBlank();
                if (index >= length && Allow.OBJ & allow) {
                    return obj;
                }
                const key = parseStr();
                skipBlank();
                index++; // skip colon
                try {
                    const value = parseAny();
                    Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
                }
                catch (e) {
                    if (Allow.OBJ & allow) {
                        return obj;
                    }
                    throw e;
                }
                skipBlank();
                if (jsonString[index] === ',') {
                    index++;
                } // skip comma
            }
        }
        catch {
            if (Allow.OBJ & allow) {
                return obj;
            }
            markPartialJSON("Expected '}' at end of object");
        }
        index++; // skip final brace
        return obj;
    };
    const parseArr = () => {
        index++; // skip initial bracket
        const arr = [];
        try {
            while (jsonString[index] !== ']') {
                arr.push(parseAny());
                skipBlank();
                if (jsonString[index] === ',') {
                    index++; // skip comma
                }
            }
        }
        catch {
            if (Allow.ARR & allow) {
                return arr;
            }
            markPartialJSON("Expected ']' at end of array");
        }
        index++; // skip final bracket
        return arr;
    };
    const parseNum = () => {
        if (index === 0) {
            if (jsonString === '-' && Allow.NUM & allow) {
                markPartialJSON("Not sure what '-' is");
            }
            try {
                return JSON.parse(jsonString);
            }
            catch (e) {
                if (Allow.NUM & allow) {
                    try {
                        if (jsonString[jsonString.length - 1] === '.') {
                            return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf('.')));
                        }
                        return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf('e')));
                    }
                    catch {
                        // Fall through to report malformed input below.
                    }
                }
                throwMalformedError(String(e));
            }
        }
        const start = index;
        if (jsonString[index] === '-') {
            index++;
        }
        while (jsonString[index] && !',]}'.includes(jsonString[index])) {
            index++;
        }
        if (index === length && !(Allow.NUM & allow)) {
            markPartialJSON('Unterminated number literal');
        }
        try {
            return JSON.parse(jsonString.substring(start, index));
        }
        catch {
            if (jsonString.substring(start, index) === '-' && Allow.NUM & allow) {
                markPartialJSON("Not sure what '-' is");
            }
            try {
                return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf('e')));
            }
            catch (e) {
                throwMalformedError(String(e));
            }
        }
    };
    const skipBlank = () => {
        while (index < length && ' \n\r\t'.includes(jsonString[index])) {
            index++;
        }
    };
    return parseAny();
};
// using this function with malformed JSON is undefined behavior
const partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);
exports.partialParse = partialParse;
//# sourceMappingURL=parser.js.map

/***/ }),

/***/ 1455:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WorkloadIdentityAuth = void 0;
const tslib_1 = __nccwpck_require__(2345);
const Shims = tslib_1.__importStar(__nccwpck_require__(7831));
const error_1 = __nccwpck_require__(5093);
const SUBJECT_TOKEN_TYPES = {
    jwt: 'urn:ietf:params:oauth:token-type:jwt',
    id: 'urn:ietf:params:oauth:token-type:id_token',
};
const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
/**
 * Exchanges external workload-identity tokens for cached OpenAI access tokens.
 *
 * Concurrent token exchanges are shared. Valid cached tokens are returned while
 * a proactive refresh runs in the background; expired or missing tokens wait
 * for a successful exchange before they are returned.
 */
class WorkloadIdentityAuth {
    /**
     * Creates a workload-identity token cache and OAuth token-exchange client.
     *
     * @param config External identity provider, OpenAI service account, and refresh settings.
     * @param fetch Optional fetch implementation for calls to the OpenAI token endpoint.
     */
    constructor(config, fetch) {
        this.cachedToken = null;
        this.refreshPromise = null;
        this.tokenGeneration = 0;
        this.tokenExchangeUrl = 'https://auth.openai.com/oauth/token';
        this.config = config;
        this.fetch = fetch ?? Shims.getDefaultFetch();
    }
    /**
     * Returns a valid OpenAI access token, exchanging or refreshing credentials as needed.
     *
     * Cached tokens nearing expiration are returned immediately while a background
     * refresh runs. Concurrent callers share the same in-flight token exchange.
     *
     * @throws {OAuthError} When the token endpoint rejects the subject token or identity.
     * @throws {APIError} When another unsuccessful HTTP response prevents token exchange.
     * @throws {OpenAIError} When a successful exchange has an invalid access token or expiration.
     */
    async getToken() {
        if (!this.cachedToken || WorkloadIdentityAuth.isTokenExpired(this.cachedToken)) {
            if (this.refreshPromise) {
                return await this.refreshPromise;
            }
            const refreshPromise = this.refreshToken(this.tokenGeneration);
            this.refreshPromise = refreshPromise;
            try {
                return await refreshPromise;
            }
            finally {
                if (this.refreshPromise === refreshPromise) {
                    this.refreshPromise = null;
                }
            }
        }
        if (this.needsRefresh(this.cachedToken) && !this.refreshPromise) {
            const refreshPromise = this.refreshToken(this.tokenGeneration).finally(() => {
                if (this.refreshPromise === refreshPromise) {
                    this.refreshPromise = null;
                }
            });
            this.refreshPromise = refreshPromise;
            void refreshPromise.catch(() => null);
        }
        return this.cachedToken.token;
    }
    async refreshToken(generation) {
        const subjectToken = await this.config.provider.getToken();
        const body = {
            grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
            subject_token: subjectToken,
            subject_token_type: SUBJECT_TOKEN_TYPES[this.config.provider.tokenType],
            identity_provider_id: this.config.identityProviderId,
            service_account_id: this.config.serviceAccountId,
        };
        if (this.config.clientId) {
            body['client_id'] = this.config.clientId;
        }
        const response = await this.fetch(this.tokenExchangeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            redirect: 'manual',
        });
        if (!response.ok) {
            const errorText = await response.text();
            let body = undefined;
            try {
                body = JSON.parse(errorText);
            }
            catch {
                // Ignore non-JSON error bodies.
            }
            if (response.status === 400 || response.status === 401 || response.status === 403) {
                throw new error_1.OAuthError(response.status, body, response.headers);
            }
            throw error_1.APIError.generate(response.status, body, `Token exchange failed with status ${response.status}`, response.headers);
        }
        const tokenResponse = await response.json();
        if (typeof tokenResponse !== 'object' ||
            tokenResponse === null ||
            !('access_token' in tokenResponse) ||
            typeof tokenResponse.access_token !== 'string' ||
            tokenResponse.access_token.trim().length === 0) {
            throw new error_1.OpenAIError("Token exchange response missing 'access_token' field");
        }
        const accessToken = tokenResponse.access_token;
        const expiresIn = tokenResponse.expires_in ?? 3600;
        if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
            throw new error_1.OpenAIError("Token exchange response has invalid 'expires_in' field");
        }
        const now = Date.now();
        const expiresAt = now + expiresIn * 1000;
        if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
            throw new error_1.OpenAIError("Token exchange response has invalid 'expires_in' field");
        }
        if (this.tokenGeneration === generation) {
            this.cachedToken = {
                token: accessToken,
                expiresAt,
            };
        }
        return accessToken;
    }
    static isTokenExpired(cachedToken) {
        return Date.now() >= cachedToken.expiresAt;
    }
    needsRefresh(cachedToken) {
        const bufferSeconds = this.config.refreshBufferSeconds ?? 1200;
        const bufferMs = bufferSeconds * 1000;
        return Date.now() >= cachedToken.expiresAt - bufferMs;
    }
    /** Discards the cached access token so the next request performs a fresh exchange. */
    invalidateToken() {
        this.tokenGeneration += 1;
        this.cachedToken = null;
        this.refreshPromise = null;
    }
}
exports.WorkloadIdentityAuth = WorkloadIdentityAuth;
//# sourceMappingURL=workload-identity-auth.js.map

/***/ }),

/***/ 8952:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AzureOpenAI = void 0;
const tslib_1 = __nccwpck_require__(2345);
const headers_1 = __nccwpck_require__(9267);
const Errors = tslib_1.__importStar(__nccwpck_require__(3269));
const utils_1 = __nccwpck_require__(2152);
const path_1 = __nccwpck_require__(2704);
const client_1 = __nccwpck_require__(9664);
/** API Client for interfacing with the Azure OpenAI API. */
class AzureOpenAI extends client_1.OpenAI {
    /**
     * API Client for interfacing with the Azure OpenAI API.
     *
     * @param {string | undefined} [opts.apiVersion] - Defaults to `process.env['OPENAI_API_VERSION'] ?? undefined`.
     * @param {string | undefined} [opts.endpoint] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`. Defaults to `process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined`.
     * @param {string | undefined} [opts.apiKey] - Defaults to `process.env['AZURE_OPENAI_API_KEY'] ?? undefined`.
     * @param {string | undefined} opts.deployment - Azure model deployment inserted into supported deployment-scoped request paths.
     * @param {string | null | undefined} [opts.organization] - Defaults to `process.env['OPENAI_ORG_ID'] ?? null`.
     * @param {string} [opts.baseURL] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`. Defaults to `process.env['OPENAI_BASE_URL']`.
     * @param {number} [opts.timeout] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out. Defaults to 10 minutes.
     * @param {() => Promise<string>} [opts.azureADTokenProvider] - Returns a fresh Microsoft Entra access token for each request; cannot be combined with `apiKey`.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries] - The maximum number of times the client will retry a request. Defaults to `2`.
     * @param {Headers} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers. Defaults to `false`.
     */
    constructor({ baseURL = (0, utils_1.readEnv)('OPENAI_BASE_URL'), apiKey = (0, utils_1.readEnv)('AZURE_OPENAI_API_KEY'), apiVersion = (0, utils_1.readEnv)('OPENAI_API_VERSION'), endpoint, deployment, azureADTokenProvider, dangerouslyAllowBrowser, ...opts } = {}) {
        if (!apiVersion) {
            throw new Errors.OpenAIError("The OPENAI_API_VERSION environment variable is missing or empty; either provide it, or instantiate the AzureOpenAI client with an apiVersion option, like new AzureOpenAI({ apiVersion: 'My API Version' }).");
        }
        if (typeof azureADTokenProvider === 'function') {
            dangerouslyAllowBrowser ?? (dangerouslyAllowBrowser = true);
        }
        if (!azureADTokenProvider && !apiKey) {
            throw new Errors.OpenAIError('Missing credentials. Please pass one of `apiKey` and `azureADTokenProvider`, or set the `AZURE_OPENAI_API_KEY` environment variable.');
        }
        if (azureADTokenProvider && apiKey) {
            throw new Errors.OpenAIError('The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.');
        }
        opts.defaultQuery = { ...opts.defaultQuery, 'api-version': apiVersion };
        if (!baseURL) {
            if (!endpoint) {
                endpoint = process.env['AZURE_OPENAI_ENDPOINT'];
            }
            if (!endpoint) {
                throw new Errors.OpenAIError('Must provide one of the `baseURL` or `endpoint` arguments, or the `AZURE_OPENAI_ENDPOINT` environment variable');
            }
            let endpointEnd = endpoint.length;
            while (endpointEnd > 0 && endpoint[endpointEnd - 1] === '/') {
                endpointEnd--;
            }
            baseURL = `${endpoint.slice(0, endpointEnd)}/openai`;
        }
        else if (endpoint) {
            throw new Errors.OpenAIError('baseURL and endpoint are mutually exclusive');
        }
        super({
            apiKey: azureADTokenProvider ?? apiKey,
            baseURL,
            ...opts,
            ...(dangerouslyAllowBrowser === undefined ? {} : { dangerouslyAllowBrowser }),
        });
        /** Azure OpenAI API version included in requests made by this client. */
        this.apiVersion = '';
        this.apiVersion = apiVersion;
        this.deploymentName = deployment;
    }
    /** Builds an Azure request and inserts its deployment into model-scoped endpoint paths. */
    async buildRequest(options, props = {}) {
        if (_deployments_endpoints.has(options.path) && options.method === 'post' && options.body !== undefined) {
            if (!(0, utils_1.isObj)(options.body)) {
                throw new Error('Expected request body to be an object');
            }
            const model = this.deploymentName || options.body['model'] || options.__metadata?.['model'];
            if (model !== undefined && !this.baseURL.includes('/deployments')) {
                options.path = (0, path_1.path) `/deployments/${model}` + options.path;
            }
        }
        const built = await super.buildRequest(options, props);
        if (built.req.headers.has('api-key')) {
            built.req.redirect = 'manual';
        }
        return built;
    }
    async fetchWithAuth(url, init, timeout, controller, schemes) {
        if (new Headers(init.headers).has('api-key')) {
            init.redirect = 'manual';
        }
        return super.fetchWithAuth(url, init, timeout, controller, schemes);
    }
    async authHeaders(opts, schemes) {
        const security = schemes ?? { bearerAuth: true, adminAPIKeyAuth: true };
        if (security.bearerAuth && typeof this._options.apiKey === 'string') {
            return (0, headers_1.buildHeaders)([{ 'api-key': this.apiKey }]);
        }
        return super.authHeaders(opts, security);
    }
}
exports.AzureOpenAI = AzureOpenAI;
const _deployments_endpoints = new Set([
    '/completions',
    '/chat/completions',
    '/embeddings',
    '/audio/transcriptions',
    '/audio/translations',
    '/audio/speech',
    '/images/generations',
    '/batches',
    '/images/edits',
]);
//# sourceMappingURL=azure.js.map

/***/ }),

/***/ 2037:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BedrockOpenAI = void 0;
const tslib_1 = __nccwpck_require__(2345);
const Errors = tslib_1.__importStar(__nccwpck_require__(3269));
const client_1 = __nccwpck_require__(9664);
const bedrock_1 = __nccwpck_require__(8259);
const headers_1 = __nccwpck_require__(9267);
const utils_1 = __nccwpck_require__(2152);
const ResponsesParser_1 = __nccwpck_require__(3980);
const API = tslib_1.__importStar(__nccwpck_require__(6889));
/** Resolve the default Bedrock Mantle API root from the configured AWS region. */
function deriveBedrockBaseURL(awsRegion) {
    const region = awsRegion?.trim();
    if (!region) {
        throw new Errors.OpenAIError('Must provide one of the `baseURL` or `awsRegion` arguments, or set the `AWS_BEDROCK_BASE_URL`, `AWS_REGION`, or `AWS_DEFAULT_REGION` environment variable.');
    }
    return `https://bedrock-mantle.${region}.api.aws/openai/v1`;
}
/** Normalize a Bedrock Responses URL variant back to the provider API root. */
function normalizeBedrockBaseURL(baseURL) {
    const url = new URL(baseURL);
    const responsesMatch = url.pathname.match(/\/responses(?:\/.*)?$/);
    if (responsesMatch?.index !== undefined) {
        url.pathname = url.pathname.slice(0, responsesMatch.index) || '/';
    }
    return url.toString().replace(/\/$/, '');
}
/** Restore the SDK convenience property when Bedrock omits it from a streamed final response. */
function addBedrockOutputText(response) {
    if (!Object.getOwnPropertyDescriptor(response, 'output_text')) {
        (0, ResponsesParser_1.addOutputText)(response);
    }
    return response;
}
/** Keep the standard Responses surface while repairing Bedrock streamed final responses. */
function restoreBedrockStreamOutputText(responses) {
    const stream = responses.stream.bind(responses);
    responses.stream = ((body, options) => {
        const responseStream = stream(body, options);
        const finalResponse = responseStream.finalResponse.bind(responseStream);
        responseStream.finalResponse = async () => addBedrockOutputText(await finalResponse());
        return responseStream;
    });
    return responses;
}
/** API Client for interfacing with Amazon Bedrock's OpenAI-compatible endpoint. */
class BedrockOpenAI extends client_1.OpenAI {
    /**
     * API Client for interfacing with Amazon Bedrock's OpenAI-compatible endpoint.
     *
     * @param {string | null | undefined} [opts.apiKey] - Defaults to `process.env['AWS_BEARER_TOKEN_BEDROCK'] ?? null`.
     * @param {string | null | undefined} [opts.baseURL] - Defaults to `process.env['AWS_BEDROCK_BASE_URL']`, or is derived from `opts.awsRegion`, `AWS_REGION`, or `AWS_DEFAULT_REGION`.
     * @param {string | undefined} [opts.awsRegion] - Defaults to `process.env['AWS_REGION'] ?? process.env['AWS_DEFAULT_REGION'] ?? undefined`.
     * @param {ApiKeySetter | undefined} opts.bedrockTokenProvider - A function that returns a Bedrock bearer token and is invoked before each request.
     */
    constructor({ baseURL = (0, utils_1.readEnv)('AWS_BEDROCK_BASE_URL'), apiKey, awsRegion = (0, utils_1.readEnv)('AWS_REGION') ?? (0, utils_1.readEnv)('AWS_DEFAULT_REGION'), bedrockTokenProvider, adminAPIKey, workloadIdentity, ...opts } = {}) {
        if (adminAPIKey || workloadIdentity) {
            throw new Errors.OpenAIError('BedrockOpenAI only supports Bedrock bearer token authentication.');
        }
        if (apiKey === undefined && !bedrockTokenProvider) {
            apiKey = (0, utils_1.readEnv)('AWS_BEARER_TOKEN_BEDROCK') ?? null;
        }
        if (typeof apiKey === 'function') {
            throw new Errors.OpenAIError('Pass refreshable Bedrock credentials via `bedrockTokenProvider`, not `apiKey`.');
        }
        if (apiKey && bedrockTokenProvider) {
            throw new Errors.OpenAIError('The `apiKey` and `bedrockTokenProvider` arguments are mutually exclusive; only one can be passed at a time.');
        }
        if (!apiKey && !bedrockTokenProvider) {
            throw new Errors.OpenAIError('Missing credentials. Please pass an `apiKey` or `bedrockTokenProvider`, or set the `AWS_BEARER_TOKEN_BEDROCK` environment variable.');
        }
        const configuredBaseURL = baseURL?.trim() ? baseURL : deriveBedrockBaseURL(awsRegion);
        super({
            apiKey: bedrockTokenProvider ?? apiKey,
            adminAPIKey: null,
            baseURL: normalizeBedrockBaseURL(configuredBaseURL),
            ...opts,
        });
        /**
         * Identifies this client to credential-bearing WebSocket helpers.
         *
         * @internal
         */
        this[_a] = true;
        const trustedBaseURL = this.baseURL;
        let currentBaseURL = trustedBaseURL;
        Object.defineProperty(this, 'baseURL', {
            enumerable: true,
            configurable: false,
            get() {
                return currentBaseURL;
            },
            set(nextBaseURL) {
                (0, bedrock_1.assertBedrockRequestOrigin)(trustedBaseURL, nextBaseURL);
                currentBaseURL = nextBaseURL;
            },
        });
        this.bedrockTokenProvider = bedrockTokenProvider;
        this.responses = restoreBedrockStreamOutputText(new API.Responses(this));
    }
    async prepareOptions(options) {
        const configuredBaseURL = this._options.baseURL ?? this.baseURL;
        (0, bedrock_1.assertBedrockRequestOrigin)(configuredBaseURL, this.buildURL(options.path, null, options.defaultBaseURL));
        const security = options.__security ?? { bearerAuth: true };
        if (security.adminAPIKeyAuth && !security.bearerAuth) {
            await this._callApiKey();
        }
        await super.prepareOptions(options);
        (0, bedrock_1.assertBedrockRequestOrigin)(configuredBaseURL, this.buildURL(options.path, null, options.defaultBaseURL));
    }
    async prepareRequest(request, context) {
        (0, bedrock_1.assertBedrockRequestOrigin)(this._options.baseURL ?? this.baseURL, context.url);
        await super.prepareRequest(request, context);
        request.redirect = 'manual';
    }
    async authHeaders(opts, schemes) {
        const security = schemes ?? { bearerAuth: true, adminAPIKeyAuth: true };
        if ((security.bearerAuth || security.adminAPIKeyAuth) && this.apiKey !== null) {
            return (0, headers_1.buildHeaders)([{ Authorization: `Bearer ${this.apiKey}` }]);
        }
        return super.authHeaders(opts, security);
    }
    /** Clones this client while preserving its refreshable Bedrock token provider when appropriate. */
    withOptions(options) {
        const bedrockTokenProvider = options.apiKey === undefined ? (options.bedrockTokenProvider ?? this.bedrockTokenProvider) : undefined;
        return super.withOptions({
            ...options,
            ...(bedrockTokenProvider ? { apiKey: undefined, bedrockTokenProvider } : {}),
        });
    }
}
exports.BedrockOpenAI = BedrockOpenAI;
_a = bedrock_1.brand_privateBedrockClient;
//# sourceMappingURL=bedrock.js.map

/***/ }),

/***/ 9664:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
var _OpenAI_instances, _a, _OpenAI_encoder, _OpenAI_responseAttempts, _OpenAI_baseURLOverridden;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OpenAI = void 0;
const tslib_1 = __nccwpck_require__(2345);
const uuid_1 = __nccwpck_require__(660);
const values_1 = __nccwpck_require__(7325);
const sleep_1 = __nccwpck_require__(5668);
const errors_1 = __nccwpck_require__(7698);
const parse_1 = __nccwpck_require__(3426);
const detect_platform_1 = __nccwpck_require__(8132);
const Shims = tslib_1.__importStar(__nccwpck_require__(7831));
const Opts = tslib_1.__importStar(__nccwpck_require__(3347));
const query_1 = __nccwpck_require__(4007);
const version_1 = __nccwpck_require__(3287);
const Errors = tslib_1.__importStar(__nccwpck_require__(5093));
const Pagination = tslib_1.__importStar(__nccwpck_require__(2155));
const workload_identity_auth_1 = __nccwpck_require__(1455);
const error_1 = __nccwpck_require__(5093);
const Uploads = tslib_1.__importStar(__nccwpck_require__(7013));
const API = tslib_1.__importStar(__nccwpck_require__(6889));
const api_promise_1 = __nccwpck_require__(1999);
const batches_1 = __nccwpck_require__(257);
const completions_1 = __nccwpck_require__(4066);
const content_provenance_checks_1 = __nccwpck_require__(2170);
const embeddings_1 = __nccwpck_require__(7435);
const files_1 = __nccwpck_require__(9230);
const images_1 = __nccwpck_require__(1395);
const models_1 = __nccwpck_require__(2123);
const moderations_1 = __nccwpck_require__(8328);
const videos_1 = __nccwpck_require__(193);
const admin_1 = __nccwpck_require__(8874);
const audio_1 = __nccwpck_require__(3638);
const beta_1 = __nccwpck_require__(8852);
const chat_1 = __nccwpck_require__(3164);
const containers_1 = __nccwpck_require__(5764);
const conversations_1 = __nccwpck_require__(398);
const evals_1 = __nccwpck_require__(4466);
const fine_tuning_1 = __nccwpck_require__(198);
const graders_1 = __nccwpck_require__(7882);
const realtime_1 = __nccwpck_require__(2778);
const responses_1 = __nccwpck_require__(1470);
const skills_1 = __nccwpck_require__(4220);
const uploads_1 = __nccwpck_require__(9962);
const vector_stores_1 = __nccwpck_require__(9494);
const webhooks_1 = __nccwpck_require__(3820);
const detect_platform_2 = __nccwpck_require__(8132);
const headers_1 = __nccwpck_require__(9267);
const provider_1 = __nccwpck_require__(9800);
const env_1 = __nccwpck_require__(3432);
const log_1 = __nccwpck_require__(6273);
const values_2 = __nccwpck_require__(7325);
function isRunningInBrowserOrBrowserWorker() {
    if ((0, detect_platform_2.isRunningInBrowser)())
        return true;
    const scope = globalThis;
    return (typeof scope.WorkerGlobalScope === 'function' &&
        scope instanceof scope.WorkerGlobalScope &&
        typeof scope.WorkerNavigator === 'function' &&
        scope.navigator instanceof scope.WorkerNavigator &&
        typeof scope.navigator?.userAgent === 'string' &&
        scope.navigator.userAgent !== 'Cloudflare-Workers' &&
        scope.process?.versions?.node === undefined &&
        scope.Deno === undefined &&
        scope.Bun === undefined &&
        scope.EdgeRuntime === undefined &&
        scope.WebSocketPair === undefined);
}
const WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER = 'workload-identity-auth';
/**
 * API Client for interfacing with the OpenAI API.
 */
class OpenAI {
    /**
     * API Client for interfacing with the OpenAI API.
     *
     * @param {string | null | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? null]
     * @param {string | null | undefined} [opts.adminAPIKey=process.env['OPENAI_ADMIN_KEY'] ?? null]
     * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
     * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
     * @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
     * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
     * @param {Provider} [opts.provider] - Configure a third-party API provider. Mutually exclusive with top-level authentication and base URL options.
     * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor(clientOptions = {}) {
        _OpenAI_instances.add(this);
        _OpenAI_encoder.set(this, void 0);
        _OpenAI_responseAttempts.set(this, new WeakMap());
        /**
         * Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
         */
        this.completions = new API.Completions(this);
        this.chat = new API.Chat(this);
        /**
         * Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
         */
        this.embeddings = new API.Embeddings(this);
        /**
         * Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
         */
        this.files = new API.Files(this);
        /**
         * Given a prompt and/or an input image, the model will generate a new image.
         */
        this.images = new API.Images(this);
        this.contentProvenanceChecks = new API.ContentProvenanceChecks(this);
        this.audio = new API.Audio(this);
        /**
         * Given text and/or image inputs, classifies if those inputs are potentially harmful.
         */
        this.moderations = new API.Moderations(this);
        /**
         * List and describe the various models available in the API.
         */
        this.models = new API.Models(this);
        this.fineTuning = new API.FineTuning(this);
        this.graders = new API.Graders(this);
        this.vectorStores = new API.VectorStores(this);
        this.webhooks = new API.Webhooks(this);
        this.beta = new API.Beta(this);
        /**
         * Create large batches of API requests to run asynchronously.
         */
        this.batches = new API.Batches(this);
        /**
         * Use Uploads to upload large files in multiple parts.
         */
        this.uploads = new API.Uploads(this);
        this.admin = new API.Admin(this);
        this.responses = new API.Responses(this);
        this.realtime = new API.Realtime(this);
        /**
         * Manage conversations and conversation items.
         */
        this.conversations = new API.Conversations(this);
        /**
         * Manage and run evals in the OpenAI platform.
         */
        this.evals = new API.Evals(this);
        this.containers = new API.Containers(this);
        this.skills = new API.Skills(this);
        /**
         * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
         */
        this.videos = new API.Videos(this);
        const provider = clientOptions.provider;
        if (provider) {
            const conflictingOptions = ['apiKey', 'adminAPIKey', 'workloadIdentity', 'baseURL'].filter((key) => clientOptions[key] != null);
            if (conflictingOptions.length) {
                throw new Errors.OpenAIError(`The \`provider\` option cannot be used with ${conflictingOptions
                    .map((key) => `\`${key}\``)
                    .join(', ')}. Configure authentication and the base URL through the provider instead.`);
            }
        }
        const { baseURL = provider ? null : (0, env_1.readEnv)('OPENAI_BASE_URL'), apiKey = provider ? null : ((0, env_1.readEnv)('OPENAI_API_KEY') ?? null), adminAPIKey = provider ? null : ((0, env_1.readEnv)('OPENAI_ADMIN_KEY') ?? null), organization = provider ? null : ((0, env_1.readEnv)('OPENAI_ORG_ID') ?? null), project = provider ? null : ((0, env_1.readEnv)('OPENAI_PROJECT_ID') ?? null), webhookSecret = (0, env_1.readEnv)('OPENAI_WEBHOOK_SECRET') ?? null, workloadIdentity, ...opts } = clientOptions;
        const providerRuntime = provider ? (0, provider_1.configureProvider)(provider) : undefined;
        const options = {
            apiKey,
            adminAPIKey,
            organization,
            project,
            webhookSecret,
            workloadIdentity,
            provider,
            ...opts,
            baseURL: providerRuntime?.baseURL ?? (baseURL || `https://api.openai.com/v1`),
        };
        if (apiKey && workloadIdentity) {
            throw new Errors.OpenAIError('The `apiKey` and `workloadIdentity` options are mutually exclusive');
        }
        if (!providerRuntime && !apiKey && !adminAPIKey && !workloadIdentity) {
            throw new Errors.OpenAIError('Missing credentials. Please pass an `apiKey`, `workloadIdentity`, `adminAPIKey`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable.');
        }
        if (!options.dangerouslyAllowBrowser && isRunningInBrowserOrBrowserWorker()) {
            throw new Errors.OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
        }
        this.baseURL = options.baseURL;
        this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT; /* 10 minutes */
        this.logger = options.logger ?? console;
        const defaultLogLevel = 'warn';
        // Set default logLevel early so that we can log a warning in parseLogLevel.
        this.logLevel = defaultLogLevel;
        this.logLevel =
            (0, log_1.parseLogLevel)(options.logLevel, 'ClientOptions.logLevel', this) ??
                (0, log_1.parseLogLevel)((0, env_1.readEnv)('OPENAI_LOG'), "process.env['OPENAI_LOG']", this) ??
                defaultLogLevel;
        this.fetchOptions = options.fetchOptions;
        this.maxRetries = options.maxRetries ?? 2;
        this.fetch = options.fetch ?? Shims.getDefaultFetch();
        tslib_1.__classPrivateFieldSet(this, _OpenAI_encoder, Opts.FallbackEncoder, "f");
        const customHeadersEnv = provider ? undefined : (0, env_1.readEnv)('OPENAI_CUSTOM_HEADERS');
        if (customHeadersEnv) {
            const parsed = {};
            for (const line of customHeadersEnv.split('\n')) {
                const colon = line.indexOf(':');
                if (colon >= 0) {
                    parsed[line.substring(0, colon).trim()] = line.substring(colon + 1).trim();
                }
            }
            options.defaultHeaders = (0, headers_1.buildHeaders)([parsed, options.defaultHeaders]);
        }
        this._options = options;
        this._provider = providerRuntime;
        if (workloadIdentity) {
            this._workloadIdentityAuth = new workload_identity_auth_1.WorkloadIdentityAuth(workloadIdentity, this.fetch);
        }
        this.apiKey = typeof apiKey === 'string' ? apiKey : null;
        this.adminAPIKey = adminAPIKey;
        this.organization = organization;
        this.project = project;
        this.webhookSecret = webhookSecret;
    }
    /**
     * Create a new client instance re-using the same options given to the current client with optional overriding.
     */
    withOptions(options) {
        const inheritedProvider = this._options.provider;
        const provider = options.provider ?? inheritedProvider;
        const inheritedOptions = {
            ...this._options,
            baseURL: this.baseURL,
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            logger: this.logger,
            logLevel: this.logLevel,
            fetch: this.fetch,
            fetchOptions: this.fetchOptions,
            apiKey: this._options.apiKey,
            adminAPIKey: this.adminAPIKey,
            workloadIdentity: this._options.workloadIdentity,
            organization: this.organization,
            project: this.project,
            webhookSecret: this.webhookSecret,
        };
        if (provider) {
            delete inheritedOptions.apiKey;
            delete inheritedOptions.adminAPIKey;
            delete inheritedOptions.workloadIdentity;
            delete inheritedOptions.baseURL;
            if (provider !== inheritedProvider) {
                delete inheritedOptions.organization;
                delete inheritedOptions.project;
                delete inheritedOptions.defaultHeaders;
            }
        }
        const client = new this.constructor({
            ...inheritedOptions,
            ...options,
            provider,
        });
        return client;
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    validateHeaders({ values, nulls }, schemes = {
        bearerAuth: true,
        adminAPIKeyAuth: true,
    }) {
        if (values.get('authorization') || values.get('api-key')) {
            return;
        }
        if (nulls.has('authorization') || nulls.has('api-key')) {
            return;
        }
        if (this._workloadIdentityAuth && schemes.bearerAuth) {
            return;
        }
        throw new Error('Could not resolve authentication method. Expected either apiKey or adminAPIKey to be set. Or for one of the "Authorization" or "api-key" headers to be explicitly omitted');
    }
    async authHeaders(opts, schemes = {
        bearerAuth: true,
        adminAPIKeyAuth: true,
    }) {
        return (0, headers_1.buildHeaders)([
            schemes.bearerAuth ? await this.bearerAuth(opts) : null,
            schemes.adminAPIKeyAuth ? await this.adminAPIKeyAuth(opts) : null,
        ]);
    }
    async bearerAuth(opts) {
        if (this._workloadIdentityAuth) {
            return (0, headers_1.buildHeaders)([{ Authorization: `Bearer ${await this._workloadIdentityAuth.getToken()}` }]);
        }
        if (this.apiKey == null) {
            return undefined;
        }
        return (0, headers_1.buildHeaders)([{ Authorization: `Bearer ${this.apiKey}` }]);
    }
    async adminAPIKeyAuth(opts) {
        if (this.adminAPIKey == null) {
            return undefined;
        }
        return (0, headers_1.buildHeaders)([{ Authorization: `Bearer ${this.adminAPIKey}` }]);
    }
    stringifyQuery(query) {
        return (0, query_1.stringifyQuery)(query);
    }
    getUserAgent() {
        return `${this.constructor.name}/JS ${version_1.VERSION}`;
    }
    defaultIdempotencyKey() {
        return `stainless-node-retry-${(0, uuid_1.uuid4)()}`;
    }
    makeStatusError(status, error, message, headers) {
        const normalizedError = error && typeof error === 'object' && error.error == null ? { error } : error;
        return Errors.APIError.generate(status, normalizedError, message, headers);
    }
    async _callApiKey() {
        if (this._provider)
            return false;
        const apiKey = this._options.apiKey;
        if (typeof apiKey !== 'function')
            return false;
        let token;
        try {
            token = await apiKey();
        }
        catch (err) {
            if (err instanceof Errors.OpenAIError)
                throw err;
            throw new Errors.OpenAIError(`Failed to get token from 'apiKey' function: ${err.message}`, 
            // @ts-ignore
            { cause: err });
        }
        if (typeof token !== 'string' || !token) {
            throw new Errors.OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
        }
        this.apiKey = token;
        return true;
    }
    buildURL(path, query, defaultBaseURL) {
        const baseURL = (!tslib_1.__classPrivateFieldGet(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL) || this.baseURL;
        const url = (0, values_1.isAbsoluteURL)(path)
            ? new URL(path)
            : new URL(baseURL + (baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));
        const defaultQuery = this.defaultQuery();
        const pathQuery = Object.fromEntries(url.searchParams);
        if (!(0, values_2.isEmptyObj)(defaultQuery) || !(0, values_2.isEmptyObj)(pathQuery)) {
            query = { ...pathQuery, ...defaultQuery, ...query };
        }
        if (typeof query === 'object' && query && !Array.isArray(query)) {
            url.search = this.stringifyQuery(query);
        }
        return url.toString();
    }
    /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
     */
    async prepareOptions(options) {
        if (this._provider)
            return;
        const security = options.__security ?? { bearerAuth: true };
        if (security.bearerAuth) {
            await this._callApiKey();
        }
    }
    /**
     * Used as a callback for mutating the given `RequestInit` object.
     *
     * This is useful for cases where you want to add certain headers based off of
     * the request properties, e.g. `method` or `url`.
     */
    async prepareRequest(request, { url, options }) { }
    get(path, opts) {
        return this.methodRequest('get', path, opts);
    }
    post(path, opts) {
        return this.methodRequest('post', path, opts);
    }
    patch(path, opts) {
        return this.methodRequest('patch', path, opts);
    }
    put(path, opts) {
        return this.methodRequest('put', path, opts);
    }
    delete(path, opts) {
        return this.methodRequest('delete', path, opts);
    }
    methodRequest(method, path, opts) {
        return this.request(Promise.resolve(opts).then((opts) => {
            return { method, path, ...opts };
        }));
    }
    request(options, remainingRetries = null) {
        return this.responsePromise(this.makeRequest(options, remainingRetries, undefined));
    }
    responsePromise(request, parse = (client, props) => this.parseResponseWithTimeout(client, props)) {
        const promise = new api_promise_1.APIPromise(this, request, parse);
        // A body timeout can retry after the original raw response has arrived. Wait for
        // parsing before selecting the response so withResponse() reports the retry.
        promise.withResponse = async () => {
            const data = await promise;
            const { response } = await request;
            return { data, response, request_id: response.headers.get('x-request-id') };
        };
        promise._thenUnwrap = (transform) => this.responsePromise(request, async (client, props) => (0, parse_1.addRequestID)(transform(await parse(client, props), props), props.response));
        return promise;
    }
    async parseResponseWithTimeout(client, props) {
        if (props.options.stream ||
            props.options.__binaryResponse ||
            props.response.status === 204 ||
            props.response.headers.get('content-length') === '0') {
            return (0, parse_1.defaultParseResponse)(client, props);
        }
        while (true) {
            const attempt = tslib_1.__classPrivateFieldGet(this, _OpenAI_responseAttempts, "f").get(props.controller);
            const timeout = attempt?.timeout ?? props.options.timeout ?? this.timeout;
            const remaining = Math.max(0, props.startTime + timeout - Date.now());
            const callerSignal = props.options.signal;
            let timer;
            let abortListener;
            let timedOut = false;
            try {
                // Tool runners preserve a completed buffered turn before cancellation stops the next request.
                if (callerSignal?.aborted && props.options.__metadata?.['helperMethod'] !== 'runTools') {
                    throw new Errors.APIUserAbortError();
                }
                const timeoutPromise = new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        timedOut = true;
                        props.controller.abort();
                        reject(new Errors.APIConnectionTimeoutError());
                    }, remaining);
                    if (callerSignal) {
                        abortListener = () => reject(new Errors.APIUserAbortError());
                        callerSignal.addEventListener('abort', abortListener, { once: true });
                    }
                });
                return await Promise.race([(0, parse_1.defaultParseResponse)(client, props), timeoutPromise]);
            }
            catch (error) {
                if (callerSignal?.aborted) {
                    throw new Errors.APIUserAbortError();
                }
                if (!timedOut) {
                    throw error;
                }
                const retriesRemaining = attempt?.retriesRemaining ?? 0;
                if (!retriesRemaining ||
                    props.options.__metadata?.['hasStreamingBody'] ||
                    (globalThis.ReadableStream &&
                        props.options.body instanceof globalThis.ReadableStream) ||
                    (typeof props.options.body === 'object' &&
                        props.options.body !== null &&
                        (Symbol.asyncIterator in props.options.body ||
                            (Symbol.iterator in props.options.body &&
                                'next' in props.options.body &&
                                typeof props.options.body.next === 'function')))) {
                    throw new Errors.APIConnectionTimeoutError();
                }
                if (timer !== undefined)
                    clearTimeout(timer);
                if (abortListener)
                    callerSignal?.removeEventListener('abort', abortListener);
                abortListener = undefined;
                const next = await this.retryRequest(props.options, retriesRemaining, props.retryOfRequestLogID ?? props.requestLogID);
                Object.assign(props, next);
            }
            finally {
                if (timer !== undefined)
                    clearTimeout(timer);
                if (abortListener)
                    callerSignal?.removeEventListener('abort', abortListener);
            }
        }
    }
    async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
        const options = await optionsInput;
        const maxRetries = options.maxRetries ?? this.maxRetries;
        if (retriesRemaining == null) {
            retriesRemaining = maxRetries;
        }
        await this.prepareOptions(options);
        const { req, url, timeout } = await this.buildRequest(options, {
            retryCount: maxRetries - retriesRemaining,
        });
        const hasStreamingBody = options.__metadata?.['hasStreamingBody'] === true;
        await this.prepareRequest(req, { url, options });
        await this._provider?.prepareRequest?.(req, { url, options });
        /** Not an API request ID, just for correlating local log entries. */
        const requestLogID = 'log_' + ((Math.random() * (1 << 24)) | 0).toString(16).padStart(6, '0');
        const retryLogStr = retryOfRequestLogID === undefined ? '' : `, retryOf: ${retryOfRequestLogID}`;
        const startTime = Date.now();
        (0, log_1.loggerFor)(this).debug(`[${requestLogID}] sending request`, (0, log_1.formatRequestDetails)({
            retryOfRequestLogID,
            method: options.method,
            url,
            options,
            headers: req.headers,
        }));
        if (options.signal?.aborted || req.signal?.aborted) {
            throw this._makeUserAbortError(options.signal?.aborted ? options.signal : req.signal);
        }
        const security = options.__security ?? { bearerAuth: true };
        // Request hooks may replace the caller signal before it reaches fetch.
        const controller = this.fetchWithTimeout === _a.prototype.fetchWithTimeout
            ? createRequestController(req.signal)
            : new AbortController();
        const response = await this.fetchWithAuth(url, req, timeout, controller, security).catch(errors_1.castToError);
        const headersTime = Date.now();
        if (response instanceof globalThis.Error) {
            const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
            if (options.signal?.aborted || req.signal?.aborted) {
                throw this._makeUserAbortError(options.signal?.aborted ? options.signal : req.signal);
            }
            // detect native connection timeout errors
            // deno throws "TypeError: error sending request for url (https://example/): client error (Connect): tcp connect error: Operation timed out (os error 60): Operation timed out (os error 60)"
            // undici throws "TypeError: fetch failed" with cause "ConnectTimeoutError: Connect Timeout Error (attempted address: example:443, timeout: 1ms)"
            // others do not provide enough information to distinguish timeouts from other connection errors
            const isTimeout = (0, errors_1.isAbortError)(response) ||
                /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
            if (retriesRemaining && !hasStreamingBody) {
                (0, log_1.loggerFor)(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`);
                (0, log_1.loggerFor)(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${retryMessage})`, (0, log_1.formatRequestDetails)({
                    retryOfRequestLogID,
                    url,
                    durationMs: headersTime - startTime,
                    message: response.message,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
            }
            const terminalMessage = hasStreamingBody
                ? 'error; streaming body cannot be retried'
                : 'error; no more retries left';
            (0, log_1.loggerFor)(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${terminalMessage}`);
            (0, log_1.loggerFor)(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${terminalMessage})`, (0, log_1.formatRequestDetails)({
                retryOfRequestLogID,
                url,
                durationMs: headersTime - startTime,
                message: response.message,
            }));
            if (response instanceof error_1.OAuthError || response instanceof error_1.SubjectTokenProviderError) {
                throw response;
            }
            if (isTimeout) {
                const transportCause = 'cause' in response ? response.cause : undefined;
                const isHeadersTimeout = typeof transportCause === 'object' &&
                    transportCause !== null &&
                    'code' in transportCause &&
                    transportCause.code === 'UND_ERR_HEADERS_TIMEOUT';
                const timeoutError = isHeadersTimeout
                    ? new Errors.APIConnectionTimeoutError({
                        message: 'Request timed out. Node.js fetch timed out waiting for response headers; ' +
                            'configure a matching undici fetch and fetchOptions.dispatcher with an Agent whose headersTimeout is at least the SDK timeout.',
                    })
                    : new Errors.APIConnectionTimeoutError();
                throw Object.assign(timeoutError, { cause: response });
            }
            throw new Errors.APIConnectionError({
                message: getConnectionErrorMessage(response),
                cause: response,
            });
        }
        const specialHeaders = [...response.headers.entries()]
            .filter(([name]) => name === 'x-request-id')
            .map(([name, value]) => ', ' + name + ': ' + JSON.stringify(value))
            .join('');
        const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? 'succeeded' : 'failed'} with status ${response.status} in ${headersTime - startTime}ms`;
        if (!response.ok) {
            if (response.status === 401 &&
                this._workloadIdentityAuth &&
                security.bearerAuth &&
                !options.__metadata?.['hasStreamingBody'] &&
                !options.__metadata?.['workloadIdentityTokenRefreshed']) {
                await Shims.CancelReadableStream(response.body);
                this._workloadIdentityAuth.invalidateToken();
                return this.makeRequest({
                    ...options,
                    __metadata: {
                        ...options.__metadata,
                        workloadIdentityTokenRefreshed: true,
                    },
                }, retriesRemaining, retryOfRequestLogID ?? requestLogID);
            }
            const shouldRetry = await this.shouldRetry(response);
            if (retriesRemaining && shouldRetry && !hasStreamingBody) {
                const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
                // We don't need the body of this response.
                await Shims.CancelReadableStream(response.body);
                (0, log_1.loggerFor)(this).info(`${responseInfo} - ${retryMessage}`);
                (0, log_1.loggerFor)(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0, log_1.formatRequestDetails)({
                    retryOfRequestLogID,
                    url: response.url,
                    status: response.status,
                    headers: response.headers,
                    durationMs: headersTime - startTime,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
            }
            const retryMessage = shouldRetry
                ? hasStreamingBody
                    ? `error; streaming body cannot be retried`
                    : `error; no more retries left`
                : `error; not retryable`;
            (0, log_1.loggerFor)(this).info(`${responseInfo} - ${retryMessage}`);
            const errText = await response.text().catch((err) => (0, errors_1.castToError)(err).message);
            const errJSON = (0, values_1.safeJSON)(errText);
            const errMessage = errJSON ? undefined : errText;
            (0, log_1.loggerFor)(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0, log_1.formatRequestDetails)({
                retryOfRequestLogID,
                url: response.url,
                status: response.status,
                headers: response.headers,
                message: errMessage,
                durationMs: Date.now() - startTime,
            }));
            const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
            throw err;
        }
        (0, log_1.loggerFor)(this).info(responseInfo);
        (0, log_1.loggerFor)(this).debug(`[${requestLogID}] response start`, (0, log_1.formatRequestDetails)({
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime,
        }));
        tslib_1.__classPrivateFieldGet(this, _OpenAI_responseAttempts, "f").set(controller, { timeout, retriesRemaining });
        return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
    }
    getAPIList(path, Page, opts) {
        return this.requestAPIList(Page, opts && 'then' in opts
            ? opts.then((opts) => ({ method: 'get', path, ...opts }))
            : { method: 'get', path, ...opts });
    }
    requestAPIList(Page, options) {
        const request = this.makeRequest(options, null, undefined);
        const page = new Pagination.PagePromise(this, request, Page);
        const guarded = this.responsePromise(request, async (client, props) => {
            const body = await this.parseResponseWithTimeout(client, props);
            return new Page(client, props.response, body, props.options);
        });
        page.then = guarded.then.bind(guarded);
        page.catch = guarded.catch.bind(guarded);
        page.finally = guarded.finally.bind(guarded);
        page.withResponse = guarded.withResponse.bind(guarded);
        page._thenUnwrap = guarded._thenUnwrap.bind(guarded);
        return page;
    }
    async fetchWithAuth(url, init, timeout, controller, schemes = {
        bearerAuth: true,
        adminAPIKeyAuth: true,
    }) {
        if (this._workloadIdentityAuth && schemes.bearerAuth) {
            const headers = init.headers;
            const authHeader = headers.get('Authorization');
            if (!authHeader || authHeader === `Bearer ${WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER}`) {
                const token = await this._workloadIdentityAuth.getToken();
                headers.set('Authorization', `Bearer ${token}`);
            }
        }
        const response = await this.fetchWithTimeout(url, init, timeout, controller);
        return response;
    }
    async fetchWithTimeout(url, init, ms, controller) {
        const { signal, method, ...options } = init || {};
        const abort = this._makeAbort(controller);
        const composed = !!signal && composedCallerSignals.get(controller) === signal;
        if (signal && !composed)
            signal.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(abort, ms);
        const isReadableBody = (globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream) ||
            (typeof options.body === 'object' && options.body !== null && Symbol.asyncIterator in options.body);
        const fetchOptions = {
            signal: controller.signal,
            ...(isReadableBody ? { duplex: 'half' } : {}),
            method: 'GET',
            ...options,
        };
        if (method) {
            // Custom methods like 'patch' need to be uppercased
            // See https://github.com/nodejs/undici/issues/2294
            fetchOptions.method = method.toUpperCase();
        }
        try {
            // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
            return await this.fetch.call(undefined, url, fetchOptions);
        }
        catch (err) {
            if (signal && !composed)
                signal.removeEventListener('abort', abort);
            throw err;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async shouldRetry(response) {
        // Note this is not a standard header.
        const shouldRetryHeader = response.headers.get('x-should-retry');
        // If the server explicitly says whether or not to retry, obey.
        if (shouldRetryHeader === 'true')
            return true;
        if (shouldRetryHeader === 'false')
            return false;
        // Retry on request timeouts.
        if (response.status === 408)
            return true;
        // Retry on lock timeouts.
        if (response.status === 409)
            return true;
        // Retry on rate limits.
        if (response.status === 429)
            return true;
        // Retry internal errors.
        if (response.status >= 500)
            return true;
        return false;
    }
    async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
        let timeoutMillis;
        // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
        const retryAfterMillisHeader = responseHeaders?.get('retry-after-ms');
        if (retryAfterMillisHeader) {
            const timeoutMs = parseFloat(retryAfterMillisHeader);
            if (!Number.isNaN(timeoutMs)) {
                timeoutMillis = timeoutMs;
            }
        }
        // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
        const retryAfterHeader = responseHeaders?.get('retry-after');
        if (retryAfterHeader && timeoutMillis === undefined) {
            const timeoutSeconds = parseFloat(retryAfterHeader);
            if (!Number.isNaN(timeoutSeconds)) {
                timeoutMillis = timeoutSeconds * 1000;
            }
            else {
                timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
            }
        }
        // If the API asks us to wait a certain amount of time, just do what it
        // says, but otherwise calculate a default
        if (timeoutMillis === undefined ||
            !Number.isFinite(timeoutMillis) ||
            timeoutMillis < 0 ||
            timeoutMillis > 60 * 1000) {
            const maxRetries = options.maxRetries ?? this.maxRetries;
            timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
        }
        await (0, sleep_1.sleep)(timeoutMillis);
        return this.makeRequest(options, retriesRemaining - 1, requestLogID);
    }
    calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
        const initialRetryDelay = 0.5;
        const maxRetryDelay = 8.0;
        const numRetries = maxRetries - retriesRemaining;
        // Apply exponential backoff, but not more than the max.
        const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
        // Apply some jitter, take up to at most 25 percent of the retry time.
        const jitter = 1 - Math.random() * 0.25;
        return sleepSeconds * jitter * 1000;
    }
    async buildRequest(inputOptions, { retryCount = 0 } = {}) {
        const options = { ...inputOptions };
        const { method, path, query, defaultBaseURL } = options;
        const url = this.buildURL(path, query, defaultBaseURL);
        if ('timeout' in options)
            (0, values_1.validatePositiveInteger)('timeout', options.timeout);
        options.timeout = options.timeout ?? this.timeout;
        const { bodyHeaders, body, isStreamingBody } = this.buildBody({ options });
        if (isStreamingBody) {
            inputOptions.__metadata = {
                ...inputOptions.__metadata,
                hasStreamingBody: true,
            };
        }
        const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
        const req = {
            method,
            headers: reqHeaders,
            ...(options.signal && { signal: options.signal }),
            ...(globalThis.ReadableStream &&
                body instanceof globalThis.ReadableStream && { duplex: 'half' }),
            ...(body && { body }),
            ...(this.fetchOptions ?? {}),
            ...(options.fetchOptions ?? {}),
        };
        return { req, url, timeout: options.timeout };
    }
    async buildHeaders({ options, method, bodyHeaders, retryCount, }) {
        let idempotencyHeaders = {};
        if (this.idempotencyHeader && method !== 'get') {
            if (!options.idempotencyKey)
                options.idempotencyKey = this.defaultIdempotencyKey();
            idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
        }
        const helperMethod = options.__metadata?.['helperMethod'];
        const headers = (0, headers_1.buildHeaders)([
            idempotencyHeaders,
            {
                Accept: 'application/json',
                ...(!isRunningInBrowserOrBrowserWorker() ? { 'User-Agent': this.getUserAgent() } : undefined),
                'X-Stainless-Retry-Count': String(retryCount),
                ...(options.timeout ? { 'X-Stainless-Timeout': String(Math.trunc(options.timeout / 1000)) } : {}),
                ...(0, detect_platform_1.getPlatformHeaders)(),
                ...(typeof helperMethod === 'string' ? { 'X-Stainless-Helper-Method': helperMethod } : {}),
                'OpenAI-Organization': this.organization,
                'OpenAI-Project': this.project,
            },
            this._provider
                ? undefined
                : await this.authHeaders(options, options.__security ?? { bearerAuth: true }),
            this._options.defaultHeaders,
            bodyHeaders,
            options.headers,
        ]);
        if (!this._provider) {
            this.validateHeaders(headers, options.__security ?? { bearerAuth: true });
        }
        return headers.values;
    }
    _makeAbort(controller) {
        // note: we can't just inline this method inside `fetchWithTimeout()` because then the closure
        //       would capture all request options, and cause a memory leak.
        return () => controller.abort();
    }
    _makeUserAbortError(signal) {
        const error = new Errors.APIUserAbortError();
        Object.defineProperty(error, 'cause', { value: signal.reason, writable: true, configurable: true });
        return error;
    }
    buildBody({ options }) {
        const { body, headers: rawHeaders } = options;
        if (!body) {
            // A resource method always passes a `body` key when its operation defines a
            // request body, even if the caller omitted an optional body param. Keep the
            // content-type for those, and only elide it for operations with no body at
            // all (e.g. GET/DELETE).
            if (body === undefined && 'body' in options) {
                return { ...tslib_1.__classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, { body, headers: (0, headers_1.buildHeaders)([rawHeaders]) }), isStreamingBody: false };
            }
            return { bodyHeaders: undefined, body: undefined, isStreamingBody: false };
        }
        const headers = (0, headers_1.buildHeaders)([rawHeaders]);
        const isReadableStream = typeof globalThis.ReadableStream !== 'undefined' &&
            body instanceof globalThis.ReadableStream;
        const isRetryableBody = !isReadableStream &&
            (typeof body === 'string' ||
                body instanceof ArrayBuffer ||
                ArrayBuffer.isView(body) ||
                (typeof globalThis.Blob !== 'undefined' && body instanceof globalThis.Blob) ||
                body instanceof URLSearchParams ||
                body instanceof FormData);
        if (
        // Pass raw type verbatim
        ArrayBuffer.isView(body) ||
            body instanceof ArrayBuffer ||
            body instanceof DataView ||
            (typeof body === 'string' &&
                // Preserve legacy string encoding behavior for now
                headers.values.has('content-type')) ||
            // `Blob` is superset of `File`
            (globalThis.Blob && body instanceof globalThis.Blob) ||
            // `FormData` -> `multipart/form-data`
            body instanceof FormData ||
            // `URLSearchParams` -> `application/x-www-form-urlencoded`
            body instanceof URLSearchParams ||
            // Send chunked stream (each chunk has own `length`)
            isReadableStream) {
            return { bodyHeaders: undefined, body: body, isStreamingBody: !isRetryableBody };
        }
        else if (typeof body === 'object' &&
            (Symbol.asyncIterator in body ||
                (Symbol.iterator in body && 'next' in body && typeof body.next === 'function'))) {
            return {
                bodyHeaders: undefined,
                body: Shims.ReadableStreamFrom(body),
                isStreamingBody: true,
            };
        }
        else if (typeof body === 'object' &&
            headers.values.get('content-type') === 'application/x-www-form-urlencoded') {
            return {
                bodyHeaders: { 'content-type': 'application/x-www-form-urlencoded' },
                body: this.stringifyQuery(body),
                isStreamingBody: false,
            };
        }
        else {
            return { ...tslib_1.__classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, { body, headers }), isStreamingBody: false };
        }
    }
}
exports.OpenAI = OpenAI;
_a = OpenAI, _OpenAI_encoder = new WeakMap(), _OpenAI_responseAttempts = new WeakMap(), _OpenAI_instances = new WeakSet(), _OpenAI_baseURLOverridden = function _OpenAI_baseURLOverridden() {
    return this._provider !== undefined || this.baseURL !== 'https://api.openai.com/v1';
};
OpenAI.OpenAI = _a;
OpenAI.DEFAULT_TIMEOUT = 600000; // 10 minutes
OpenAI.OpenAIError = Errors.OpenAIError;
OpenAI.APIError = Errors.APIError;
OpenAI.APIConnectionError = Errors.APIConnectionError;
OpenAI.APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
OpenAI.APIUserAbortError = Errors.APIUserAbortError;
OpenAI.NotFoundError = Errors.NotFoundError;
OpenAI.ConflictError = Errors.ConflictError;
OpenAI.RateLimitError = Errors.RateLimitError;
OpenAI.BadRequestError = Errors.BadRequestError;
OpenAI.AuthenticationError = Errors.AuthenticationError;
OpenAI.InternalServerError = Errors.InternalServerError;
OpenAI.PermissionDeniedError = Errors.PermissionDeniedError;
OpenAI.UnprocessableEntityError = Errors.UnprocessableEntityError;
OpenAI.InvalidWebhookSignatureError = Errors.InvalidWebhookSignatureError;
OpenAI.toFile = Uploads.toFile;
OpenAI.toStreamingFile = Uploads.toStreamingFile;
OpenAI.Completions = completions_1.Completions;
OpenAI.Chat = chat_1.Chat;
OpenAI.Embeddings = embeddings_1.Embeddings;
OpenAI.Files = files_1.Files;
OpenAI.Images = images_1.Images;
OpenAI.ContentProvenanceChecks = content_provenance_checks_1.ContentProvenanceChecks;
OpenAI.Audio = audio_1.Audio;
OpenAI.Moderations = moderations_1.Moderations;
OpenAI.Models = models_1.Models;
OpenAI.FineTuning = fine_tuning_1.FineTuning;
OpenAI.Graders = graders_1.Graders;
OpenAI.VectorStores = vector_stores_1.VectorStores;
OpenAI.Webhooks = webhooks_1.Webhooks;
OpenAI.Beta = beta_1.Beta;
OpenAI.Batches = batches_1.Batches;
OpenAI.Uploads = uploads_1.Uploads;
OpenAI.Admin = admin_1.Admin;
OpenAI.Responses = responses_1.Responses;
OpenAI.Realtime = realtime_1.Realtime;
OpenAI.Conversations = conversations_1.Conversations;
OpenAI.Evals = evals_1.Evals;
OpenAI.Containers = containers_1.Containers;
OpenAI.Skills = skills_1.Skills;
OpenAI.Videos = videos_1.Videos;
const composedCallerSignals = new WeakMap();
function createRequestController(callerSignal) {
    const controller = new AbortController();
    if (!callerSignal)
        return controller;
    const nativeAbortSignal = globalThis.AbortSignal;
    if (typeof nativeAbortSignal?.any !== 'function' || !(callerSignal instanceof nativeAbortSignal)) {
        return controller;
    }
    try {
        // Native composition keeps cancellation active after response headers without
        // retaining an abort listener on the caller's signal or changing its reason.
        const composed = nativeAbortSignal.any([controller.signal, callerSignal]);
        Object.defineProperty(controller, 'signal', { value: composed, configurable: true });
        composedCallerSignals.set(controller, callerSignal);
    }
    catch {
        // Older or incompatible runtimes retain the existing listener-based fallback.
    }
    return controller;
}
function getConnectionErrorMessage(error) {
    if (isUndiciDispatcherVersionMismatchError(error)) {
        return `Connection error. This may be caused by passing an undici dispatcher, such as ProxyAgent, that is incompatible with the fetch implementation. If you are using undici's ProxyAgent, pass the fetch implementation from the same undici package: import { fetch, ProxyAgent } from 'undici'; new OpenAI({ fetch, fetchOptions: { dispatcher: new ProxyAgent(...) } });`;
    }
    return undefined;
}
function isUndiciDispatcherVersionMismatchError(error) {
    let current = error;
    for (let i = 0; i < 8 && current && typeof current === 'object'; i++) {
        const err = current;
        if (err.code === 'UND_ERR_INVALID_ARG' &&
            typeof err.message === 'string' &&
            err.message.includes('invalid onRequestStart method')) {
            return true;
        }
        current = err.cause;
    }
    return false;
}
//# sourceMappingURL=client.js.map

/***/ }),

/***/ 1999:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _APIPromise_client;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.APIPromise = void 0;
const tslib_1 = __nccwpck_require__(2345);
const parse_1 = __nccwpck_require__(3426);
/**
 * A subclass of `Promise` providing additional helper methods
 * for interacting with the SDK.
 */
class APIPromise extends Promise {
    constructor(client, responsePromise, parseResponse = parse_1.defaultParseResponse) {
        super((resolve) => {
            // this is maybe a bit weird but this has to be a no-op to not implicitly
            // parse the response body; instead .then, .catch, .finally are overridden
            // to parse the response
            resolve(null);
        });
        this.responsePromise = responsePromise;
        this.parseResponse = parseResponse;
        _APIPromise_client.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _APIPromise_client, client, "f");
    }
    _thenUnwrap(transform) {
        return new APIPromise(tslib_1.__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => (0, parse_1.addRequestID)(transform(await this.parseResponse(client, props), props), props.response));
    }
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    asResponse() {
        return this.responsePromise.then((p) => p.response);
    }
    /**
     * Gets the parsed response data, the raw `Response` instance and the ID of the request,
     * returned via the X-Request-ID header which is useful for debugging requests and reporting
     * issues to OpenAI.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    async withResponse() {
        const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
        return { data, response, request_id: response.headers.get('x-request-id') };
    }
    parse() {
        if (!this.parsedPromise) {
            this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(tslib_1.__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
        }
        return this.parsedPromise;
    }
    then(onfulfilled, onrejected) {
        return this.parse().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.parse().catch(onrejected);
    }
    finally(onfinally) {
        return this.parse().finally(onfinally);
    }
}
exports.APIPromise = APIPromise;
_APIPromise_client = new WeakMap();
//# sourceMappingURL=api-promise.js.map

/***/ }),

/***/ 5093:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SubjectTokenProviderError = exports.OAuthError = exports.InvalidWebhookSignatureError = exports.ContentFilterFinishReasonError = exports.LengthFinishReasonError = exports.InternalServerError = exports.RateLimitError = exports.UnprocessableEntityError = exports.ConflictError = exports.NotFoundError = exports.PermissionDeniedError = exports.AuthenticationError = exports.BadRequestError = exports.APIConnectionTimeoutError = exports.APIConnectionError = exports.APIUserAbortError = exports.APIError = exports.OpenAIError = void 0;
const errors_1 = __nccwpck_require__(7698);
class OpenAIError extends Error {
}
exports.OpenAIError = OpenAIError;
class APIError extends OpenAIError {
    constructor(status, error, message, headers) {
        super(`${APIError.makeMessage(status, error, message)}`);
        this.status = status;
        this.headers = headers;
        this.requestID = headers?.get('x-request-id');
        this.error = error;
        const data = error;
        this.code = data?.['code'];
        this.param = data?.['param'];
        this.type = data?.['type'];
    }
    static makeMessage(status, error, message) {
        const msg = error?.message
            ? typeof error.message === 'string'
                ? error.message
                : JSON.stringify(error.message)
            : error
                ? JSON.stringify(error)
                : message;
        if (status && msg) {
            return `${status} ${msg}`;
        }
        if (status) {
            return `${status} status code (no body)`;
        }
        if (msg) {
            return msg;
        }
        return '(no status code or body)';
    }
    static generate(status, errorResponse, message, headers) {
        if (!status || !headers) {
            return new APIConnectionError({ message, cause: (0, errors_1.castToError)(errorResponse) });
        }
        const error = errorResponse?.['error'];
        if (status === 400) {
            return new BadRequestError(status, error, message, headers);
        }
        if (status === 401) {
            return new AuthenticationError(status, error, message, headers);
        }
        if (status === 403) {
            return new PermissionDeniedError(status, error, message, headers);
        }
        if (status === 404) {
            return new NotFoundError(status, error, message, headers);
        }
        if (status === 409) {
            return new ConflictError(status, error, message, headers);
        }
        if (status === 422) {
            return new UnprocessableEntityError(status, error, message, headers);
        }
        if (status === 429) {
            return new RateLimitError(status, error, message, headers);
        }
        if (status >= 500) {
            return new InternalServerError(status, error, message, headers);
        }
        return new APIError(status, error, message, headers);
    }
}
exports.APIError = APIError;
class APIUserAbortError extends APIError {
    constructor({ message } = {}) {
        super(undefined, undefined, message || 'Request was aborted.', undefined);
    }
}
exports.APIUserAbortError = APIUserAbortError;
class APIConnectionError extends APIError {
    constructor({ message, cause }) {
        super(undefined, undefined, message || 'Connection error.', undefined);
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause)
            this.cause = cause;
    }
}
exports.APIConnectionError = APIConnectionError;
class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message } = {}) {
        super({ message: message ?? 'Request timed out.' });
    }
}
exports.APIConnectionTimeoutError = APIConnectionTimeoutError;
class BadRequestError extends APIError {
}
exports.BadRequestError = BadRequestError;
class AuthenticationError extends APIError {
}
exports.AuthenticationError = AuthenticationError;
class PermissionDeniedError extends APIError {
}
exports.PermissionDeniedError = PermissionDeniedError;
class NotFoundError extends APIError {
}
exports.NotFoundError = NotFoundError;
class ConflictError extends APIError {
}
exports.ConflictError = ConflictError;
class UnprocessableEntityError extends APIError {
}
exports.UnprocessableEntityError = UnprocessableEntityError;
class RateLimitError extends APIError {
}
exports.RateLimitError = RateLimitError;
class InternalServerError extends APIError {
}
exports.InternalServerError = InternalServerError;
class LengthFinishReasonError extends OpenAIError {
    constructor() {
        super(`Could not parse response content as the length limit was reached`);
    }
}
exports.LengthFinishReasonError = LengthFinishReasonError;
class ContentFilterFinishReasonError extends OpenAIError {
    constructor() {
        super(`Could not parse response content as the request was rejected by the content filter`);
    }
}
exports.ContentFilterFinishReasonError = ContentFilterFinishReasonError;
class InvalidWebhookSignatureError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
/**
 * Error thrown by the API server during OAuth token exchange.
 * Can have status codes 400, 401, or 403.
 * Other status codes from OAuth endpoints are raised as normal APIError types.
 */
class OAuthError extends APIError {
    constructor(status, error, headers) {
        let finalMessage = 'OAuth2 authentication error';
        let error_code = undefined;
        if (error && typeof error === 'object') {
            const errorData = error;
            error_code = errorData['error'];
            const description = errorData['error_description'];
            if (description && typeof description === 'string') {
                finalMessage = description;
            }
            else if (error_code) {
                finalMessage = error_code;
            }
        }
        super(status, error, finalMessage, headers);
        this.error_code = error_code;
    }
}
exports.OAuthError = OAuthError;
class SubjectTokenProviderError extends OpenAIError {
    constructor(message, provider, cause) {
        super(message);
        this.provider = provider;
        this.cause = cause;
    }
}
exports.SubjectTokenProviderError = SubjectTokenProviderError;
//# sourceMappingURL=error.js.map

/***/ }),

/***/ 2155:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _AbstractPage_client;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NextCursorPage = exports.ConversationCursorPage = exports.CursorPage = exports.Page = exports.PagePromise = exports.AbstractPage = void 0;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(5093);
const parse_1 = __nccwpck_require__(3426);
const api_promise_1 = __nccwpck_require__(1999);
const values_1 = __nccwpck_require__(7325);
class AbstractPage {
    constructor(client, response, body, options) {
        _AbstractPage_client.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _AbstractPage_client, client, "f");
        this.options = options;
        this.response = response;
        this.body = body;
    }
    hasNextPage() {
        const items = this.getPaginatedItems();
        if (!items.length)
            return false;
        return this.nextPageRequestOptions() != null;
    }
    async getNextPage() {
        const nextOptions = this.nextPageRequestOptions();
        if (!nextOptions) {
            throw new error_1.OpenAIError('No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.');
        }
        return await tslib_1.__classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
    }
    async *iterPages() {
        let page = this;
        yield page;
        while (page.hasNextPage()) {
            page = await page.getNextPage();
            yield page;
        }
    }
    async *[(_AbstractPage_client = new WeakMap(), Symbol.asyncIterator)]() {
        for await (const page of this.iterPages()) {
            for (const item of page.getPaginatedItems()) {
                yield item;
            }
        }
    }
}
exports.AbstractPage = AbstractPage;
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
class PagePromise extends api_promise_1.APIPromise {
    constructor(client, request, Page) {
        super(client, request, async (client, props) => new Page(client, props.response, await (0, parse_1.defaultParseResponse)(client, props), props.options));
    }
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */
    async *[Symbol.asyncIterator]() {
        const page = await this;
        for await (const item of page) {
            yield item;
        }
    }
}
exports.PagePromise = PagePromise;
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
class Page extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.object = body.object;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    nextPageRequestOptions() {
        return null;
    }
}
exports.Page = Page;
class CursorPage extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const data = this.getPaginatedItems();
        const id = data[data.length - 1]?.id;
        if (!id) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                after: id,
            },
        };
    }
}
exports.CursorPage = CursorPage;
class ConversationCursorPage extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.last_id = body.last_id || '';
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const cursor = this.last_id;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                after: cursor,
            },
        };
    }
}
exports.ConversationCursorPage = ConversationCursorPage;
class NextCursorPage extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.next = body.next || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const cursor = this.next;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                after: cursor,
            },
        };
    }
}
exports.NextCursorPage = NextCursorPage;
//# sourceMappingURL=pagination.js.map

/***/ }),

/***/ 9487:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.APIResource = void 0;
class APIResource {
    constructor(client) {
        this._client = client;
    }
}
exports.APIResource = APIResource;
//# sourceMappingURL=resource.js.map

/***/ }),

/***/ 7787:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _Stream_client;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Stream = void 0;
exports._iterSSEMessages = _iterSSEMessages;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(5093);
const shims_1 = __nccwpck_require__(7831);
const line_1 = __nccwpck_require__(717);
const errors_1 = __nccwpck_require__(7698);
const bytes_1 = __nccwpck_require__(9948);
const log_1 = __nccwpck_require__(6273);
/**
 * A single-consumption asynchronous API response stream.
 *
 * Use {@link Stream.tee} when two consumers need the same events. Breaking out of
 * a response-backed stream early aborts its request; branches created by `tee()`
 * instead share {@link Stream.controller} for explicit cancellation.
 */
class Stream {
    /** Wraps an asynchronous event iterator and the controller that owns its request. */
    constructor(iterator, controller, client) {
        _Stream_client.set(this, void 0);
        this.iterator = iterator;
        this.controller = controller;
        tslib_1.__classPrivateFieldSet(this, _Stream_client, client, "f");
    }
    /**
     * Decodes an SSE response into parsed JSON events.
     *
     * The resulting stream can be consumed only once, ignores events after `[DONE]`, and
     * surfaces API error payloads as `APIError` instances. When
     * `synthesizeEventData` is enabled, each item also includes its SSE event name.
     */
    static fromSSEResponse(response, controller, client, synthesizeEventData) {
        let consumed = false;
        const logger = client ? (0, log_1.loggerFor)(client) : console;
        async function* iterator() {
            if (consumed) {
                throw new error_1.OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            let receivedCompletionSentinel = false;
            try {
                for await (const sse of _iterSSEMessages(response, controller)) {
                    if (sse.data.startsWith('[DONE]')) {
                        receivedCompletionSentinel = true;
                        break;
                    }
                    if (sse.event === null || !sse.event.startsWith('thread.')) {
                        let data;
                        try {
                            data = JSON.parse(sse.data);
                        }
                        catch (e) {
                            logger.error(`Could not parse message into JSON:`, sse.data);
                            logger.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                        if (data && data.error) {
                            throw new error_1.APIError(undefined, data.error, undefined, response.headers);
                        }
                        yield synthesizeEventData ? { event: sse.event, data } : data;
                    }
                    else {
                        let data;
                        try {
                            data = JSON.parse(sse.data);
                        }
                        catch (e) {
                            console.error(`Could not parse message into JSON:`, sse.data);
                            console.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                        // SSE error events surface as APIError instances.
                        if (sse.event === 'error') {
                            throw new error_1.APIError(undefined, data.error, data.message, undefined);
                        }
                        yield { event: sse.event, data };
                    }
                }
                done = true;
            }
            catch (e) {
                // Abort errors and cleanup failures after the completion sentinel are non-fatal.
                if (receivedCompletionSentinel ||
                    (0, errors_1.isAbortError)(e) ||
                    (controller.signal.aborted && e === controller.signal.reason)) {
                    return;
                }
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done) {
                    controller.abort();
                }
            }
        }
        return new Stream(iterator, controller, client);
    }
    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream(readableStream, controller, client) {
        let consumed = false;
        async function* iterLines() {
            const lineDecoder = new line_1.LineDecoder();
            const reader = readableStream.getReader();
            let closed = false;
            let cancelPromise;
            const cancel = () => {
                cancelPromise ?? (cancelPromise = reader.cancel());
                cancelPromise.catch(() => undefined);
            };
            controller.signal.addEventListener('abort', cancel, { once: true });
            try {
                if (controller.signal.aborted) {
                    cancel();
                    return;
                }
                while (true) {
                    const { value: chunk, done } = await reader.read();
                    if (done) {
                        closed = true;
                        break;
                    }
                    if (controller.signal.aborted) {
                        return;
                    }
                    for (const line of lineDecoder.decode(chunk)) {
                        if (controller.signal.aborted) {
                            return;
                        }
                        yield line;
                    }
                }
                if (controller.signal.aborted) {
                    return;
                }
                for (const line of lineDecoder.flush()) {
                    if (controller.signal.aborted) {
                        return;
                    }
                    yield line;
                }
            }
            finally {
                controller.signal.removeEventListener('abort', cancel);
                if (!closed) {
                    cancel();
                }
                reader.releaseLock();
            }
        }
        async function* iterator() {
            if (consumed) {
                throw new error_1.OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            try {
                for await (const line of iterLines()) {
                    if (done) {
                        continue;
                    }
                    if (line) {
                        yield JSON.parse(line);
                    }
                }
                done = true;
            }
            catch (e) {
                // If the user calls `stream.controller.abort()`, we should exit without throwing.
                if (controller.signal.aborted || (0, errors_1.isAbortError)(e)) {
                    return;
                }
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done) {
                    controller.abort();
                }
            }
        }
        return new Stream(iterator, controller, client);
    }
    /** Starts consuming this stream; attempting to consume it again throws. */
    [(_Stream_client = new WeakMap(), Symbol.asyncIterator)]() {
        return this.iterator();
    }
    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee() {
        const left = [];
        const right = [];
        const iterator = this.iterator();
        const teeIterator = (queue) => ({
            next: () => {
                if (queue.length === 0) {
                    const result = iterator.next();
                    left.push(result);
                    right.push(result);
                }
                return queue.shift();
            },
        });
        return [
            new Stream(() => teeIterator(left), this.controller, tslib_1.__classPrivateFieldGet(this, _Stream_client, "f")),
            new Stream(() => teeIterator(right), this.controller, tslib_1.__classPrivateFieldGet(this, _Stream_client, "f")),
        ];
    }
    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream() {
        let iter;
        return (0, shims_1.makeReadableStream)({
            start: async () => {
                iter = this[Symbol.asyncIterator]();
            },
            async pull(ctrl) {
                try {
                    const { value, done } = await iter.next();
                    if (done) {
                        return ctrl.close();
                    }
                    const bytes = (0, bytes_1.encodeUTF8)(JSON.stringify(value) + '\n');
                    ctrl.enqueue(bytes);
                }
                catch (err) {
                    ctrl.error(err);
                }
            },
            async cancel() {
                await iter.return?.();
            },
        });
    }
}
exports.Stream = Stream;
/**
 * Decodes complete SSE records from a response and aborts when its body is absent.
 *
 * @yields {ServerSentEvent} Each decoded server-sent event in wire order.
 */
async function* _iterSSEMessages(response, controller) {
    if (!response.body) {
        controller.abort();
        if (globalThis.navigator !== undefined &&
            globalThis.navigator.product === 'ReactNative') {
            throw new error_1.OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
        }
        throw new error_1.OpenAIError(`Attempted to iterate over a response with no body`);
    }
    const sseDecoder = new SSEDecoder();
    const lineDecoder = new line_1.LineDecoder();
    const iter = (0, shims_1.ReadableStreamToAsyncIterable)(response.body);
    for await (const sseChunk of iterSSEChunks(iter)) {
        for (const line of lineDecoder.decode(sseChunk)) {
            const sse = sseDecoder.decode(line);
            if (sse) {
                yield sse;
            }
        }
    }
    for (const line of lineDecoder.flush()) {
        const sse = sseDecoder.decode(line);
        if (sse) {
            yield sse;
        }
    }
}
// A `\r\n\r\n` separator may retain up to three bytes from the previous chunk.
const DOUBLE_NEWLINE_DELIMITER_MAX_OVERLAP_BYTES = 3;
/**
 * Given an async iterable iterator, iterates over it and yields full
 * SSE chunks, i.e. yields when a double new-line is encountered.
 *
 * @yields {Uint8Array} A complete SSE chunk.
 */
async function* iterSSEChunks(iterator) {
    let data = new Uint8Array();
    let dataStart = 0;
    let dataEnd = 0;
    let searchStartIndex = 0;
    for await (const chunk of iterator) {
        if (chunk == null) {
            continue;
        }
        let binaryChunk;
        if (chunk instanceof ArrayBuffer) {
            binaryChunk = new Uint8Array(chunk);
        }
        else if (typeof chunk === 'string') {
            binaryChunk = (0, bytes_1.encodeUTF8)(chunk);
        }
        else {
            binaryChunk = chunk;
        }
        if (dataEnd + binaryChunk.length > data.length) {
            const bufferedLength = dataEnd - dataStart;
            // Compact only when it reclaims substantial space without moving a large live tail repeatedly.
            if (dataStart >= data.length / 2 && bufferedLength + binaryChunk.length <= data.length) {
                data.copyWithin(0, dataStart, dataEnd);
            }
            else {
                const newData = new Uint8Array(Math.max(data.length * 2, bufferedLength + binaryChunk.length));
                newData.set(data.subarray(dataStart, dataEnd));
                data = newData;
            }
            searchStartIndex -= dataStart;
            dataStart = 0;
            dataEnd = bufferedLength;
        }
        data.set(binaryChunk, dataEnd);
        dataEnd += binaryChunk.length;
        let patternIndex;
        while ((patternIndex = (0, line_1.findDoubleNewlineIndex)(data.subarray(searchStartIndex, dataEnd))) !== -1) {
            patternIndex += searchStartIndex;
            yield data.slice(dataStart, patternIndex);
            dataStart = patternIndex;
            searchStartIndex = dataStart;
        }
        searchStartIndex = Math.max(dataStart, dataEnd - DOUBLE_NEWLINE_DELIMITER_MAX_OVERLAP_BYTES);
    }
    if (dataEnd > dataStart) {
        yield data.slice(dataStart, dataEnd);
    }
}
class SSEDecoder {
    constructor() {
        this.event = null;
        this.data = [];
        this.chunks = [];
    }
    decode(line) {
        if (line.endsWith('\r')) {
            line = line.slice(0, -1);
        }
        if (!line) {
            // empty line and we didn't previously encounter any messages
            if (!this.event && !this.data.length) {
                return null;
            }
            const sse = {
                event: this.event,
                data: this.data.join('\n'),
                raw: this.chunks,
            };
            this.event = null;
            this.data = [];
            this.chunks = [];
            return sse;
        }
        this.chunks.push(line);
        if (line.startsWith(':')) {
            return null;
        }
        const [fieldname, , initialValue] = partition(line, ':');
        let value = initialValue;
        if (value.startsWith(' ')) {
            value = value.slice(1);
        }
        if (fieldname === 'event') {
            this.event = value;
        }
        else if (fieldname === 'data') {
            this.data.push(value);
        }
        return null;
    }
}
function partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
        return [str.slice(0, index), delimiter, str.slice(index + delimiter.length)];
    }
    return [str, '', ''];
}
//# sourceMappingURL=streaming.js.map

/***/ }),

/***/ 7013:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toFile = exports.toStreamingFile = void 0;
var uploads_1 = __nccwpck_require__(5887);
Object.defineProperty(exports, "toStreamingFile", ({ enumerable: true, get: function () { return uploads_1.toStreamingFile; } }));
var to_file_1 = __nccwpck_require__(7219);
Object.defineProperty(exports, "toFile", ({ enumerable: true, get: function () { return to_file_1.toFile; } }));
//# sourceMappingURL=uploads.js.map

/***/ }),

/***/ 3269:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __nccwpck_require__(2345);
/** @deprecated Import from ./core/error instead */
tslib_1.__exportStar(__nccwpck_require__(5093), exports);
//# sourceMappingURL=error.js.map

/***/ }),

/***/ 2583:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";

exports = module.exports = function (...args) {
  return new exports.default(...args)
}
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BedrockOpenAI = exports.AzureOpenAI = exports.SubjectTokenProviderError = exports.OAuthError = exports.InvalidWebhookSignatureError = exports.UnprocessableEntityError = exports.PermissionDeniedError = exports.InternalServerError = exports.AuthenticationError = exports.BadRequestError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.APIUserAbortError = exports.APIConnectionTimeoutError = exports.APIConnectionError = exports.APIError = exports.OpenAIError = exports.PagePromise = exports.OpenAI = exports.APIPromise = exports.toStreamingFile = exports.toFile = exports["default"] = void 0;
var client_1 = __nccwpck_require__(9664);
Object.defineProperty(exports, "default", ({ enumerable: true, get: function () { return client_1.OpenAI; } }));
var uploads_1 = __nccwpck_require__(7013);
Object.defineProperty(exports, "toFile", ({ enumerable: true, get: function () { return uploads_1.toFile; } }));
Object.defineProperty(exports, "toStreamingFile", ({ enumerable: true, get: function () { return uploads_1.toStreamingFile; } }));
var api_promise_1 = __nccwpck_require__(1999);
Object.defineProperty(exports, "APIPromise", ({ enumerable: true, get: function () { return api_promise_1.APIPromise; } }));
var client_2 = __nccwpck_require__(9664);
Object.defineProperty(exports, "OpenAI", ({ enumerable: true, get: function () { return client_2.OpenAI; } }));
var pagination_1 = __nccwpck_require__(2155);
Object.defineProperty(exports, "PagePromise", ({ enumerable: true, get: function () { return pagination_1.PagePromise; } }));
var error_1 = __nccwpck_require__(5093);
Object.defineProperty(exports, "OpenAIError", ({ enumerable: true, get: function () { return error_1.OpenAIError; } }));
Object.defineProperty(exports, "APIError", ({ enumerable: true, get: function () { return error_1.APIError; } }));
Object.defineProperty(exports, "APIConnectionError", ({ enumerable: true, get: function () { return error_1.APIConnectionError; } }));
Object.defineProperty(exports, "APIConnectionTimeoutError", ({ enumerable: true, get: function () { return error_1.APIConnectionTimeoutError; } }));
Object.defineProperty(exports, "APIUserAbortError", ({ enumerable: true, get: function () { return error_1.APIUserAbortError; } }));
Object.defineProperty(exports, "NotFoundError", ({ enumerable: true, get: function () { return error_1.NotFoundError; } }));
Object.defineProperty(exports, "ConflictError", ({ enumerable: true, get: function () { return error_1.ConflictError; } }));
Object.defineProperty(exports, "RateLimitError", ({ enumerable: true, get: function () { return error_1.RateLimitError; } }));
Object.defineProperty(exports, "BadRequestError", ({ enumerable: true, get: function () { return error_1.BadRequestError; } }));
Object.defineProperty(exports, "AuthenticationError", ({ enumerable: true, get: function () { return error_1.AuthenticationError; } }));
Object.defineProperty(exports, "InternalServerError", ({ enumerable: true, get: function () { return error_1.InternalServerError; } }));
Object.defineProperty(exports, "PermissionDeniedError", ({ enumerable: true, get: function () { return error_1.PermissionDeniedError; } }));
Object.defineProperty(exports, "UnprocessableEntityError", ({ enumerable: true, get: function () { return error_1.UnprocessableEntityError; } }));
Object.defineProperty(exports, "InvalidWebhookSignatureError", ({ enumerable: true, get: function () { return error_1.InvalidWebhookSignatureError; } }));
Object.defineProperty(exports, "OAuthError", ({ enumerable: true, get: function () { return error_1.OAuthError; } }));
Object.defineProperty(exports, "SubjectTokenProviderError", ({ enumerable: true, get: function () { return error_1.SubjectTokenProviderError; } }));
var azure_1 = __nccwpck_require__(8952);
Object.defineProperty(exports, "AzureOpenAI", ({ enumerable: true, get: function () { return azure_1.AzureOpenAI; } }));
var bedrock_1 = __nccwpck_require__(2037);
Object.defineProperty(exports, "BedrockOpenAI", ({ enumerable: true, get: function () { return bedrock_1.BedrockOpenAI; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 2305:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAssistantStreamValueExternallyMutable = isAssistantStreamValueExternallyMutable;
exports.markAssistantStreamValueExternallyMutable = markAssistantStreamValueExternallyMutable;
exports.defineAssistantStreamArrayEntry = defineAssistantStreamArrayEntry;
exports.assertSafeAssistantStreamDelta = assertSafeAssistantStreamDelta;
exports.accumulateAssistantStreamDelta = accumulateAssistantStreamDelta;
exports.createAssistantStreamArrayDeltaCommit = createAssistantStreamArrayDeltaCommit;
const error_1 = __nccwpck_require__(3269);
const utils_1 = __nccwpck_require__(2152);
const MAX_ASSISTANT_STREAM_ARRAY_GROWTH = 1024;
const MAX_EXTERNALLY_MUTABLE_ASSISTANT_STREAM_ARRAY_LENGTH = 65536;
const assistantStreamArrayStates = new WeakMap();
const externallyMutableAssistantStreamValues = new WeakSet();
function createAssistantStreamDeltaProjection(cacheArrays) {
    return { arrays: new Map(), cacheArrays, records: new WeakMap() };
}
function commitAssistantStreamArrayProjection(projection) {
    for (const [array, projected] of projection.arrays) {
        if (projected.cacheable && !externallyMutableAssistantStreamValues.has(array)) {
            assistantStreamArrayStates.set(array, {
                length: projected.length,
                ownEntryCount: projected.ownEntryCount,
            });
        }
        else {
            assistantStreamArrayStates.delete(array);
        }
    }
}
function isPrimitiveAssistantStreamValue(value) {
    return typeof value === 'string' || typeof value === 'number';
}
function isPrimitiveAssistantStreamArrayDelta(accumulator, delta) {
    return delta.every(isPrimitiveAssistantStreamValue) && accumulator.every(isPrimitiveAssistantStreamValue);
}
function countOwnAssistantStreamArrayEntries(accumulator) {
    let count = 0;
    for (const key of Object.keys(accumulator)) {
        const index = Number(key);
        if (Number.isSafeInteger(index) && index >= 0 && index < accumulator.length && String(index) === key) {
            count += 1;
        }
    }
    return count;
}
function getAssistantStreamArrayOwnEntryCount(accumulator, enforceSparseHoleBudget, cachedState) {
    if (!enforceSparseHoleBudget) {
        return 0;
    }
    if (cachedState?.length === accumulator.length) {
        return cachedState.ownEntryCount;
    }
    return countOwnAssistantStreamArrayEntries(accumulator);
}
function getAssistantStreamDeltaIndex(deltaEntry, kind, baselineLength) {
    const { index } = deltaEntry;
    if (kind === 'array' && (index === null || index === undefined)) {
        console.error(deltaEntry);
        throw new Error('Expected array delta entry to have an `index` property');
    }
    if (kind === 'array' && typeof index !== 'number') {
        throw new TypeError(`Expected array delta entry \`index\` property to be a number but got ${index}`);
    }
    if (!Number.isSafeInteger(index) ||
        index < 0 ||
        index >= baselineLength + MAX_ASSISTANT_STREAM_ARRAY_GROWTH ||
        index >= MAX_EXTERNALLY_MUTABLE_ASSISTANT_STREAM_ARRAY_LENGTH) {
        throw new error_1.OpenAIError(`Assistant stream delta contains an invalid ${kind} index: ${index}`);
    }
    return index;
}
function assertValidAssistantStreamArrayDelta(accumulator, delta, kind, projection, validateRecord) {
    let projectedArray = projection.arrays.get(accumulator);
    if (!projectedArray) {
        const enforceSparseHoleBudget = projection.cacheArrays && !externallyMutableAssistantStreamValues.has(accumulator);
        const cachedState = enforceSparseHoleBudget ? assistantStreamArrayStates.get(accumulator) : undefined;
        projectedArray = {
            baselineLength: accumulator.length,
            cacheable: enforceSparseHoleBudget,
            enforceSparseHoleBudget,
            entries: new Map(),
            length: accumulator.length,
            ownEntryCount: getAssistantStreamArrayOwnEntryCount(accumulator, enforceSparseHoleBudget, cachedState),
        };
        projection.arrays.set(accumulator, projectedArray);
    }
    for (const deltaEntry of delta) {
        if (!(0, utils_1.isObj)(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
        }
        const validatedIndex = getAssistantStreamDeltaIndex(deltaEntry, kind, projectedArray.baselineLength);
        let accumulatedEntry;
        if (projectedArray.entries.has(validatedIndex)) {
            accumulatedEntry = projectedArray.entries.get(validatedIndex);
        }
        else if ((0, utils_1.hasOwn)(accumulator, validatedIndex)) {
            accumulatedEntry = accumulator[validatedIndex];
            if (accumulatedEntry === null || accumulatedEntry === undefined) {
                projectedArray.entries.set(validatedIndex, deltaEntry);
            }
        }
        else {
            projectedArray.entries.set(validatedIndex, deltaEntry);
            projectedArray.ownEntryCount += 1;
        }
        const projectedLength = Math.max(projectedArray.length, validatedIndex + 1);
        if (projectedArray.enforceSparseHoleBudget &&
            projectedLength - projectedArray.ownEntryCount > MAX_ASSISTANT_STREAM_ARRAY_GROWTH) {
            throw new error_1.OpenAIError(`Assistant stream delta contains an invalid ${kind} index: ${validatedIndex}`);
        }
        if ((0, utils_1.isObj)(accumulatedEntry)) {
            validateRecord(accumulatedEntry, deltaEntry, projection);
        }
        projectedArray.length = projectedLength;
    }
}
function assertValidAssistantStreamDeltaIndices(accumulator, delta, projection) {
    let projectedValues = projection.records.get(accumulator);
    for (const [key, deltaValue] of Object.entries(delta)) {
        if (key === 'index' || key === 'type') {
            continue;
        }
        let accumulatedValue;
        if (projectedValues?.has(key)) {
            accumulatedValue = projectedValues.get(key);
        }
        else if ((0, utils_1.hasOwn)(accumulator, key)) {
            accumulatedValue = accumulator[key];
        }
        if (accumulatedValue === null || accumulatedValue === undefined) {
            if (!projectedValues) {
                projectedValues = new Map();
                projection.records.set(accumulator, projectedValues);
            }
            projectedValues.set(key, deltaValue);
            continue;
        }
        if ((0, utils_1.isObj)(accumulatedValue) && (0, utils_1.isObj)(deltaValue)) {
            assertValidAssistantStreamDeltaIndices(accumulatedValue, deltaValue, projection);
        }
        else if (Array.isArray(accumulatedValue) &&
            Array.isArray(deltaValue) &&
            !isPrimitiveAssistantStreamArrayDelta(accumulatedValue, deltaValue)) {
            assertValidAssistantStreamArrayDelta(accumulatedValue, deltaValue, 'array', projection, assertValidAssistantStreamDeltaIndices);
        }
    }
}
function isAssistantStreamValueExternallyMutable(value) {
    return ((0, utils_1.isObj)(value) || Array.isArray(value)) && externallyMutableAssistantStreamValues.has(value);
}
function markAssistantStreamValueExternallyMutable(value) {
    if ((!(0, utils_1.isObj)(value) && !Array.isArray(value)) || externallyMutableAssistantStreamValues.has(value)) {
        return;
    }
    externallyMutableAssistantStreamValues.add(value);
    if (Array.isArray(value)) {
        assistantStreamArrayStates.delete(value);
    }
    for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor && 'value' in descriptor) {
            markAssistantStreamValueExternallyMutable(descriptor.value);
        }
    }
}
function defineAssistantStreamArrayEntry(accumulator, index, value) {
    if (externallyMutableAssistantStreamValues.has(accumulator)) {
        markAssistantStreamValueExternallyMutable(value);
    }
    Object.defineProperty(accumulator, index, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}
function getRequiredAssistantStreamArrayIndex(deltaEntry) {
    const { index } = deltaEntry;
    if (index === null || index === undefined) {
        console.error(deltaEntry);
        throw new Error('Expected array delta entry to have an `index` property');
    }
    if (typeof index !== 'number') {
        throw new TypeError(`Expected array delta entry \`index\` property to be a number but got ${index}`);
    }
    return index;
}
function applyAssistantStreamArrayDelta(accumulator, delta, applyRecord) {
    if (isPrimitiveAssistantStreamArrayDelta(accumulator, delta)) {
        accumulator.push(...delta);
        assistantStreamArrayStates.delete(accumulator);
        return;
    }
    for (const deltaEntry of delta) {
        if (!(0, utils_1.isObj)(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
        }
        const index = getRequiredAssistantStreamArrayIndex(deltaEntry);
        if ((0, utils_1.hasOwn)(accumulator, index)) {
            const accumulatedEntry = accumulator[index];
            if (accumulatedEntry === null || accumulatedEntry === undefined) {
                if (externallyMutableAssistantStreamValues.has(accumulator)) {
                    markAssistantStreamValueExternallyMutable(deltaEntry);
                }
                accumulator[index] = deltaEntry;
            }
            else {
                accumulator[index] = applyRecord(accumulatedEntry, deltaEntry);
            }
        }
        else {
            defineAssistantStreamArrayEntry(accumulator, index, deltaEntry);
        }
    }
}
function applyAssistantStreamDelta(accumulator, delta) {
    const externallyMutable = externallyMutableAssistantStreamValues.has(accumulator);
    for (const [key, deltaValue] of Object.entries(delta)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new error_1.OpenAIError(`Assistant stream delta contains an unsafe property: ${key}`);
        }
        if (!(0, utils_1.hasOwn)(accumulator, key)) {
            if (externallyMutable) {
                markAssistantStreamValueExternallyMutable(deltaValue);
            }
            accumulator[key] = deltaValue;
            continue;
        }
        let accumulatedValue = accumulator[key];
        if (accumulatedValue === null || accumulatedValue === undefined) {
            if (externallyMutable) {
                markAssistantStreamValueExternallyMutable(deltaValue);
            }
            accumulator[key] = deltaValue;
            continue;
        }
        if (key === 'index' || key === 'type') {
            accumulator[key] = deltaValue;
            continue;
        }
        if (typeof accumulatedValue === 'string' && typeof deltaValue === 'string') {
            accumulatedValue += deltaValue;
        }
        else if (typeof accumulatedValue === 'number' && typeof deltaValue === 'number') {
            accumulatedValue += deltaValue;
        }
        else if ((0, utils_1.isObj)(accumulatedValue) && (0, utils_1.isObj)(deltaValue)) {
            accumulatedValue = applyAssistantStreamDelta(accumulatedValue, deltaValue);
        }
        else if (Array.isArray(accumulatedValue) && Array.isArray(deltaValue)) {
            applyAssistantStreamArrayDelta(accumulatedValue, deltaValue, applyAssistantStreamDelta);
            continue;
        }
        else {
            throw new TypeError(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accumulatedValue}`);
        }
        accumulator[key] = accumulatedValue;
    }
    return accumulator;
}
function assertSafeAssistantStreamDelta(value) {
    if (!(0, utils_1.isObj)(value) && !Array.isArray(value)) {
        return;
    }
    for (const [key, nestedValue] of Object.entries(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new error_1.OpenAIError(`Assistant stream delta contains an unsafe property: ${key}`);
        }
        assertSafeAssistantStreamDelta(nestedValue);
    }
}
function accumulateAssistantStreamDelta(accumulator, delta, cacheArrays = false) {
    assertSafeAssistantStreamDelta(delta);
    const accumulatorRecord = accumulator;
    const deltaRecord = delta;
    const projection = createAssistantStreamDeltaProjection(cacheArrays && !isAssistantStreamValueExternallyMutable(accumulator));
    assertValidAssistantStreamDeltaIndices(accumulatorRecord, deltaRecord, projection);
    applyAssistantStreamDelta(accumulatorRecord, deltaRecord);
    commitAssistantStreamArrayProjection(projection);
    return accumulator;
}
function createAssistantStreamArrayDeltaCommit(accumulator, delta, kind, cacheArrays = true) {
    assertSafeAssistantStreamDelta(delta);
    const projection = createAssistantStreamDeltaProjection(cacheArrays && !isAssistantStreamValueExternallyMutable(accumulator));
    assertValidAssistantStreamArrayDelta(accumulator, delta, kind, projection, assertValidAssistantStreamDeltaIndices);
    return () => commitAssistantStreamArrayProjection(projection);
}
//# sourceMappingURL=assistant-stream-delta.js.map

/***/ }),

/***/ 8259:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.brand_privateBedrockClient = void 0;
exports.errorWithCause = errorWithCause;
exports.normalizeOptionalString = normalizeOptionalString;
exports.parseBedrockEndpointHostname = parseBedrockEndpointHostname;
exports.resolveBedrockEndpoint = resolveBedrockEndpoint;
exports.assertBedrockRequestOrigin = assertBedrockRequestOrigin;
exports.assertBedrockWebSocketOrigin = assertBedrockWebSocketOrigin;
exports.assertProviderOwnsAuthorization = assertProviderOwnsAuthorization;
exports.resolveBedrockBearerAuth = resolveBedrockBearerAuth;
const tslib_1 = __nccwpck_require__(2345);
const Errors = tslib_1.__importStar(__nccwpck_require__(3269));
const utils_1 = __nccwpck_require__(2152);
/** Identifies legacy Bedrock clients without importing the client class into WebSocket modules. */
exports.brand_privateBedrockClient = Symbol.for('openai.privateBedrockClient');
/** Wraps a provider failure in an SDK error while preserving its original cause. */
function errorWithCause(message, cause) {
    const error = new Errors.OpenAIError(message);
    error.cause = cause;
    return error;
}
/** Trims a configuration string, treating missing and whitespace-only values as absent. */
function normalizeOptionalString(value) {
    const normalized = typeof value === 'string' ? value.trim() : undefined;
    return normalized || undefined;
}
function normalizeBaseURL(baseURL) {
    const url = new URL(baseURL);
    const responsesMatch = url.pathname.match(/\/responses(?:\/.*)?$/);
    if (responsesMatch?.index !== undefined) {
        url.pathname = url.pathname.slice(0, responsesMatch.index) || '/';
    }
    return url.toString().replace(/\/$/, '');
}
function resolveRuntimeDnsSuffixes(region) {
    if (region.startsWith('cn-')) {
        return ['amazonaws.com.cn', 'api.amazonwebservices.com.cn'];
    }
    if (region.startsWith('eusc-')) {
        return ['amazonaws.eu', 'api.amazonwebservices.eu'];
    }
    if (region.startsWith('us-iso-')) {
        return ['c2s.ic.gov', 'api.aws.ic.gov'];
    }
    if (region.startsWith('us-isob-')) {
        return ['sc2s.sgov.gov', 'api.aws.scloud'];
    }
    if (region.startsWith('eu-isoe-')) {
        return ['cloud.adc-e.uk', 'api.cloud-aws.adc-e.uk'];
    }
    if (region.startsWith('us-isof-')) {
        return ['csp.hci.ic.gov', 'api.aws.hci.ic.gov'];
    }
    return ['amazonaws.com', 'api.aws'];
}
/** Identifies a canonical Amazon Bedrock hostname and its embedded AWS region. */
function parseBedrockEndpointHostname(hostname) {
    const canonicalHostname = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
    const [service, region, ...suffixParts] = canonicalHostname.toLowerCase().split('.');
    const suffix = suffixParts.join('.');
    if (service === 'bedrock-mantle' && region && /^[a-z0-9-]+$/.test(region) && suffix === 'api.aws') {
        return { endpoint: 'mantle', region };
    }
    if ((service === 'bedrock-runtime' || service === 'bedrock-runtime-fips') && region) {
        const [standardSuffix, dualStackSuffix] = resolveRuntimeDnsSuffixes(region);
        if (suffix === standardSuffix || suffix === dualStackSuffix) {
            return { endpoint: 'runtime', region };
        }
    }
    return undefined;
}
/** Rejects insecure or mismatched canonical Amazon Bedrock endpoint overrides. */
function validateCanonicalBedrockEndpoint(baseURL, endpoint, region) {
    const parsedBaseURL = new URL(baseURL);
    const canonicalEndpoint = parseBedrockEndpointHostname(parsedBaseURL.hostname);
    if (canonicalEndpoint && parsedBaseURL.protocol !== 'https:') {
        throw new Errors.OpenAIError('Canonical Amazon Bedrock endpoints require HTTPS.');
    }
    if (canonicalEndpoint && canonicalEndpoint.endpoint !== endpoint) {
        throw new Errors.OpenAIError(`The Bedrock ${canonicalEndpoint.endpoint} hostname does not match the selected \`${endpoint}\` endpoint. Set \`endpoint: '${canonicalEndpoint.endpoint}'\` to use this hostname.`);
    }
    if (canonicalEndpoint && region && canonicalEndpoint.region !== region) {
        throw new Errors.OpenAIError(`The Bedrock endpoint region \`${canonicalEndpoint.region}\` does not match the configured AWS region \`${region}\`.`);
    }
}
function validateBedrockEndpointSelection(endpoint) {
    if (endpoint !== undefined && endpoint !== 'mantle' && endpoint !== 'runtime') {
        throw new Errors.OpenAIError('The Bedrock `endpoint` must be either `mantle` or `runtime`.');
    }
}
/**
 * Resolves the Bedrock endpoint family, region, and API root from configuration.
 *
 * Region precedence is `region`, `AWS_REGION`, then `AWS_DEFAULT_REGION`.
 * Endpoint precedence is `baseURL`, `AWS_BEDROCK_BASE_URL`, then the regional
 * selected endpoint; an explicit `null` base URL skips the environment override.
 * Existing `/responses` suffixes and trailing slashes are removed. Canonical
 * AWS hostnames infer the endpoint family when none is selected explicitly.
 * Other configured URLs and derived endpoints default to Mantle.
 *
 * @throws {Errors.OpenAIError} If an option is invalid, a canonical hostname
 * conflicts with the endpoint family, or the default endpoint needs a region.
 */
function resolveBedrockEndpoint(options) {
    validateBedrockEndpointSelection(options.endpoint);
    if (options.region !== undefined && !normalizeOptionalString(options.region)) {
        throw new Errors.OpenAIError('The Bedrock AWS `region` must not be empty.');
    }
    if (options.baseURL !== undefined &&
        options.baseURL !== null &&
        !normalizeOptionalString(options.baseURL)) {
        throw new Errors.OpenAIError('The Bedrock `baseURL` must not be empty.');
    }
    const region = normalizeOptionalString(options.region) ??
        normalizeOptionalString((0, utils_1.readEnv)('AWS_REGION')) ??
        normalizeOptionalString((0, utils_1.readEnv)('AWS_DEFAULT_REGION'));
    if (region && !/^[a-z]{2,8}(?:-[a-z0-9]+)+-\d+$/.test(region)) {
        throw new Errors.OpenAIError('The Bedrock AWS `region` is invalid. Use a standard AWS region such as `us-east-1`.');
    }
    const configuredBaseURL = options.baseURL === undefined
        ? normalizeOptionalString((0, utils_1.readEnv)('AWS_BEDROCK_BASE_URL'))
        : normalizeOptionalString(options.baseURL);
    if (configuredBaseURL) {
        const baseURL = normalizeBaseURL(configuredBaseURL);
        const endpoint = options.endpoint ?? parseBedrockEndpointHostname(new URL(baseURL).hostname)?.endpoint ?? 'mantle';
        validateCanonicalBedrockEndpoint(baseURL, endpoint, region);
        return { endpoint, region, baseURL };
    }
    const endpoint = options.endpoint ?? 'mantle';
    if (!region) {
        throw new Errors.OpenAIError('Bedrock requires an AWS region. Pass `region` to `bedrock(...)`, or set `AWS_REGION` or `AWS_DEFAULT_REGION`.');
    }
    const hostname = endpoint === 'runtime'
        ? `bedrock-runtime.${region}.${resolveRuntimeDnsSuffixes(region)[0]}`
        : `bedrock-mantle.${region}.api.aws`;
    return { endpoint, region, baseURL: `https://${hostname}/openai/v1` };
}
/**
 * Ensures Bedrock credentials are only attached to the configured endpoint origin.
 *
 * @throws {Errors.OpenAIError} If either URL is not HTTP(S) or the request targets a different origin.
 */
function assertBedrockRequestOrigin(baseURL, requestURL) {
    const expectedURL = new URL(baseURL);
    const request = new URL(requestURL);
    const expectedOrigin = expectedURL.origin;
    const requestOrigin = request.origin;
    if ((expectedURL.protocol !== 'http:' && expectedURL.protocol !== 'https:') ||
        (request.protocol !== 'http:' && request.protocol !== 'https:') ||
        requestOrigin !== expectedOrigin) {
        throw new Errors.OpenAIError(`Bedrock request origin \`${requestOrigin}\` does not match the configured base URL origin \`${expectedOrigin}\`.`);
    }
}
/** Validates a final WebSocket URL before a legacy Bedrock client resolves or attaches credentials. */
function assertBedrockWebSocketOrigin(client, requestURL) {
    if (typeof client !== 'object' || client === null || !(exports.brand_privateBedrockClient in client)) {
        return;
    }
    const normalizedRequestURL = new URL(requestURL);
    if (normalizedRequestURL.protocol === 'wss:') {
        normalizedRequestURL.protocol = 'https:';
    }
    else if (normalizedRequestURL.protocol === 'ws:') {
        normalizedRequestURL.protocol = 'http:';
    }
    assertBedrockRequestOrigin(client.baseURL, normalizedRequestURL.toString());
}
/**
 * Rejects caller-provided authorization headers that conflict with provider authentication.
 *
 * @throws {Errors.OpenAIError} If an `Authorization` header is already present.
 */
function assertProviderOwnsAuthorization(headers) {
    if (headers.has('authorization')) {
        throw new Errors.OpenAIError('Bedrock provider authentication cannot be combined with a custom `Authorization` header.');
    }
}
class BedrockBearerAuth {
    constructor(tokenProvider) {
        this.tokenProvider = tokenProvider;
    }
    async prepareRequest(request, _context) {
        const headers = new Headers(request.headers);
        assertProviderOwnsAuthorization(headers);
        let token;
        try {
            token = await this.tokenProvider();
        }
        catch (cause) {
            throw errorWithCause('Failed to resolve a bearer credential for Bedrock.', cause);
        }
        if (typeof token !== 'string' || !token.trim()) {
            throw new Errors.OpenAIError('The Bedrock bearer credential provider must return a non-empty string.');
        }
        headers.set('authorization', `Bearer ${token}`);
        request.redirect = 'manual';
        request.headers = headers;
    }
}
/**
 * Resolves a bearer-authentication factory without calling token providers eagerly.
 *
 * Explicit `tokenProvider` and `apiKey` options are mutually exclusive. When
 * neither is set, `AWS_BEARER_TOKEN_BEDROCK` is used unless environment
 * credentials are disabled or `apiKey` is explicitly `null`.
 *
 * @throws {Errors.OpenAIError} If an explicit key is empty or multiple bearer
 * credential sources are configured.
 */
function resolveBedrockBearerAuth(options, { allowEnvironment = true, } = {}) {
    if (options.apiKey !== undefined &&
        options.apiKey !== null &&
        (typeof options.apiKey !== 'string' || !options.apiKey.trim())) {
        throw new Errors.OpenAIError('The Bedrock bearer credential must not be empty.');
    }
    if (options.apiKey != null && options.tokenProvider) {
        throw new Errors.OpenAIError('The `apiKey` and `tokenProvider` options are mutually exclusive. Configure only one.');
    }
    if (options.tokenProvider) {
        const tokenProvider = options.tokenProvider;
        return { factory: () => new BedrockBearerAuth(tokenProvider), explicit: true };
    }
    if (options.apiKey != null) {
        const apiKey = options.apiKey;
        return { factory: () => new BedrockBearerAuth(async () => apiKey), explicit: true };
    }
    if (allowEnvironment && options.apiKey !== null && (0, utils_1.readEnv)('AWS_BEARER_TOKEN_BEDROCK')) {
        return {
            explicit: false,
            factory: () => new BedrockBearerAuth(async () => {
                const token = (0, utils_1.readEnv)('AWS_BEARER_TOKEN_BEDROCK');
                if (!token) {
                    throw new Errors.OpenAIError('Could not find credentials for Bedrock. Set `AWS_BEARER_TOKEN_BEDROCK` or configure AWS credential authentication.');
                }
                return token;
            }),
        };
    }
    return { factory: undefined, explicit: false };
}
//# sourceMappingURL=bedrock.js.map

/***/ }),

/***/ 717:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _LineDecoder_instances, _LineDecoder_buffer, _LineDecoder_start, _LineDecoder_end, _LineDecoder_searchIndex, _LineDecoder_skipLeadingLF, _LineDecoder_append;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LineDecoder = void 0;
exports.findDoubleNewlineIndex = findDoubleNewlineIndex;
const tslib_1 = __nccwpck_require__(2345);
const bytes_1 = __nccwpck_require__(9948);
/** Maximum backing-buffer capacity retained when completed lines leave little active data. */
const MAX_RETAINED_BUFFER_BYTES = 64 * 1024;
/**
 * Incrementally decodes UTF-8 text into lines without losing partial characters
 * or newline sequences that span multiple chunks.
 *
 * Supports `\n`, `\r`, and `\r\n` line endings. Call {@link flush} after the
 * final chunk to emit a trailing line that does not end with a newline.
 *
 * Based on the line decoder used by the Python `httpx` project:
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
class LineDecoder {
    /** Creates a decoder with no buffered bytes or pending newline continuation. */
    constructor() {
        _LineDecoder_instances.add(this);
        _LineDecoder_buffer.set(this, void 0);
        _LineDecoder_start.set(this, void 0);
        _LineDecoder_end.set(this, void 0);
        _LineDecoder_searchIndex.set(this, void 0);
        _LineDecoder_skipLeadingLF.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, 0, "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_end, 0, "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, 0, "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_skipLeadingLF, false, "f");
    }
    /**
     * Appends a text or UTF-8 byte chunk and returns every newly completed line.
     *
     * Incomplete lines remain buffered for the next call. A trailing `\r`
     * completes its line immediately, and a following `\n` is consumed as its
     * continuation. `null` and `undefined` are ignored and do not flush buffered
     * content.
     */
    decode(chunk) {
        if (chunk == null) {
            return [];
        }
        let binaryChunk;
        if (chunk instanceof ArrayBuffer) {
            binaryChunk = new Uint8Array(chunk);
        }
        else if (typeof chunk === 'string') {
            binaryChunk = (0, bytes_1.encodeUTF8)(chunk);
        }
        else {
            binaryChunk = chunk;
        }
        if (binaryChunk.length === 0) {
            return [];
        }
        if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_skipLeadingLF, "f")) {
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_skipLeadingLF, false, "f");
            if (binaryChunk[0] === 0x0a) {
                binaryChunk = binaryChunk.subarray(1);
            }
            if (binaryChunk.length === 0) {
                return [];
            }
        }
        tslib_1.__classPrivateFieldGet(this, _LineDecoder_instances, "m", _LineDecoder_append).call(this, binaryChunk);
        const lines = [];
        let patternIndex;
        while ((patternIndex = findNewlineIndex(tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), tslib_1.__classPrivateFieldGet(this, _LineDecoder_searchIndex, "f"), tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f"))) != null) {
            const line = (0, bytes_1.decodeUTF8)(tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), patternIndex.preceding));
            lines.push(line);
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, patternIndex.index, "f");
            if (patternIndex.carriage) {
                if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") < tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f") && tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f")[tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f")] === 0x0a) {
                    tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") + 1, "f");
                }
                else if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") === tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f")) {
                    tslib_1.__classPrivateFieldSet(this, _LineDecoder_skipLeadingLF, true, "f");
                }
            }
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), "f");
        }
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f"), "f");
        if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") === tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f")) {
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, 0, "f");
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_end, 0, "f");
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, 0, "f");
            if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length > MAX_RETAINED_BUFFER_BYTES) {
                tslib_1.__classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
            }
        }
        else if (lines.length > 0 && tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length > MAX_RETAINED_BUFFER_BYTES) {
            const length = tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f") - tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f");
            if (length <= MAX_RETAINED_BUFFER_BYTES || tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length > length * 4) {
                const capacity = length <= MAX_RETAINED_BUFFER_BYTES
                    ? Math.min(Math.max(length * 2, 256), MAX_RETAINED_BUFFER_BYTES)
                    : length * 2;
                const buffer = new Uint8Array(capacity);
                buffer.set(tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f")));
                tslib_1.__classPrivateFieldSet(this, _LineDecoder_buffer, buffer, "f");
                tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, 0, "f");
                tslib_1.__classPrivateFieldSet(this, _LineDecoder_end, length, "f");
                tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, length, "f");
            }
        }
        return lines;
    }
    /** Emits the remaining unterminated line, or returns an empty array when idle. */
    flush() {
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_skipLeadingLF, false, "f");
        if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") === tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f")) {
            return [];
        }
        return this.decode('\n');
    }
}
exports.LineDecoder = LineDecoder;
_LineDecoder_buffer = new WeakMap(), _LineDecoder_start = new WeakMap(), _LineDecoder_end = new WeakMap(), _LineDecoder_searchIndex = new WeakMap(), _LineDecoder_skipLeadingLF = new WeakMap(), _LineDecoder_instances = new WeakSet(), _LineDecoder_append = function _LineDecoder_append(chunk) {
    if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f") + chunk.length > tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
        const length = tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f") - tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f");
        if (tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f") >= tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length / 2 && length + chunk.length <= tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
            tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").copyWithin(0, tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f"));
        }
        else {
            const capacity = Math.max(tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length * 2, length + chunk.length, 256);
            const buffer = new Uint8Array(capacity);
            buffer.set(tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f")));
            tslib_1.__classPrivateFieldSet(this, _LineDecoder_buffer, buffer, "f");
        }
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_searchIndex, tslib_1.__classPrivateFieldGet(this, _LineDecoder_searchIndex, "f") - tslib_1.__classPrivateFieldGet(this, _LineDecoder_start, "f"), "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_end, length, "f");
        tslib_1.__classPrivateFieldSet(this, _LineDecoder_start, 0, "f");
    }
    tslib_1.__classPrivateFieldGet(this, _LineDecoder_buffer, "f").set(chunk, tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f"));
    tslib_1.__classPrivateFieldSet(this, _LineDecoder_end, tslib_1.__classPrivateFieldGet(this, _LineDecoder_end, "f") + chunk.length, "f");
};
// prettier-ignore
/** Individual characters recognized as possible line terminators. */
LineDecoder.NEWLINE_CHARS = new Set(['\n', '\r']);
/** Matches complete CRLF terminators as well as standalone CR and LF characters. */
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
 * Searches the active buffer range for the next CR or LF byte and returns its
 * zero-based position, the position immediately after it, and whether the byte
 * was a carriage return. Returns `null` when the range contains no newline byte.
 *
 * ```ts
 * findNewlineIndex(new TextEncoder().encode('abc\ndef'), 0, 7)
 * // => { preceding: 3, index: 4, carriage: false }
 * ```
 */
function findNewlineIndex(buffer, start, end) {
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = start; i < end; i++) {
        if (buffer[i] === newline) {
            return { preceding: i, index: i + 1, carriage: false };
        }
        if (buffer[i] === carriage) {
            return { preceding: i, index: i + 1, carriage: true };
        }
    }
    return null;
}
/**
 * Finds the first blank-line separator used to delimit streamed event records.
 *
 * @returns The byte offset immediately after the first pair of consecutive
 * line endings, or `-1` when the buffer contains no complete separator.
 */
function findDoubleNewlineIndex(buffer) {
    for (let i = 0; i < buffer.length - 1; i++) {
        const firstEndingLength = lineEndingLength(buffer, i);
        if (firstEndingLength > 0) {
            const secondEndingIndex = i + firstEndingLength;
            const secondEndingLength = lineEndingLength(buffer, secondEndingIndex);
            if (secondEndingLength > 0) {
                return secondEndingIndex + secondEndingLength;
            }
        }
    }
    return -1;
}
function lineEndingLength(buffer, index) {
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    if (buffer[index] === newline) {
        return 1;
    }
    if (buffer[index] === carriage) {
        return buffer[index + 1] === newline ? 2 : 1;
    }
    return 0;
}
//# sourceMappingURL=line.js.map

/***/ }),

/***/ 8132:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getPlatformHeaders = exports.isRunningInBrowser = void 0;
const version_1 = __nccwpck_require__(3287);
const isRunningInBrowser = () => {
    return (
    // @ts-ignore
    typeof window !== 'undefined' &&
        // @ts-ignore
        typeof window.document !== 'undefined' &&
        // @ts-ignore
        typeof navigator !== 'undefined');
};
exports.isRunningInBrowser = isRunningInBrowser;
/**
 * Note this does not detect 'browser'; for that, use getBrowserInfo().
 */
function getDetectedPlatform() {
    if (typeof Deno !== 'undefined' && Deno.build != null) {
        return 'deno';
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return 'edge';
    }
    if (Object.prototype.toString.call(typeof globalThis.process !== 'undefined' ? globalThis.process : 0) === '[object process]') {
        return 'node';
    }
    return 'unknown';
}
const getPlatformProperties = () => {
    const detectedPlatform = getDetectedPlatform();
    if (detectedPlatform === 'deno') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': version_1.VERSION,
            'X-Stainless-OS': normalizePlatform(Deno.build.os),
            'X-Stainless-Arch': normalizeArch(Deno.build.arch),
            'X-Stainless-Runtime': 'deno',
            'X-Stainless-Runtime-Version': typeof Deno.version === 'string' ? Deno.version : (Deno.version?.deno ?? 'unknown'),
        };
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': version_1.VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': `other:${EdgeRuntime}`,
            'X-Stainless-Runtime': 'edge',
            'X-Stainless-Runtime-Version': globalThis.process.version,
        };
    }
    // Check if Node.js
    if (detectedPlatform === 'node') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': version_1.VERSION,
            'X-Stainless-OS': normalizePlatform(globalThis.process.platform ?? 'unknown'),
            'X-Stainless-Arch': normalizeArch(globalThis.process.arch ?? 'unknown'),
            'X-Stainless-Runtime': 'node',
            'X-Stainless-Runtime-Version': globalThis.process.version ?? 'unknown',
        };
    }
    const browserInfo = getBrowserInfo();
    if (browserInfo) {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': version_1.VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': 'unknown',
            'X-Stainless-Runtime': `browser:${browserInfo.browser}`,
            'X-Stainless-Runtime-Version': browserInfo.version,
        };
    }
    // TODO add support for Cloudflare workers, etc.
    return {
        'X-Stainless-Lang': 'js',
        'X-Stainless-Package-Version': version_1.VERSION,
        'X-Stainless-OS': 'Unknown',
        'X-Stainless-Arch': 'unknown',
        'X-Stainless-Runtime': 'unknown',
        'X-Stainless-Runtime-Version': 'unknown',
    };
};
// Note: modified from https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
function getBrowserInfo() {
    if (typeof navigator === 'undefined' || !navigator) {
        return null;
    }
    // NOTE: The order matters here!
    const browserPatterns = [
        { key: 'edge', pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'chrome', pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'firefox', pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'safari', pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
    ];
    // Find the FIRST matching browser
    for (const { key, pattern } of browserPatterns) {
        const match = pattern.exec(navigator.userAgent);
        if (match) {
            const major = match[1] || 0;
            const minor = match[2] || 0;
            const patch = match[3] || 0;
            return { browser: key, version: `${major}.${minor}.${patch}` };
        }
    }
    return null;
}
const normalizeArch = (arch) => {
    // Node docs:
    // - https://nodejs.org/api/process.html#processarch
    // Deno docs:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    if (arch === 'x32')
        return 'x32';
    if (arch === 'x86_64' || arch === 'x64')
        return 'x64';
    if (arch === 'arm')
        return 'arm';
    if (arch === 'aarch64' || arch === 'arm64')
        return 'arm64';
    if (arch)
        return `other:${arch}`;
    return 'unknown';
};
const normalizePlatform = (platform) => {
    // Node platforms:
    // - https://nodejs.org/api/process.html#processplatform
    // Deno platforms:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    // - https://github.com/denoland/deno/issues/14799
    platform = platform.toLowerCase();
    // NOTE: this iOS check is untested and may not work
    // Node does not work natively on IOS, there is a fork at
    // https://github.com/nodejs-mobile/nodejs-mobile
    // however it is unknown at the time of writing how to detect if it is running
    if (platform.includes('ios'))
        return 'iOS';
    if (platform === 'android')
        return 'Android';
    if (platform === 'darwin')
        return 'MacOS';
    if (platform === 'win32')
        return 'Windows';
    if (platform === 'freebsd')
        return 'FreeBSD';
    if (platform === 'openbsd')
        return 'OpenBSD';
    if (platform === 'linux')
        return 'Linux';
    if (platform)
        return `Other:${platform}`;
    return 'Unknown';
};
let _platformHeaders;
const getPlatformHeaders = () => {
    return (_platformHeaders ?? (_platformHeaders = getPlatformProperties()));
};
exports.getPlatformHeaders = getPlatformHeaders;
//# sourceMappingURL=detect-platform.js.map

/***/ }),

/***/ 7698:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.castToError = void 0;
exports.isAbortError = isAbortError;
function isAbortError(err) {
    return (typeof err === 'object' &&
        err !== null &&
        // Spec-compliant fetch implementations
        (('name' in err && err.name === 'AbortError') ||
            // Expo fetch
            ('message' in err && String(err.message).includes('FetchRequestCanceledException'))));
}
const castToError = (err) => {
    if (err instanceof Error)
        return err;
    if (typeof err === 'object' && err !== null) {
        try {
            if (Object.prototype.toString.call(err) === '[object Error]') {
                // @ts-ignore - not all envs have native support for cause yet
                const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
                if (err.stack)
                    error.stack = err.stack;
                // @ts-ignore - not all envs have native support for cause yet
                if (err.cause && !error.cause)
                    error.cause = err.cause;
                if (err.name)
                    error.name = err.name;
                return error;
            }
        }
        catch { }
        try {
            return new Error(JSON.stringify(err));
        }
        catch { }
    }
    return new Error(err);
};
exports.castToError = castToError;
//# sourceMappingURL=errors.js.map

/***/ }),

/***/ 9267:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isEmptyHeaders = exports.buildHeaders = void 0;
const values_1 = __nccwpck_require__(7325);
const brand_privateNullableHeaders = /* @__PURE__ */ Symbol('brand.privateNullableHeaders');
const httpTokenHeaderName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function* iterateHeaders(headers) {
    if (!headers)
        return;
    if (brand_privateNullableHeaders in headers) {
        const { values, nulls } = headers;
        yield* values.entries();
        for (const name of nulls) {
            yield [name, null];
        }
        return;
    }
    let shouldClear = false;
    let iter;
    if (headers instanceof Headers) {
        iter = headers.entries();
    }
    else if ((0, values_1.isReadonlyArray)(headers)) {
        iter = headers;
    }
    else {
        shouldClear = true;
        iter = Object.entries(headers ?? {});
    }
    for (let row of iter) {
        const name = row[0];
        if (typeof name !== 'string')
            throw new TypeError('expected header name to be a string');
        const values = (0, values_1.isReadonlyArray)(row[1]) ? row[1] : [row[1]];
        let didClear = false;
        for (const value of values) {
            if (value === undefined)
                continue;
            // Objects keys always overwrite older headers, they never append.
            // Yield a null to clear the header before adding the new values.
            if (shouldClear && !didClear) {
                didClear = true;
                yield [name, null];
            }
            yield [name, value];
        }
    }
}
const buildHeaders = (newHeaders) => {
    const targetHeaders = new Headers();
    const nullHeaders = new Set();
    for (const headers of newHeaders) {
        const seenHeaders = new Set();
        for (const [name, value] of iterateHeaders(headers)) {
            if (!httpTokenHeaderName.test(name)) {
                throw new TypeError(`Header name must be a valid HTTP token ["${name}"]`);
            }
            const lowerName = name.toLowerCase();
            if (!seenHeaders.has(lowerName)) {
                targetHeaders.delete(lowerName);
                seenHeaders.add(lowerName);
            }
            if (value === null) {
                targetHeaders.delete(lowerName);
                nullHeaders.add(lowerName);
            }
            else {
                targetHeaders.append(lowerName, value);
                nullHeaders.delete(lowerName);
            }
        }
    }
    return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};
exports.buildHeaders = buildHeaders;
const isEmptyHeaders = (headers) => {
    for (const _ of iterateHeaders(headers))
        return false;
    return true;
};
exports.isEmptyHeaders = isEmptyHeaders;
//# sourceMappingURL=headers.js.map

/***/ }),

/***/ 3426:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.defaultParseResponse = defaultParseResponse;
exports.addRequestID = addRequestID;
const streaming_1 = __nccwpck_require__(7787);
const errors_1 = __nccwpck_require__(7698);
const log_1 = __nccwpck_require__(6273);
async function defaultParseResponse(client, props) {
    const { response, requestLogID, retryOfRequestLogID, startTime } = props;
    const body = await (async () => {
        if (props.options.stream) {
            (0, log_1.loggerFor)(client).debug('response', response.status, response.url, response.headers, response.body);
            // Note: there is an invariant here that isn't represented in the type system
            // that if you set `stream: true` the response type must also be `Stream<T>`
            if (props.options.__streamClass) {
                return props.options.__streamClass.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
            }
            return streaming_1.Stream.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
        }
        // fetch refuses to read the body when the status code is 204.
        if (response.status === 204) {
            return null;
        }
        if (props.options.__binaryResponse) {
            return response;
        }
        const contentType = response.headers.get('content-type');
        const mediaType = contentType?.split(';')[0]?.trim();
        const isJSON = mediaType?.includes('application/json') || mediaType?.endsWith('+json');
        if (isJSON) {
            const contentLength = response.headers.get('content-length');
            if (contentLength === '0') {
                // if there is no content we can't do anything
                return undefined;
            }
            const bodyText = await response.text();
            if (!bodyText) {
                // Some servers respond with an empty body and a JSON content-type but
                // without a `content-length: 0` header (e.g. over HTTP/2 or with chunked
                // transfer encoding). Treat this the same as an explicit `content-length: 0`
                // instead of letting `JSON.parse` throw an opaque `SyntaxError`.
                return undefined;
            }
            const json = JSON.parse(bodyText);
            return addRequestID(json, response);
        }
        const text = await response.text();
        return text;
    })().catch((error) => {
        throw asAbortError(error, props.controller.signal);
    });
    (0, log_1.loggerFor)(client).debug(`[${requestLogID}] response parsed`, (0, log_1.formatRequestDetails)({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        body,
        durationMs: Date.now() - startTime,
    }));
    return body;
}
function asAbortError(error, signal) {
    if (!signal.aborted || error !== signal.reason || (0, errors_1.isAbortError)(error)) {
        return error;
    }
    const message = 'This operation was aborted';
    const DOMExceptionConstructor = globalThis.DOMException;
    return typeof DOMExceptionConstructor === 'function'
        ? new DOMExceptionConstructor(message, 'AbortError')
        : Object.assign(new Error(message), { name: 'AbortError' });
}
function addRequestID(value, response) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }
    return Object.defineProperty(value, '_request_id', {
        value: response.headers.get('x-request-id'),
        enumerable: false,
    });
}
//# sourceMappingURL=parse.js.map

/***/ }),

/***/ 9800:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createProvider = createProvider;
exports.configureProvider = configureProvider;
/**
 * A provider factory such as `bedrock(options)` captures configuration in a
 * definition, while every OpenAI client receives a fresh runtime from
 * `definition.configure()`. Keeping definitions out of the provider object
 * makes providers opaque and prevents arbitrary objects from imitating one.
 * It also leaves provider-specific dependencies outside the core SDK.
 *
 * The registry lives on `globalThis` under a global symbol so a provider made
 * by one copy of the package still works with another copy, including mixed
 * CommonJS and ESM installations. The WeakMap avoids retaining discarded
 * provider configurations.
 */
const providerDefinitionsKey = Symbol.for('openai.node.providerDefinitions.v1');
const providerGlobal = globalThis;
const existingProviderDefinitions = providerGlobal[providerDefinitionsKey];
const providerDefinitions = existingProviderDefinitions ?? new WeakMap();
if (!existingProviderDefinitions) {
    Object.defineProperty(providerGlobal, providerDefinitionsKey, { value: providerDefinitions });
}
/**
 * Creates an opaque, immutable provider handle for a runtime definition.
 *
 * The definition is registered out of band and can be resolved by another
 * installed copy of the SDK in the same JavaScript realm.
 */
function createProvider(definition) {
    const provider = Object.freeze({});
    providerDefinitions.set(provider, definition);
    return provider;
}
/**
 * Creates a new client-specific runtime from a previously registered provider.
 *
 * @throws {Error} If the value was not created with {@link createProvider}.
 */
function configureProvider(provider) {
    const definition = providerDefinitions.get(provider);
    if (!definition) {
        throw new Error('Invalid provider. Providers must be created with createProvider().');
    }
    return definition.configure();
}
//# sourceMappingURL=provider.js.map

/***/ }),

/***/ 6250:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RFC3986 = exports.RFC1738 = exports.formatters = exports.default_formatter = exports.default_format = void 0;
exports.default_format = 'RFC3986';
exports.default_formatter = String;
exports.formatters = {
    RFC1738: (v) => String(v).replace(/%20/g, '+'),
    RFC3986: exports.default_formatter,
};
exports.RFC1738 = 'RFC1738';
exports.RFC3986 = 'RFC3986';
//# sourceMappingURL=formats.js.map

/***/ }),

/***/ 1123:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.stringify = stringify;
const utils_1 = __nccwpck_require__(2847);
const formats_1 = __nccwpck_require__(6250);
const values_1 = __nccwpck_require__(7325);
const array_prefix_generators = {
    brackets(prefix) {
        return String(prefix) + '[]';
    },
    comma: 'comma',
    indices(prefix, key) {
        return String(prefix) + '[' + key + ']';
    },
    repeat(prefix) {
        return String(prefix);
    },
};
const push_to_array = function push_to_array(arr, value_or_array) {
    Array.prototype.push.apply(arr, (0, values_1.isArray)(value_or_array) ? value_or_array : [value_or_array]);
};
let toISOString;
const defaults = {
    addQueryPrefix: false,
    allowDots: false,
    allowEmptyArrays: false,
    arrayFormat: 'indices',
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encodeDotInKeys: false,
    encoder: utils_1.encode,
    encodeValuesOnly: false,
    format: formats_1.default_format,
    formatter: formats_1.default_formatter,
    /** @deprecated */
    indices: false,
    serializeDate(date) {
        return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
    },
    skipNulls: false,
    strictNullHandling: false,
};
function is_non_nullish_primitive(v) {
    return (typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean' ||
        typeof v === 'symbol' ||
        typeof v === 'bigint');
}
const sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
    let obj = object;
    let tmp_sc = sideChannel;
    let step = 0;
    let find_flag = false;
    while ((tmp_sc = tmp_sc.get(sentinel)) !== undefined && !find_flag) {
        // Where object last appeared in the ref tree
        const pos = tmp_sc.get(object);
        step += 1;
        if (pos !== undefined) {
            if (pos === step) {
                throw new RangeError('Cyclic object value');
            }
            else {
                find_flag = true; // Break while
            }
        }
        if (tmp_sc.get(sentinel) === undefined) {
            step = 0;
        }
    }
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    }
    else if (obj instanceof Date) {
        obj = serializeDate?.(obj);
    }
    else if (generateArrayPrefix === 'comma' && (0, values_1.isArray)(obj)) {
        obj = (0, utils_1.maybe_map)(obj, (value) => {
            if (value instanceof Date) {
                return serializeDate?.(value);
            }
            return value;
        });
    }
    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly
                ? // @ts-expect-error
                    encoder(prefix, defaults.encoder, charset, 'key', format)
                : prefix;
        }
        obj = '';
    }
    if (is_non_nullish_primitive(obj) || (0, utils_1.is_buffer)(obj)) {
        if (encoder) {
            const key_value = encodeValuesOnly
                ? prefix
                : // @ts-expect-error
                    encoder(prefix, defaults.encoder, charset, 'key', format);
            return [
                formatter?.(key_value) +
                    '=' +
                    // @ts-expect-error
                    formatter?.(encoder(obj, defaults.encoder, charset, 'value', format)),
            ];
        }
        return [formatter?.(prefix) + '=' + formatter?.(String(obj))];
    }
    const values = [];
    if (obj === undefined) {
        return values;
    }
    let obj_keys;
    if (generateArrayPrefix === 'comma' && (0, values_1.isArray)(obj)) {
        // we need to join elements in
        if (encodeValuesOnly && encoder) {
            // @ts-expect-error values only
            obj = (0, utils_1.maybe_map)(obj, encoder);
        }
        obj_keys = [{ value: obj.length > 0 ? obj.join(',') || null : undefined }];
    }
    else if ((0, values_1.isArray)(filter)) {
        obj_keys = filter;
    }
    else {
        const keys = Object.keys(obj);
        if (sort) {
            keys.sort(sort);
        }
        obj_keys = keys;
    }
    const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, '%2E') : String(prefix);
    const adjusted_prefix = commaRoundTrip && (0, values_1.isArray)(obj) && obj.length === 1 ? encoded_prefix + '[]' : encoded_prefix;
    if (allowEmptyArrays && (0, values_1.isArray)(obj) && obj.length === 0) {
        return adjusted_prefix + '[]';
    }
    for (const key of obj_keys) {
        const value = 
        // @ts-ignore
        typeof key === 'object' && key.value !== undefined ? key.value : obj[key];
        if (skipNulls && value === null) {
            continue;
        }
        // @ts-ignore
        const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, '%2E') : key;
        let key_prefix;
        if ((0, values_1.isArray)(obj)) {
            key_prefix =
                typeof generateArrayPrefix === 'function'
                    ? generateArrayPrefix(adjusted_prefix, encoded_key)
                    : adjusted_prefix;
        }
        else {
            key_prefix = adjusted_prefix + (allowDots ? '.' + encoded_key : '[' + encoded_key + ']');
        }
        sideChannel.set(object, step);
        const valueSideChannel = new WeakMap([[sentinel, sideChannel]]);
        push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, 
        // @ts-ignore
        generateArrayPrefix === 'comma' && encodeValuesOnly && (0, values_1.isArray)(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
    }
    return values;
}
function normalize_stringify_options(opts = defaults) {
    if (opts.allowEmptyArrays !== undefined && typeof opts.allowEmptyArrays !== 'boolean') {
        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
    }
    if (opts.encodeDotInKeys !== undefined && typeof opts.encodeDotInKeys !== 'boolean') {
        throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided');
    }
    if (opts.encoder !== null && opts.encoder !== undefined && typeof opts.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }
    const charset = opts.charset || defaults.charset;
    if (opts.charset !== undefined && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    let format = formats_1.default_format;
    if (opts.format !== undefined) {
        if (!(0, utils_1.has)(formats_1.formatters, opts.format)) {
            throw new TypeError('Unknown format option provided.');
        }
        format = opts.format;
    }
    const formatter = formats_1.formatters[format];
    let filter = defaults.filter;
    if (typeof opts.filter === 'function' || (0, values_1.isArray)(opts.filter)) {
        filter = opts.filter;
    }
    let arrayFormat;
    if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
        arrayFormat = opts.arrayFormat;
    }
    else if ('indices' in opts) {
        arrayFormat = opts.indices ? 'indices' : 'repeat';
    }
    else {
        arrayFormat = defaults.arrayFormat;
    }
    if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
    }
    let allowDots;
    if (opts.allowDots === undefined) {
        allowDots = !!opts.encodeDotInKeys === true ? true : defaults.allowDots;
    }
    else {
        allowDots = !!opts.allowDots;
    }
    return {
        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
        // @ts-ignore
        allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        arrayFormat,
        charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        commaRoundTrip: !!opts.commaRoundTrip,
        delimiter: opts.delimiter === undefined ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter,
        format,
        formatter,
        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
        // @ts-ignore
        sort: typeof opts.sort === 'function' ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling,
    };
}
function stringify(object, opts = {}) {
    let obj = object;
    const options = normalize_stringify_options(opts);
    let obj_keys;
    let filter;
    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    }
    else if ((0, values_1.isArray)(options.filter)) {
        filter = options.filter;
        obj_keys = filter;
    }
    const keys = [];
    if (typeof obj !== 'object' || obj === null) {
        return '';
    }
    const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
    const commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip;
    if (!obj_keys) {
        obj_keys = Object.keys(obj);
    }
    if (options.sort) {
        obj_keys.sort(options.sort);
    }
    const sideChannel = new WeakMap();
    for (const key of obj_keys) {
        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        push_to_array(keys, inner_stringify(obj[key], key, 
        // @ts-expect-error
        generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
    }
    const joined = keys.join(options.delimiter);
    let prefix = options.addQueryPrefix === true ? '?' : '';
    if (options.charsetSentinel) {
        prefix +=
            options.charset === 'iso-8859-1'
                ? // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
                    'utf8=%26%2310003%3B&'
                : // encodeURIComponent('✓')
                    'utf8=%E2%9C%93&';
    }
    return joined.length > 0 ? prefix + joined : '';
}
//# sourceMappingURL=stringify.js.map

/***/ }),

/***/ 2847:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encode = exports.has = void 0;
exports.merge = merge;
exports.assign_single_source = assign_single_source;
exports.decode = decode;
exports.compact = compact;
exports.is_regexp = is_regexp;
exports.is_buffer = is_buffer;
exports.combine = combine;
exports.maybe_map = maybe_map;
const formats_1 = __nccwpck_require__(6250);
const values_1 = __nccwpck_require__(7325);
let cachedHas;
const has = (obj, key) => {
    const resolvedHas = cachedHas ?? Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty);
    cachedHas = resolvedHas;
    return resolvedHas(obj, key);
};
exports.has = has;
const hex_table = /* @__PURE__ */ (() => {
    const array = [];
    for (let i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }
    return array;
})();
function compact_queue(queue) {
    while (queue.length > 1) {
        const item = queue.pop();
        if (!item) {
            continue;
        }
        const obj = item.obj[item.prop];
        if ((0, values_1.isArray)(obj)) {
            const compacted = [];
            for (const value of obj) {
                if (value !== undefined) {
                    compacted.push(value);
                }
            }
            // @ts-ignore
            item.obj[item.prop] = compacted;
        }
    }
}
function array_to_object(source, options) {
    const obj = options && options.plainObjects ? Object.create(null) : {};
    for (let i = 0; i < source.length; ++i) {
        if (source[i] !== undefined) {
            obj[i] = source[i];
        }
    }
    return obj;
}
function merge(target, source, options = {}) {
    if (!source) {
        return target;
    }
    if (typeof source !== 'object') {
        if ((0, values_1.isArray)(target)) {
            target.push(source);
        }
        else if (target && typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !(0, exports.has)(Object.prototype, source)) {
                target[source] = true;
            }
        }
        else {
            return [target, source];
        }
        return target;
    }
    if (!target || typeof target !== 'object') {
        // oxlint-disable-next-line unicorn/prefer-spread -- concat intentionally preserves one-level flattening and sparse-array behavior.
        return [target].concat(source);
    }
    let mergeTarget = target;
    if ((0, values_1.isArray)(target) && !(0, values_1.isArray)(source)) {
        // @ts-ignore
        mergeTarget = array_to_object(target, options);
    }
    if ((0, values_1.isArray)(target) && (0, values_1.isArray)(source)) {
        const sourceLength = source.length;
        for (let i = 0; i < sourceLength; i += 1) {
            if (i in source) {
                const item = source[i];
                if ((0, exports.has)(target, i)) {
                    const targetItem = target[i];
                    if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                        target[i] = merge(targetItem, item, options);
                    }
                    else {
                        target.push(item);
                    }
                }
                else {
                    target[i] = item;
                }
            }
        }
        return target;
    }
    for (const key of Object.keys(source)) {
        const value = source[key];
        mergeTarget[key] = (0, exports.has)(mergeTarget, key) ? merge(mergeTarget[key], value, options) : value;
    }
    return mergeTarget;
}
function assign_single_source(target, source) {
    for (const key of Object.keys(source)) {
        target[key] = source[key];
    }
    return target;
}
function decode(str, _, charset) {
    const strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    }
    catch {
        return strWithoutPlus;
    }
}
const limit = 1024;
const encode = (str, _defaultEncoder, charset, _kind, format) => {
    // This code was originally written by Brian White for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }
    let string = str;
    if (typeof str === 'symbol') {
        string = Symbol.prototype.toString.call(str);
    }
    else if (typeof str !== 'string') {
        string = String(str);
    }
    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, ($0) => '%26%23' + Number.parseInt($0.slice(2), 16) + '%3B');
    }
    let out = '';
    for (let j = 0; j < string.length;) {
        let segmentEnd = Math.min((Math.floor(j / limit) + 1) * limit, string.length);
        if (segmentEnd < string.length && string.codePointAt(segmentEnd - 1) > 65535) {
            segmentEnd += 1;
        }
        const segment = string.length >= limit ? string.slice(j, segmentEnd) : string;
        const arr = [];
        for (let i = 0; i < segment.length; ++i) {
            // oxlint-disable-next-line unicorn/prefer-code-point -- combine UTF-16 surrogate code units below
            let c = segment.charCodeAt(i);
            if (c === 0x2d || // -
                c === 0x2e || // .
                c === 0x5f || // _
                c === 0x7e || // ~
                (c >= 0x30 && c <= 0x39) || // 0-9
                (c >= 0x41 && c <= 0x5a) || // a-z
                (c >= 0x61 && c <= 0x7a) || // A-Z
                (format === formats_1.RFC1738 && (c === 0x28 || c === 0x29)) // ( )
            ) {
                arr[arr.length] = segment.charAt(i);
                continue;
            }
            if (c < 0x80) {
                arr[arr.length] = hex_table[c];
                continue;
            }
            if (c < 2048) {
                arr[arr.length] = hex_table[0xc0 | (c >> 6)] + hex_table[0x80 | (c & 0x3f)];
                continue;
            }
            if (c < 55296 || c >= 57344) {
                arr[arr.length] =
                    hex_table[0xe0 | (c >> 12)] + hex_table[0x80 | ((c >> 6) & 0x3f)] + hex_table[0x80 | (c & 0x3f)];
                continue;
            }
            i += 1;
            // oxlint-disable-next-line unicorn/prefer-code-point -- combine UTF-16 surrogate code units manually
            c = 65536 + (((c & 1023) << 10) | (segment.charCodeAt(i) & 1023));
            arr[arr.length] =
                hex_table[0xf0 | (c >> 18)] +
                    hex_table[0x80 | ((c >> 12) & 0x3f)] +
                    hex_table[0x80 | ((c >> 6) & 0x3f)] +
                    hex_table[0x80 | (c & 0x3f)];
        }
        out += arr.join('');
        j = segmentEnd;
    }
    return out;
};
exports.encode = encode;
function compact(value) {
    const queue = [{ obj: { o: value }, prop: 'o' }];
    const refs = [];
    for (const item of queue) {
        // @ts-ignore
        const obj = item.obj[item.prop];
        const keys = Object.keys(obj);
        for (const key of keys) {
            const val = obj[key];
            if (typeof val === 'object' && val !== null && !refs.includes(val)) {
                queue.push({ obj, prop: key });
                refs.push(val);
            }
        }
    }
    compact_queue(queue);
    return value;
}
function is_regexp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
}
function is_buffer(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function combine(a, b) {
    // oxlint-disable-next-line unicorn/prefer-spread -- concat intentionally preserves one-level flattening and sparse-array behavior.
    return [].concat(a, b);
}
function maybe_map(val, fn) {
    if ((0, values_1.isArray)(val)) {
        const mapped = [];
        for (const item of val) {
            mapped.push(fn(item));
        }
        return mapped;
    }
    return fn(val);
}
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 3347:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FallbackEncoder = void 0;
const FallbackEncoder = ({ headers, body }) => {
    return {
        bodyHeaders: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    };
};
exports.FallbackEncoder = FallbackEncoder;
//# sourceMappingURL=request-options.js.map

/***/ }),

/***/ 2970:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createCanonicalResponseContext = createCanonicalResponseContext;
exports.getOutputText = getOutputText;
exports.ensureCanonicalOutputText = ensureCanonicalOutputText;
exports.cloneResponse = cloneResponse;
exports.updateCachedOutputTextLength = updateCachedOutputTextLength;
exports.updateOutputText = updateOutputText;
const output_text_index_1 = __nccwpck_require__(728);
function createCanonicalResponseContext() {
    return {
        canonicalSnapshot: undefined,
        outputTextLengths: new WeakMap(),
        outputTextIndex: new output_text_index_1.OutputTextIndex(),
    };
}
function getOutputText(context, output) {
    if (output.type !== 'message') {
        return '';
    }
    let text = '';
    for (const content of output.content) {
        if (content.type === 'output_text') {
            text += content.text;
        }
    }
    context.outputTextLengths.set(output, text.length);
    return text;
}
function ensureCanonicalOutputText(context, snapshot) {
    if (context.canonicalSnapshot === snapshot) {
        return;
    }
    const outputTextIndex = new output_text_index_1.OutputTextIndex();
    let text = '';
    for (const output of snapshot.output) {
        const outputText = getOutputText(context, output);
        text += outputText;
        outputTextIndex.append(outputText.length);
    }
    if (snapshot.output_text !== text) {
        snapshot.output_text = text;
    }
    context.outputTextIndex = outputTextIndex;
    context.canonicalSnapshot = snapshot;
}
function cloneResponse(context, response) {
    context.canonicalSnapshot = undefined;
    context.outputTextLengths = new WeakMap();
    context.outputTextIndex = new output_text_index_1.OutputTextIndex();
    const snapshot = structuredClone(response);
    if (!Object.getOwnPropertyDescriptor(snapshot, 'output_text') ||
        snapshot.output_text === null ||
        snapshot.output_text === undefined) {
        ensureCanonicalOutputText(context, snapshot);
    }
    else if (snapshot.output.length === 0 && snapshot.output_text === '') {
        context.canonicalSnapshot = snapshot;
    }
    return snapshot;
}
function updateCachedOutputTextLength(context, output, outputIndex, previousText, nextText) {
    const length = context.outputTextLengths.get(output);
    if (length !== undefined) {
        const nextLength = length - previousText.length + nextText.length;
        context.outputTextLengths.set(output, nextLength);
        context.outputTextIndex.update(outputIndex, nextLength);
    }
}
function replaceOutputTextSuffix(snapshot, previousText, nextText) {
    if (previousText.length === 0) {
        snapshot.output_text += nextText;
        return;
    }
    snapshot.output_text =
        snapshot.output_text.slice(0, snapshot.output_text.length - previousText.length) + nextText;
}
function getPrecedingContentTextLength(context, output, contentIndex, nextText) {
    if (contentIndex === undefined || output?.type !== 'message') {
        return 0;
    }
    if (contentIndex < output.content.length - contentIndex - 1) {
        let precedingContentLength = 0;
        for (let index = 0; index < contentIndex; index += 1) {
            const precedingContent = output.content[index];
            if (precedingContent?.type === 'output_text') {
                precedingContentLength += precedingContent.text.length;
            }
        }
        return precedingContentLength;
    }
    let followingContentLength = 0;
    for (let index = contentIndex + 1; index < output.content.length; index += 1) {
        const followingContent = output.content[index];
        if (followingContent?.type === 'output_text') {
            followingContentLength += followingContent.text.length;
        }
    }
    const outputTextLength = context.outputTextLengths.get(output) ?? getOutputText(context, output).length;
    return outputTextLength - followingContentLength - nextText.length;
}
function updateOutputText(context, snapshot, outputIndex, previousText, nextText, contentIndex) {
    if (previousText === nextText) {
        return;
    }
    const output = snapshot.output[outputIndex];
    if (outputIndex === snapshot.output.length - 1 &&
        (contentIndex === undefined || (output?.type === 'message' && contentIndex === output.content.length - 1))) {
        replaceOutputTextSuffix(snapshot, previousText, nextText);
        return;
    }
    const precedingContentLength = getPrecedingContentTextLength(context, output, contentIndex, nextText);
    const offset = context.outputTextIndex.prefixSum(outputIndex) + precedingContentLength;
    if (offset + previousText.length === snapshot.output_text.length) {
        replaceOutputTextSuffix(snapshot, previousText, nextText);
        return;
    }
    snapshot.output_text =
        snapshot.output_text.slice(0, offset) +
            nextText +
            snapshot.output_text.slice(offset + previousText.length);
}
//# sourceMappingURL=canonical-output-text.js.map

/***/ }),

/***/ 728:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OutputTextIndex = void 0;
/**
 * Stores output text lengths in a complete binary segment tree.
 *
 * Leaves begin at `capacity`; each parent contains the sum of its children.
 * Rebuilding when capacity doubles preserves every existing contribution and
 * makes growth linear in the total number of appended outputs.
 */
class OutputTextIndex {
    constructor() {
        this.capacity = 1;
        this.values = [0, 0];
        this.size = 0;
    }
    get length() {
        return this.size;
    }
    append(value) {
        if (this.size === this.capacity) {
            this.grow();
        }
        const index = this.size;
        this.size += 1;
        this.update(index, value);
    }
    update(index, value) {
        if (!Number.isSafeInteger(index) || index < 0 || index >= this.size) {
            throw new RangeError(`missing output at index ${index}`);
        }
        let node = this.capacity + index;
        const difference = value - (this.values[node] ?? 0);
        if (difference === 0) {
            return;
        }
        while (node >= 1) {
            this.values[node] = (this.values[node] ?? 0) + difference;
            node = Math.floor(node / 2);
        }
    }
    prefixSum(end) {
        if (!Number.isSafeInteger(end) || end < 0 || end > this.size) {
            throw new RangeError(`missing output at index ${end}`);
        }
        let start = this.capacity;
        let stop = this.capacity + end;
        let sum = 0;
        while (start < stop) {
            if (start % 2 === 1) {
                sum += this.values[start] ?? 0;
                start += 1;
            }
            if (stop % 2 === 1) {
                stop -= 1;
                sum += this.values[stop] ?? 0;
            }
            start = Math.floor(start / 2);
            stop = Math.floor(stop / 2);
        }
        return sum;
    }
    grow() {
        const previousCapacity = this.capacity;
        this.capacity *= 2;
        const values = Array.from({ length: this.capacity * 2 }, () => 0);
        for (let index = 0; index < this.size; index += 1) {
            values[this.capacity + index] = this.values[previousCapacity + index] ?? 0;
        }
        for (let index = this.capacity - 1; index > 0; index -= 1) {
            values[index] = (values[index * 2] ?? 0) + (values[index * 2 + 1] ?? 0);
        }
        this.values = values;
    }
}
exports.OutputTextIndex = OutputTextIndex;
//# sourceMappingURL=output-text-index.js.map

/***/ }),

/***/ 4596:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createResponseContext = createResponseContext;
exports.accumulateResponseWithContext = accumulateResponseWithContext;
const error_1 = __nccwpck_require__(3269);
const utils_1 = __nccwpck_require__(2152);
const canonical_output_text_1 = __nccwpck_require__(2970);
function validateArrayIndex(collection, index, kind, allowAppend = false) {
    if (!Number.isSafeInteger(index) ||
        index < 0 ||
        index > collection.length ||
        (index === collection.length ? !allowAppend || index in collection : !(0, utils_1.hasOwn)(collection, index))) {
        throw new error_1.OpenAIError(`missing ${kind} at index ${index}`);
    }
}
function validateArrayAppend(collection, index, kind) {
    if (index !== collection.length) {
        throw new error_1.OpenAIError(`missing ${kind} at index ${index}`);
    }
    validateArrayIndex(collection, index, kind, true);
}
function getOutput(snapshot, outputIndex) {
    validateArrayIndex(snapshot.output, outputIndex, 'output');
    const output = snapshot.output[outputIndex];
    if (!output) {
        throw new error_1.OpenAIError(`missing output at index ${outputIndex}`);
    }
    return output;
}
function getContent(content, contentIndex) {
    validateArrayIndex(content, contentIndex, 'content');
    const part = content[contentIndex];
    if (!part) {
        throw new error_1.OpenAIError(`missing content at index ${contentIndex}`);
    }
    return part;
}
function getShellOutputContent(snapshot, output, commandIndex) {
    const shellCall = snapshot.output.find((item) => item.type === 'shell_call' && item.call_id === output.call_id);
    if (shellCall) {
        validateArrayIndex(shellCall.action.commands, commandIndex, 'command');
    }
    else {
        validateArrayIndex(output.output, commandIndex, 'content', true);
    }
    while (output.output.length <= commandIndex) {
        output.output.push({
            stdout: '',
            stderr: '',
            outcome: { type: 'exit', exit_code: 0 },
        });
    }
    return getContent(output.output, commandIndex);
}
function assertNever(value) {
    throw new error_1.OpenAIError(`Unhandled response stream event: ${JSON.stringify(value)}`);
}
function accumulateOutputItemEvent(event, snapshot, context) {
    switch (event.type) {
        case 'response.output_item.added': {
            validateArrayAppend(snapshot.output, event.output_index, 'output');
            const output = structuredClone(event.item);
            if (output.type === 'message') {
                (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
            }
            snapshot.output.push(output);
            const text = (0, canonical_output_text_1.getOutputText)(context, output);
            if (context.canonicalSnapshot === snapshot) {
                context.outputTextIndex.append(text.length);
            }
            if (text) {
                snapshot.output_text += text;
            }
            return true;
        }
        case 'response.output_item.done': {
            const output = getOutput(snapshot, event.output_index);
            const previousText = (0, canonical_output_text_1.getOutputText)(context, output);
            const replacement = structuredClone(event.item);
            if (output.type === 'message' || replacement.type === 'message') {
                (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
            }
            snapshot.output[event.output_index] = replacement;
            const nextText = (0, canonical_output_text_1.getOutputText)(context, replacement);
            if (context.canonicalSnapshot === snapshot) {
                context.outputTextIndex.update(event.output_index, nextText.length);
            }
            (0, canonical_output_text_1.updateOutputText)(context, snapshot, event.output_index, previousText, nextText);
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateContentPartAddedEvent(event, snapshot, context) {
    switch (event.type) {
        case 'response.content_part.added': {
            const output = getOutput(snapshot, event.output_index);
            const { type } = output;
            const { part } = event;
            if (type === 'message' && part.type !== 'reasoning_text') {
                validateArrayAppend(output.content, event.content_index, 'content');
                const content = structuredClone(part);
                if (content.type === 'output_text') {
                    (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
                }
                output.content.push(content);
                if (content.type === 'output_text') {
                    (0, canonical_output_text_1.updateCachedOutputTextLength)(context, output, event.output_index, '', content.text);
                    (0, canonical_output_text_1.updateOutputText)(context, snapshot, event.output_index, '', content.text, event.content_index);
                }
            }
            else if (type === 'reasoning' && part.type === 'reasoning_text') {
                const content = output.content ?? [];
                validateArrayAppend(content, event.content_index, 'content');
                if (!output.content) {
                    output.content = content;
                }
                content.push(structuredClone(part));
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateContentPartDoneEvent(event, snapshot, context) {
    switch (event.type) {
        case 'response.content_part.done': {
            const output = getOutput(snapshot, event.output_index);
            const { part } = event;
            if (output.type === 'message' && part.type !== 'reasoning_text') {
                const content = getContent(output.content, event.content_index);
                const previousText = content.type === 'output_text' ? content.text : '';
                const replacement = structuredClone(part);
                if (content.type === 'output_text' || replacement.type === 'output_text') {
                    (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
                }
                output.content[event.content_index] = replacement;
                const nextText = replacement.type === 'output_text' ? replacement.text : '';
                (0, canonical_output_text_1.updateCachedOutputTextLength)(context, output, event.output_index, previousText, nextText);
                (0, canonical_output_text_1.updateOutputText)(context, snapshot, event.output_index, previousText, nextText, event.content_index);
            }
            else if (output.type === 'reasoning' && part.type === 'reasoning_text') {
                const { content } = output;
                if (!content) {
                    throw new error_1.OpenAIError(`missing content at index ${event.content_index}`);
                }
                getContent(content, event.content_index);
                content[event.content_index] = structuredClone(part);
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateOutputTextEvent(event, snapshot, context) {
    switch (event.type) {
        case 'response.output_text.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'message') {
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'output_text') {
                    throw new error_1.OpenAIError(`expected content to be 'output_text', got ${content.type}`);
                }
                const previousText = content.text;
                (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
                content.text = previousText + event.delta;
                (0, canonical_output_text_1.updateCachedOutputTextLength)(context, output, event.output_index, previousText, content.text);
                if (event.output_index === snapshot.output.length - 1 &&
                    event.content_index === output.content.length - 1) {
                    snapshot.output_text += event.delta;
                }
                else {
                    (0, canonical_output_text_1.updateOutputText)(context, snapshot, event.output_index, previousText, content.text, event.content_index);
                }
            }
            return true;
        }
        case 'response.output_text.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'message') {
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'output_text') {
                    throw new error_1.OpenAIError(`expected content to be 'output_text', got ${content.type}`);
                }
                const previousText = content.text;
                (0, canonical_output_text_1.ensureCanonicalOutputText)(context, snapshot);
                content.text = event.text;
                (0, canonical_output_text_1.updateCachedOutputTextLength)(context, output, event.output_index, previousText, event.text);
                (0, canonical_output_text_1.updateOutputText)(context, snapshot, event.output_index, previousText, event.text, event.content_index);
            }
            return true;
        }
        case 'response.output_text.annotation.added': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'message') {
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'output_text') {
                    throw new error_1.OpenAIError(`expected content to be 'output_text', got ${content.type}`);
                }
                validateArrayIndex(content.annotations, event.annotation_index, 'annotation', true);
                content.annotations[event.annotation_index] = structuredClone(event.annotation);
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateRefusalAndArgumentsEvent(event, snapshot) {
    switch (event.type) {
        case 'response.refusal.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'message') {
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'refusal') {
                    throw new error_1.OpenAIError(`expected content to be 'refusal', got ${content.type}`);
                }
                content.refusal += event.delta;
            }
            return true;
        }
        case 'response.refusal.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'message') {
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'refusal') {
                    throw new error_1.OpenAIError(`expected content to be 'refusal', got ${content.type}`);
                }
                content.refusal = event.refusal;
            }
            return true;
        }
        case 'response.function_call_arguments.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'function_call') {
                output.arguments += event.delta;
            }
            return true;
        }
        case 'response.function_call_arguments.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'function_call') {
                output.arguments = event.arguments;
            }
            return true;
        }
        case 'response.custom_tool_call_input.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'custom_tool_call') {
                output.input += event.delta;
            }
            return true;
        }
        case 'response.custom_tool_call_input.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'custom_tool_call') {
                output.input = event.input;
            }
            return true;
        }
        case 'response.mcp_call_arguments.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'mcp_call') {
                output.arguments += event.delta;
            }
            return true;
        }
        case 'response.mcp_call_arguments.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'mcp_call') {
                output.arguments = event.arguments;
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateShellEvent(event, snapshot) {
    switch (event.type) {
        case 'response.shell_call_command.added':
        case 'response.shell_call_command.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'shell_call') {
                const allowAppend = event.type === 'response.shell_call_command.added';
                validateArrayIndex(output.action.commands, event.command_index, 'command', allowAppend);
                output.action.commands[event.command_index] = event.command;
            }
            return true;
        }
        case 'response.shell_call_command.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'shell_call') {
                validateArrayIndex(output.action.commands, event.command_index, 'command');
                output.action.commands[event.command_index] += event.delta;
            }
            return true;
        }
        case 'response.shell_call_output_content.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'shell_call_output') {
                const content = getShellOutputContent(snapshot, output, event.command_index);
                content.stdout += event.delta.stdout ?? '';
                content.stderr += event.delta.stderr ?? '';
            }
            return true;
        }
        case 'response.shell_call_output_content.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'shell_call_output') {
                const content = getContent(event.output, 0);
                getShellOutputContent(snapshot, output, event.command_index);
                output.output[event.command_index] = structuredClone(content);
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateReasoningEvent(event, snapshot) {
    switch (event.type) {
        case 'response.reasoning_text.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                if (!output.content) {
                    throw new error_1.OpenAIError(`missing content at index ${event.content_index}`);
                }
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'reasoning_text') {
                    throw new error_1.OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
                }
                content.text += event.delta;
            }
            return true;
        }
        case 'response.reasoning_text.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                if (!output.content) {
                    throw new error_1.OpenAIError(`missing content at index ${event.content_index}`);
                }
                const content = getContent(output.content, event.content_index);
                if (content.type !== 'reasoning_text') {
                    throw new error_1.OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
                }
                content.text = event.text;
            }
            return true;
        }
        case 'response.reasoning_summary_part.added': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                validateArrayAppend(output.summary, event.summary_index, 'content');
                output.summary.push(structuredClone(event.part));
            }
            return true;
        }
        case 'response.reasoning_summary_part.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                getContent(output.summary, event.summary_index);
                output.summary[event.summary_index] = structuredClone(event.part);
            }
            return true;
        }
        case 'response.reasoning_summary_text.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                const part = getContent(output.summary, event.summary_index);
                part.text += event.delta;
            }
            return true;
        }
        case 'response.reasoning_summary_text.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'reasoning') {
                const part = getContent(output.summary, event.summary_index);
                part.text = event.text;
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateCodeInterpreterEvent(event, snapshot) {
    switch (event.type) {
        case 'response.code_interpreter_call_code.delta': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'code_interpreter_call') {
                output.code = (output.code ?? '') + event.delta;
            }
            return true;
        }
        case 'response.code_interpreter_call_code.done': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'code_interpreter_call') {
                output.code = event.code;
            }
            return true;
        }
        case 'response.code_interpreter_call.in_progress': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'code_interpreter_call') {
                output.status = 'in_progress';
            }
            return true;
        }
        case 'response.code_interpreter_call.interpreting': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'code_interpreter_call') {
                output.status = 'interpreting';
            }
            return true;
        }
        case 'response.code_interpreter_call.completed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'code_interpreter_call') {
                output.status = 'completed';
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateSearchStatusEvent(event, snapshot) {
    switch (event.type) {
        case 'response.file_search_call.in_progress': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'file_search_call') {
                output.status = 'in_progress';
            }
            return true;
        }
        case 'response.file_search_call.searching': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'file_search_call') {
                output.status = 'searching';
            }
            return true;
        }
        case 'response.file_search_call.completed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'file_search_call') {
                output.status = 'completed';
            }
            return true;
        }
        case 'response.web_search_call.in_progress': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'web_search_call') {
                output.status = 'in_progress';
            }
            return true;
        }
        case 'response.web_search_call.searching': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'web_search_call') {
                output.status = 'searching';
            }
            return true;
        }
        case 'response.web_search_call.completed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'web_search_call') {
                output.status = 'completed';
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function accumulateImageAndMcpStatusEvent(event, snapshot) {
    switch (event.type) {
        case 'response.image_generation_call.in_progress': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'image_generation_call') {
                output.status = 'in_progress';
            }
            return true;
        }
        case 'response.image_generation_call.generating': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'image_generation_call') {
                output.status = 'generating';
            }
            return true;
        }
        case 'response.image_generation_call.completed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'image_generation_call') {
                output.status = 'completed';
            }
            return true;
        }
        case 'response.mcp_call.in_progress': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'mcp_call') {
                output.status = 'in_progress';
            }
            return true;
        }
        case 'response.mcp_call.completed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'mcp_call') {
                output.status = 'completed';
            }
            return true;
        }
        case 'response.mcp_call.failed': {
            const output = getOutput(snapshot, event.output_index);
            if (output.type === 'mcp_call') {
                output.status = 'failed';
            }
            return true;
        }
        default: {
            return false;
        }
    }
}
function isResponseLifecycleEvent(event) {
    switch (event.type) {
        case 'response.created':
        case 'response.queued':
        case 'response.in_progress':
        case 'response.completed':
        case 'response.failed':
        case 'response.incomplete': {
            return true;
        }
        default: {
            return false;
        }
    }
}
function isIgnoredResponseEvent(event) {
    switch (event.type) {
        case 'response.audio.delta':
        case 'response.audio.done':
        case 'response.audio.transcript.delta':
        case 'response.audio.transcript.done':
        case 'response.image_generation_call.partial_image':
        case 'response.mcp_list_tools.in_progress':
        case 'response.mcp_list_tools.completed':
        case 'response.mcp_list_tools.failed':
        case 'keepalive':
        case 'error': {
            return true;
        }
        default: {
            return false;
        }
    }
}
function createResponseContext() {
    return (0, canonical_output_text_1.createCanonicalResponseContext)();
}
function accumulateResponseWithContext(event, snapshot, context) {
    if (!snapshot) {
        if (event.type !== 'response.created') {
            throw new error_1.OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
        }
        return (0, canonical_output_text_1.cloneResponse)(context, event.response);
    }
    if (accumulateOutputItemEvent(event, snapshot, context)) {
        return snapshot;
    }
    if (accumulateContentPartAddedEvent(event, snapshot, context)) {
        return snapshot;
    }
    if (accumulateContentPartDoneEvent(event, snapshot, context)) {
        return snapshot;
    }
    if (accumulateOutputTextEvent(event, snapshot, context)) {
        return snapshot;
    }
    if (accumulateRefusalAndArgumentsEvent(event, snapshot)) {
        return snapshot;
    }
    if (accumulateShellEvent(event, snapshot)) {
        return snapshot;
    }
    if (accumulateReasoningEvent(event, snapshot)) {
        return snapshot;
    }
    if (accumulateCodeInterpreterEvent(event, snapshot)) {
        return snapshot;
    }
    if (accumulateSearchStatusEvent(event, snapshot)) {
        return snapshot;
    }
    if (accumulateImageAndMcpStatusEvent(event, snapshot)) {
        return snapshot;
    }
    if (isResponseLifecycleEvent(event)) {
        return (0, canonical_output_text_1.cloneResponse)(context, event.response);
    }
    if (isIgnoredResponseEvent(event)) {
        return snapshot;
    }
    return assertNever(event);
}
//# sourceMappingURL=response-accumulator.js.map

/***/ }),

/***/ 7831:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * This module provides internal shims and utility functions for environments where certain Node.js or global types may not be available.
 *
 * These are used to ensure we can provide a consistent behaviour between different JavaScript environments and good error
 * messages in cases where an environment isn't fully supported.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getDefaultFetch = getDefaultFetch;
exports.makeReadableStream = makeReadableStream;
exports.ReadableStreamFrom = ReadableStreamFrom;
exports.ReadableStreamToAsyncIterable = ReadableStreamToAsyncIterable;
exports.CancelReadableStream = CancelReadableStream;
function getDefaultFetch() {
    if (typeof fetch !== 'undefined') {
        return fetch;
    }
    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
}
function makeReadableStream(...args) {
    const ReadableStream = globalThis.ReadableStream;
    if (typeof ReadableStream === 'undefined') {
        // Note: All of the platforms / runtimes we officially support already define
        // `ReadableStream` as a global, so this should only ever be hit on unsupported runtimes.
        throw new Error('`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`');
    }
    return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
    let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
    return makeReadableStream({
        start() { },
        async pull(controller) {
            const { done, value } = await iter.next();
            if (done) {
                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },
        async cancel() {
            await iter.return?.();
        },
    });
}
/**
 * Most browsers don't yet have async iterable support for ReadableStream,
 * and Node has a very different way of reading bytes from its "ReadableStream".
 *
 * This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
function ReadableStreamToAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator])
        return stream;
    const reader = stream.getReader();
    return {
        async next() {
            try {
                const result = await reader.read();
                if (result?.done)
                    reader.releaseLock(); // release lock when stream becomes closed
                return result;
            }
            catch (e) {
                reader.releaseLock(); // release lock when stream becomes errored
                throw e;
            }
        },
        async return() {
            const cancelPromise = reader.cancel();
            reader.releaseLock();
            await cancelPromise;
            return { done: true, value: undefined };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
/**
 * Cancels a ReadableStream we don't need to consume.
 * See https://undici.nodejs.org/#/?id=garbage-collection
 */
async function CancelReadableStream(stream) {
    if (stream === null || typeof stream !== 'object')
        return;
    if (stream[Symbol.asyncIterator]) {
        await stream[Symbol.asyncIterator]().return?.();
        return;
    }
    const reader = stream.getReader();
    const cancelPromise = reader.cancel();
    reader.releaseLock();
    await cancelPromise;
}
//# sourceMappingURL=shims.js.map

/***/ }),

/***/ 7219:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toFile = toFile;
const uploads_1 = __nccwpck_require__(5887);
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isBlobLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.size === 'number' &&
    typeof value.type === 'string' &&
    typeof value.text === 'function' &&
    typeof value.slice === 'function' &&
    typeof value.arrayBuffer === 'function';
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isFileLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.lastModified === 'number' &&
    isBlobLike(value);
const isResponseLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.url === 'string' &&
    typeof value.blob === 'function';
const hasFilePropertyOverrides = (value, options) => (options?.type != null && options.type !== value.type) ||
    (options?.lastModified != null && options.lastModified !== value.lastModified) ||
    options?.endings != null;
const canReuseNativeFile = (value, name, options) => (name == null || name === value.name) && !hasFilePropertyOverrides(value, options);
/**
 * Buffers compatible content into a native {@link File} for an SDK upload.
 *
 * Existing native `File` objects are returned unchanged when their effective
 * filename and metadata are unchanged. Renamed native files reuse the original
 * file contents without buffering and retain their MIME type and modification
 * time unless explicitly overridden. Other filenames are inferred from response
 * URLs or input metadata when omitted, falling back to `unknown_file`. Responses,
 * native or compatible `Blob` values, and compatible non-native files supply
 * their MIME type unless `options.type` provides an explicit override.
 *
 * @param value An existing file, response, binary buffer, Blob-like object, async
 * stream of file parts, or a promise resolving to one of those values.
 * @param name Optional filename overriding inferred metadata or an existing filename.
 * @param options Optional file metadata, including MIME type and modification time.
 * @returns A native `File` containing the complete buffered input.
 * @throws {Error} If the runtime lacks a global `File` constructor or the input
 * cannot be converted into file contents.
 */
async function toFile(value, name, options) {
    (0, uploads_1.checkFileSupport)();
    // If it's a promise, resolve it.
    value = await value;
    if (isFileLike(value)) {
        const fileOptions = {
            ...options,
            type: options?.type ?? value.type,
            lastModified: options?.lastModified ?? value.lastModified,
        };
        if (value instanceof File) {
            if (canReuseNativeFile(value, name, options)) {
                return value;
            }
            return (0, uploads_1.makeFile)([value], name ?? value.name, fileOptions);
        }
        return (0, uploads_1.makeFile)([await value.arrayBuffer()], name ?? value.name, fileOptions);
    }
    if (isResponseLike(value)) {
        const blob = await value.blob();
        name || (name = (0, uploads_1.getName)(value));
        const responseOptions = options?.type === undefined && blob.type ? { ...options, type: blob.type } : options;
        return (0, uploads_1.makeFile)(await getBytes(blob), name, responseOptions);
    }
    const parts = await getBytes(value);
    name || (name = (0, uploads_1.getName)(value));
    if (options?.type === undefined) {
        const typedPart = parts.find((part) => typeof part === 'object' && 'type' in part && !!part.type);
        if (typedPart) {
            options = { ...options, type: typedPart.type };
        }
    }
    return (0, uploads_1.makeFile)(parts, name, options);
}
async function getBytes(value) {
    const parts = [];
    if (typeof value === 'string' ||
        ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
        value instanceof ArrayBuffer) {
        parts.push(value);
    }
    else if (isBlobLike(value)) {
        parts.push(value instanceof Blob ? value : new Blob([await value.arrayBuffer()], { type: value.type }));
    }
    else if ((0, uploads_1.isAsyncIterable)(value) // includes Readable, ReadableStream, etc.
    ) {
        for await (const chunk of value) {
            parts.push(...(await getBytes(chunk)));
        }
    }
    else {
        const constructor = value?.constructor?.name;
        throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ''}${propsForError(value)}`);
    }
    return parts;
}
function propsForError(value) {
    if (typeof value !== 'object' || value === null) {
        return '';
    }
    const props = Object.getOwnPropertyNames(value);
    return `; props: [${props.map((p) => `"${p}"`).join(', ')}]`;
}
//# sourceMappingURL=to-file.js.map

/***/ }),

/***/ 2345:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.__setModuleDefault = exports.__createBinding = void 0;
exports.__classPrivateFieldSet = __classPrivateFieldSet;
exports.__classPrivateFieldGet = __classPrivateFieldGet;
exports.__exportStar = __exportStar;
exports.__importStar = __importStar;
function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m")
        throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? (f.value = value) : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
var __createBinding = Object.create
    ? function (o, m, k, k2) {
        if (k2 === void 0)
            k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
            desc = {
                enumerable: true,
                get: function () {
                    return m[k];
                },
            };
        }
        Object.defineProperty(o, k2, desc);
    }
    : function (o, m, k, k2) {
        if (k2 === void 0)
            k2 = k;
        o[k2] = m[k];
    };
exports.__createBinding = __createBinding;
function __exportStar(m, o) {
    for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
            __createBinding(o, m, p);
}
var __setModuleDefault = Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }
    : function (o, v) {
        o["default"] = v;
    };
exports.__setModuleDefault = __setModuleDefault;
var ownKeys = function (o) {
    ownKeys =
        Object.getOwnPropertyNames ||
            function (o2) {
                var ar = [];
                for (var k in o2)
                    if (Object.prototype.hasOwnProperty.call(o2, k))
                        ar[ar.length] = k;
                return ar;
            };
    return ownKeys(o);
};
function __importStar(mod) {
    if (mod && mod.__esModule)
        return mod;
    var result = {};
    if (mod != null) {
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default")
                __createBinding(result, mod, k[i]);
    }
    __setModuleDefault(result, mod);
    return result;
}


/***/ }),

/***/ 5887:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createForm = exports.multipartFormRequestOptions = exports.maybeMultipartFormRequestOptions = exports.isAsyncIterable = exports.checkFileSupport = void 0;
exports.toStreamingFile = toStreamingFile;
exports.makeFile = makeFile;
exports.getName = getName;
const headers_1 = __nccwpck_require__(9267);
const shims_1 = __nccwpck_require__(7831);
const bytes_1 = __nccwpck_require__(9948);
const brand_privateStreamingFile = /* @__PURE__ */ Symbol('brand.privateStreamingFile');
/**
 * Wrap a stream as an uploadable file without reading it into memory.
 *
 * Unlike {@link toFile}, this helper does not create a web `File`, because the `File` constructor
 * must consume all of its contents up front. The stream is instead encoded lazily as multipart
 * form data when the request is sent.
 *
 * @param data Async-iterable or readable-stream chunks containing text, binary data, or blobs.
 * @param name Non-empty filename sent in the multipart request.
 * @param options Optional MIME type for the streaming file.
 * @throws {TypeError} If `name` is empty or the content type contains control characters.
 */
function toStreamingFile(data, name, options) {
    if (typeof name !== 'string' || !name) {
        throw new TypeError('toStreamingFile requires a non-empty file name');
    }
    const type = options?.type;
    if (type) {
        validateStreamingFileType(type);
    }
    return {
        [brand_privateStreamingFile]: true,
        data,
        name,
        ...(type ? { type } : {}),
    };
}
/**
 * Verifies that the current runtime exposes the global `File` constructor.
 *
 * @throws {Error} If `File` is unavailable; older Node.js runtimes receive an
 * additional upgrade or `node:buffer` compatibility suggestion.
 */
const checkFileSupport = () => {
    if (typeof File === 'undefined') {
        const { process } = globalThis;
        const isOldNode = typeof process?.versions?.node === 'string' &&
            Number.parseInt(process.versions.node.split('.'), 10) < 20;
        throw new Error('`File` is not defined as a global, which is required for file uploads.' +
            (isOldNode
                ? " Update to a supported Node.js LTS release, or set `globalThis.File` to `import('node:buffer').File`."
                : ''));
    }
};
exports.checkFileSupport = checkFileSupport;
/**
 * Construct a `File` instance. This is used to ensure a helpful error is thrown
 * for environments that don't define a global `File` yet.
 *
 * A missing filename becomes `unknown_file`.
 */
function makeFile(fileBits, fileName, options) {
    (0, exports.checkFileSupport)();
    return new File(fileBits, fileName ?? 'unknown_file', options);
}
/**
 * Infers a filename from an object's `name`, `url`, `filename`, or `path` value.
 *
 * Directory components separated by either `/` or `\\` are discarded unless an
 * explicitly supplied `name` or `filename` opts into preserving its path. Preserved
 * paths use forward slashes. Paths inferred from URLs and filesystem streams always
 * discard their directories.
 */
function getName(value, options) {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }
    const explicitName = ('name' in value && value.name && String(value.name)) ||
        ('filename' in value && value.filename && String(value.filename));
    if (explicitName) {
        return options?.stripFilename === false ? normalizeFilenamePath(explicitName) : basename(explicitName);
    }
    const url = 'url' in value && value.url && String(value.url);
    if (url) {
        try {
            return basename(new URL(url).pathname);
        }
        catch {
            return basename(url);
        }
    }
    const path = 'path' in value && value.path && String(value.path);
    return path ? basename(path) : undefined;
}
function basename(value) {
    return value.split(/[\\/]/).pop() || undefined;
}
function normalizeFilenamePath(value) {
    return value.replace(/\\/g, '/');
}
/** Identifies objects that expose a callable `Symbol.asyncIterator` method. */
const isAsyncIterable = (value) => value != null && typeof value === 'object' && typeof value[Symbol.asyncIterator] === 'function';
exports.isAsyncIterable = isAsyncIterable;
/**
 * Converts a request to multipart form data when its body contains an upload.
 *
 * Uploads include files, named blobs, responses, async iterables, readable
 * streams, and {@link StreamingFile} values anywhere in a nested body. Bodies
 * containing streaming values are encoded lazily; other uploads use `FormData`.
 * Requests without uploads are returned unchanged.
 */
const maybeMultipartFormRequestOptions = async (opts, fetch, formOptions) => {
    if (!hasUploadableValue(opts.body)) {
        return opts;
    }
    if (hasStreamingUploadableValue(opts.body)) {
        return createStreamingFormRequestOptions(opts, formOptions);
    }
    return { ...opts, body: await (0, exports.createForm)(opts.body, fetch, formOptions) };
};
exports.maybeMultipartFormRequestOptions = maybeMultipartFormRequestOptions;
/**
 * Encodes a request body as multipart form data even when no file is present.
 *
 * Streaming uploads produce a lazy multipart `ReadableStream` and an explicit
 * boundary header; other values are materialized into platform `FormData`.
 */
const multipartFormRequestOptions = async (opts, fetch, formOptions) => {
    if (hasStreamingUploadableValue(opts.body)) {
        return createStreamingFormRequestOptions(opts, formOptions);
    }
    return { ...opts, body: await (0, exports.createForm)(opts.body, fetch, formOptions) };
};
exports.multipartFormRequestOptions = multipartFormRequestOptions;
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
 * node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
 * properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
 * This function detects if the fetch function provided supports the global FormData object to avoid
 * confusing error messages later on.
 */
function supportsFormData(fetchObject) {
    const fetch = typeof fetchObject === 'function' ? fetchObject : fetchObject.fetch;
    const cached = supportsFormDataMap.get(fetch);
    if (cached) {
        return cached;
    }
    const promise = (async () => {
        try {
            let FetchResponse;
            if ('Response' in fetch) {
                FetchResponse = fetch.Response;
            }
            else {
                const response = await fetch('data:,');
                await response.arrayBuffer();
                FetchResponse = response.constructor;
            }
            const data = new FormData();
            if (data.toString() === (await new FetchResponse(data).text())) {
                return false;
            }
            return true;
        }
        catch {
            // avoid false negatives
            return true;
        }
    })();
    supportsFormDataMap.set(fetch, promise);
    return promise;
}
/**
 * Materializes an object into platform `FormData` after verifying fetch support.
 *
 * Strings, numbers, and booleans become text fields; responses, named blobs,
 * and async byte sources become file fields. Arrays and nested objects use
 * bracketed field names, while `undefined` values are omitted.
 *
 * @throws {TypeError} If the fetch implementation cannot encode global
 * `FormData`, a field is `null`, or a field has an unsupported value.
 */
const createForm = async (body, fetch, options = {}) => {
    if (!(await supportsFormData(fetch))) {
        throw new TypeError('The provided fetch function does not support file uploads with the current global FormData class.');
    }
    const form = new FormData();
    await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value, options)));
    return form;
};
exports.createForm = createForm;
// We check for Blob not File because Bun.File doesn't inherit from File,
// but they both inherit from Blob and have a `name` property at runtime.
const isNamedBlob = (value) => value instanceof Blob && 'name' in value;
const isReadableStream = (value) => typeof value === 'object' &&
    value !== null &&
    'getReader' in value &&
    typeof value.getReader === 'function';
const isStreamingFile = (value) => typeof value === 'object' && value !== null && brand_privateStreamingFile in value;
const isUploadable = (value) => typeof value === 'object' &&
    value !== null &&
    (value instanceof Response ||
        (0, exports.isAsyncIterable)(value) ||
        isReadableStream(value) ||
        isStreamingFile(value) ||
        isNamedBlob(value));
const hasStreamingUploadableValue = (value) => {
    if (isStreamingFile(value) || (0, exports.isAsyncIterable)(value) || isReadableStream(value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some(hasStreamingUploadableValue);
    }
    if (value && typeof value === 'object' && !isNamedBlob(value) && !(value instanceof Response)) {
        for (const k in value) {
            if (hasStreamingUploadableValue(value[k])) {
                return true;
            }
        }
    }
    return false;
};
const hasUploadableValue = (value) => {
    if (isUploadable(value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some(hasUploadableValue);
    }
    if (value && typeof value === 'object') {
        for (const k in value) {
            if (hasUploadableValue(value[k])) {
                return true;
            }
        }
    }
    return false;
};
const createStreamingFormRequestOptions = (opts, options = {}) => {
    const boundary = `openai-${Math.random().toString(36).slice(2)}`;
    const body = (0, shims_1.ReadableStreamFrom)(iterateMultipartBody(opts.body, boundary, options));
    return {
        ...opts,
        body,
        headers: (0, headers_1.buildHeaders)([{ 'content-type': `multipart/form-data; boundary=${boundary}` }, opts.headers]),
    };
};
async function* iterateMultipartBody(body, boundary, options) {
    for await (const { key, value } of iterateFormEntries(body)) {
        if (isUploadable(value)) {
            const filename = getStreamingFileName(value, options);
            const type = getStreamingFileType(value);
            yield (0, bytes_1.encodeUTF8)(`--${boundary}\r\n`);
            yield (0, bytes_1.encodeUTF8)(`Content-Disposition: form-data; name="${escapeHeaderValue(key)}"; filename="${escapeHeaderValue(filename)}"\r\nContent-Type: ${type}\r\n\r\n`);
            yield* iterateBytes(getStreamingFileData(value));
        }
        else {
            yield (0, bytes_1.encodeUTF8)(`--${boundary}\r\n`);
            yield (0, bytes_1.encodeUTF8)(`Content-Disposition: form-data; name="${escapeHeaderValue(key)}"\r\n\r\n${String(value)}`);
        }
        yield (0, bytes_1.encodeUTF8)('\r\n');
    }
    yield (0, bytes_1.encodeUTF8)(`--${boundary}--\r\n`);
}
async function* iterateFormEntries(body) {
    if (!body || typeof body !== 'object') {
        return;
    }
    for (const [key, value] of Object.entries(body)) {
        yield* iterateFormValue(key, value);
    }
}
async function* iterateFormValue(key, value) {
    if (value === undefined) {
        return;
    }
    if (value == null) {
        throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
    }
    if (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        isUploadable(value)) {
        yield { key, value };
    }
    else if (Array.isArray(value)) {
        for (const entry of value) {
            yield* iterateFormValue(key + '[]', entry);
        }
    }
    else if (typeof value === 'object') {
        for (const [name, prop] of Object.entries(value)) {
            yield* iterateFormValue(`${key}[${name}]`, prop);
        }
    }
    else {
        throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
    }
}
function getStreamingFileName(value, options) {
    if (isStreamingFile(value)) {
        const { name } = value;
        if (typeof name !== 'string' || !name) {
            throw new TypeError('Streaming upload file name must be a non-empty string');
        }
        return options.stripFilenames === false ? normalizeFilenamePath(name) : name;
    }
    return getName(value, { stripFilename: options.stripFilenames }) ?? 'unknown_file';
}
function getStreamingFileType(value) {
    let type;
    if (isStreamingFile(value) || isNamedBlob(value)) {
        ({ type } = value);
    }
    else if (value instanceof Response) {
        type = value.headers.get('content-type') ?? undefined;
    }
    return validateStreamingFileType(type || 'application/octet-stream');
}
function validateStreamingFileType(type) {
    if (typeof type !== 'string') {
        throw new TypeError('Streaming upload content type must be a string');
    }
    for (let index = 0; index < type.length; index += 1) {
        const character = type.codePointAt(index) ?? 0;
        if (character <= 0x1f || character === 0x7f) {
            throw new TypeError('Streaming upload content type must not contain control characters');
        }
    }
    return type;
}
function getStreamingFileData(value) {
    if (isStreamingFile(value)) {
        return value.data;
    }
    return value;
}
async function* iterateBytes(value) {
    if (typeof value === 'string') {
        yield (0, bytes_1.encodeUTF8)(value);
    }
    else if (ArrayBuffer.isView(value)) {
        yield new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    else if (value instanceof ArrayBuffer) {
        yield new Uint8Array(value);
    }
    else if (value instanceof Response) {
        yield* iterateBytes(value.body || (await value.blob()));
    }
    else if (value instanceof Blob) {
        if (typeof value.stream === 'function') {
            yield* iterateBytes(value.stream());
        }
        else {
            yield new Uint8Array(await value.arrayBuffer());
        }
    }
    else if (isReadableStream(value)) {
        for await (const chunk of (0, shims_1.ReadableStreamToAsyncIterable)(value)) {
            yield* iterateBytes(chunk);
        }
    }
    else if ((0, exports.isAsyncIterable)(value)) {
        for await (const chunk of value) {
            yield* iterateBytes(chunk);
        }
    }
    else {
        throw new TypeError(`Invalid streaming file chunk: ${String(value)}`);
    }
}
function escapeHeaderValue(value) {
    return Array.from(value, (character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 0x1f || codePoint === 0x7f || character === '"' || character === '\\'
            ? encodeURIComponent(character)
            : character;
    }).join('');
}
const addFormValue = async (form, key, value, options) => {
    if (value === undefined) {
        return;
    }
    if (value == null) {
        throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
    }
    // Nested form keys use the current bracketed encoding.
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(key, String(value));
    }
    else if (value instanceof Response) {
        form.append(key, makeFile([await value.blob()], getName(value, { stripFilename: options.stripFilenames })));
    }
    else if ((0, exports.isAsyncIterable)(value)) {
        form.append(key, makeFile([await new Response((0, shims_1.ReadableStreamFrom)(value)).blob()], getName(value, { stripFilename: options.stripFilenames })));
    }
    else if (isNamedBlob(value)) {
        form.append(key, value, getName(value, { stripFilename: options.stripFilenames }));
    }
    else if (Array.isArray(value)) {
        await Promise.all(value.map((entry) => addFormValue(form, key + '[]', entry, options)));
    }
    else if (typeof value === 'object') {
        await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop, options)));
    }
    else {
        throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
    }
};
//# sourceMappingURL=uploads.js.map

/***/ }),

/***/ 2152:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __nccwpck_require__(2345);
tslib_1.__exportStar(__nccwpck_require__(7325), exports);
tslib_1.__exportStar(__nccwpck_require__(1040), exports);
tslib_1.__exportStar(__nccwpck_require__(3432), exports);
tslib_1.__exportStar(__nccwpck_require__(6273), exports);
tslib_1.__exportStar(__nccwpck_require__(660), exports);
tslib_1.__exportStar(__nccwpck_require__(5668), exports);
tslib_1.__exportStar(__nccwpck_require__(4007), exports);
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 1040:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toFloat32Array = exports.fromBase64 = exports.toBase64 = void 0;
const error_1 = __nccwpck_require__(5093);
const bytes_1 = __nccwpck_require__(9948);
const toBase64 = (data) => {
    if (!data)
        return '';
    if (typeof globalThis.Buffer !== 'undefined') {
        return globalThis.Buffer.from(data).toString('base64');
    }
    if (typeof data === 'string') {
        data = (0, bytes_1.encodeUTF8)(data);
    }
    if (typeof btoa !== 'undefined') {
        return btoa(String.fromCharCode.apply(null, data));
    }
    throw new error_1.OpenAIError('Cannot generate base64 string; Expected `Buffer` or `btoa` to be defined');
};
exports.toBase64 = toBase64;
const fromBase64 = (str) => {
    if (typeof globalThis.Buffer !== 'undefined') {
        const buf = globalThis.Buffer.from(str, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    if (typeof atob !== 'undefined') {
        const bstr = atob(str);
        const buf = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            buf[i] = bstr.charCodeAt(i);
        }
        return buf;
    }
    throw new error_1.OpenAIError('Cannot decode base64 string; Expected `Buffer` or `atob` to be defined');
};
exports.fromBase64 = fromBase64;
/**
 * Converts a Base64 encoded string to a Float32Array.
 * @param base64Str - The Base64 encoded string.
 * @returns An Array of numbers interpreted as Float32 values.
 */
const toFloat32Array = (base64Str) => {
    if (typeof Buffer !== 'undefined') {
        // for Node.js environment
        const buf = Buffer.from(base64Str, 'base64');
        return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
    }
    else {
        // for legacy web platform APIs
        const binaryStr = atob(base64Str);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return Array.from(new Float32Array(bytes.buffer));
    }
};
exports.toFloat32Array = toFloat32Array;
//# sourceMappingURL=base64.js.map

/***/ }),

/***/ 9948:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.concatBytes = concatBytes;
exports.encodeUTF8 = encodeUTF8;
exports.decodeUTF8 = decodeUTF8;
/** Copies byte arrays into one contiguous `Uint8Array` while preserving their order. */
function concatBytes(buffers) {
    let length = 0;
    for (const buffer of buffers) {
        length += buffer.length;
    }
    const output = new Uint8Array(length);
    let index = 0;
    for (const buffer of buffers) {
        output.set(buffer, index);
        index += buffer.length;
    }
    return output;
}
let encodeUTF8_;
/** Encodes text as UTF-8 bytes, reusing the platform encoder after its first call. */
function encodeUTF8(str) {
    let encoder;
    return (encodeUTF8_ ??
        ((encoder = new globalThis.TextEncoder()), (encodeUTF8_ = encoder.encode.bind(encoder))))(str);
}
let decodeUTF8_;
/** Decodes UTF-8 bytes as text, reusing the platform decoder after its first call. */
function decodeUTF8(bytes) {
    let decoder;
    return (decodeUTF8_ ??
        ((decoder = new globalThis.TextDecoder()), (decodeUTF8_ = decoder.decode.bind(decoder))))(bytes);
}
//# sourceMappingURL=bytes.js.map

/***/ }),

/***/ 3432:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readEnv = void 0;
/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */
const readEnv = (env) => {
    if (typeof globalThis.process !== 'undefined') {
        return globalThis.process.env?.[env]?.trim() || undefined;
    }
    if (typeof globalThis.Deno !== 'undefined') {
        return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
    }
    return undefined;
};
exports.readEnv = readEnv;
//# sourceMappingURL=env.js.map

/***/ }),

/***/ 6273:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.formatRequestDetails = exports.parseLogLevel = void 0;
exports.loggerFor = loggerFor;
const values_1 = __nccwpck_require__(7325);
const levelNumbers = {
    off: 0,
    error: 200,
    warn: 300,
    info: 400,
    debug: 500,
};
const parseLogLevel = (maybeLevel, sourceName, client) => {
    if (!maybeLevel) {
        return undefined;
    }
    if ((0, values_1.hasOwn)(levelNumbers, maybeLevel)) {
        return maybeLevel;
    }
    loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
    return undefined;
};
exports.parseLogLevel = parseLogLevel;
function noop() { }
function makeLogFn(fnLevel, logger, logLevel) {
    if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
        return noop;
    }
    else {
        // Don't wrap logger functions, we want the stacktrace intact!
        return logger[fnLevel].bind(logger);
    }
}
const noopLogger = {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
    const logger = client.logger;
    const logLevel = client.logLevel ?? 'off';
    if (!logger) {
        return noopLogger;
    }
    const cachedLogger = cachedLoggers.get(logger);
    if (cachedLogger && cachedLogger[0] === logLevel) {
        return cachedLogger[1];
    }
    const levelLogger = {
        error: makeLogFn('error', logger, logLevel),
        warn: makeLogFn('warn', logger, logLevel),
        info: makeLogFn('info', logger, logLevel),
        debug: makeLogFn('debug', logger, logLevel),
    };
    cachedLoggers.set(logger, [logLevel, levelLogger]);
    return levelLogger;
}
const formatRequestDetails = (details) => {
    if (details.options) {
        details.options = { ...details.options };
        delete details.options['headers']; // redundant + leaks internals
    }
    if (details.headers) {
        details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
            name,
            name.toLowerCase() === 'authorization' ||
                name.toLowerCase() === 'api-key' ||
                name.toLowerCase() === 'x-api-key' ||
                name.toLowerCase() === 'x-amz-security-token' ||
                name.toLowerCase() === 'cookie' ||
                name.toLowerCase() === 'set-cookie'
                ? '***'
                : value,
        ]));
    }
    if ('retryOfRequestLogID' in details) {
        if (details.retryOfRequestLogID) {
            details.retryOf = details.retryOfRequestLogID;
        }
        delete details.retryOfRequestLogID;
    }
    return details;
};
exports.formatRequestDetails = formatRequestDetails;
//# sourceMappingURL=log.js.map

/***/ }),

/***/ 2704:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.path = exports.createPathTagFunction = void 0;
exports.encodeURIPath = encodeURIPath;
const error_1 = __nccwpck_require__(5093);
/**
 * Percent-encodes a single URI path parameter while preserving RFC 3986 path characters.
 *
 * Slash, question-mark, and hash characters are encoded so an interpolated value
 * cannot create another path segment, query string, or fragment.
 *
 * Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
 * > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
 * > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
 */
function encodeURIPath(str) {
    return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
/**
 * Creates a template tag that safely interpolates SDK resource paths.
 *
 * Path values use the supplied encoder; values after a literal `?` or `#` use
 * `encodeURIComponent`. Nullish values, ordinary objects, and literal or
 * percent-encoded `.`/`..` path segments are rejected with an SDK error.
 */
const createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
    // If there are no params, no processing is needed.
    if (statics.length === 1) {
        return statics[0];
    }
    let postPath = false;
    const invalidSegments = [];
    let path = '';
    for (let index = 0; index < statics.length; index += 1) {
        if (index in statics) {
            const currentValue = statics[index];
            if (/[?#]/.test(currentValue)) {
                postPath = true;
            }
            const value = params[index];
            let encoded = (postPath ? encodeURIComponent : pathEncoder)('' + value);
            if (index !== params.length &&
                (value == null ||
                    (typeof value === 'object' &&
                        // handle values from other realms
                        value.toString ===
                            Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)
                                ?.toString))) {
                encoded = value + '';
                invalidSegments.push({
                    start: path.length + currentValue.length,
                    length: encoded.length,
                    error: `Value of type ${Object.prototype.toString
                        .call(value)
                        .slice(8, -1)} is not a valid path parameter`,
                });
            }
            path += currentValue + (index === params.length ? '' : encoded);
        }
    }
    const pathOnly = path.split(/[?#]/, 1)[0];
    const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
    let match;
    // Find all invalid segments
    while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
        invalidSegments.push({
            start: match.index,
            length: match[0].length,
            error: `Value "${match[0]}" can't be safely passed as a path parameter`,
        });
    }
    invalidSegments.sort((a, b) => a.start - b.start);
    if (invalidSegments.length > 0) {
        let lastEnd = 0;
        let underline = '';
        for (const segment of invalidSegments) {
            const spaces = ' '.repeat(segment.start - lastEnd);
            const arrows = '^'.repeat(segment.length);
            lastEnd = segment.start + segment.length;
            underline += spaces + arrows;
        }
        throw new error_1.OpenAIError(`Path parameters result in path with invalid segments:\n${invalidSegments
            .map((e) => e.error)
            .join('\n')}\n${path}\n${underline}`);
    }
    return path;
};
exports.createPathTagFunction = createPathTagFunction;
/**
 * Template tag that encodes resource-path parameters and rejects traversal segments.
 *
 * Values inside query strings and fragments are encoded as URI components.
 */
exports.path = (0, exports.createPathTagFunction)(encodeURIPath);
//# sourceMappingURL=path.js.map

/***/ }),

/***/ 4007:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.stringifyQuery = stringifyQuery;
const tslib_1 = __nccwpck_require__(2345);
const qs = tslib_1.__importStar(__nccwpck_require__(1123));
function stringifyQuery(query) {
    return qs.stringify(query, { arrayFormat: 'brackets' });
}
//# sourceMappingURL=query.js.map

/***/ }),

/***/ 5668:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sleep = void 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
//# sourceMappingURL=sleep.js.map

/***/ }),

/***/ 660:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.uuid4 = void 0;
/**
 * https://stackoverflow.com/a/2117523
 */
let uuid4 = function () {
    const { crypto } = globalThis;
    if (crypto?.randomUUID) {
        exports.uuid4 = crypto.randomUUID.bind(crypto);
        return crypto.randomUUID();
    }
    const u8 = new Uint8Array(1);
    const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => (Math.random() * 0xff) & 0xff;
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (randomByte() & (15 >> (+c / 4)))).toString(16));
};
exports.uuid4 = uuid4;
//# sourceMappingURL=uuid.js.map

/***/ }),

/***/ 7325:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.safeJSON = exports.maybeCoerceBoolean = exports.maybeCoerceFloat = exports.maybeCoerceInteger = exports.coerceBoolean = exports.coerceFloat = exports.coerceInteger = exports.validatePositiveInteger = exports.ensurePresent = exports.isReadonlyArray = exports.isArray = exports.isAbsoluteURL = void 0;
exports.maybeObj = maybeObj;
exports.isEmptyObj = isEmptyObj;
exports.hasOwn = hasOwn;
exports.isObj = isObj;
const error_1 = __nccwpck_require__(5093);
// https://url.spec.whatwg.org/#url-scheme-string
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url) => {
    return startsWithSchemeRegexp.test(url);
};
exports.isAbsoluteURL = isAbsoluteURL;
let isArray = (val) => ((exports.isArray = Array.isArray), (0, exports.isArray)(val));
exports.isArray = isArray;
exports.isReadonlyArray = exports.isArray;
/** Returns an object if the given value isn't an object, otherwise returns as-is */
function maybeObj(x) {
    if (typeof x !== 'object') {
        return {};
    }
    return x ?? {};
}
// https://stackoverflow.com/a/34491287
function isEmptyObj(obj) {
    if (!obj)
        return true;
    for (const _k in obj)
        return false;
    return true;
}
// https://eslint.org/docs/latest/rules/no-prototype-builtins
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
    return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
const ensurePresent = (value) => {
    if (value == null) {
        throw new error_1.OpenAIError(`Expected a value to be given but received ${value} instead.`);
    }
    return value;
};
exports.ensurePresent = ensurePresent;
const validatePositiveInteger = (name, n) => {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
        throw new error_1.OpenAIError(`${name} must be an integer`);
    }
    if (n < 0) {
        throw new error_1.OpenAIError(`${name} must be a positive integer`);
    }
    return n;
};
exports.validatePositiveInteger = validatePositiveInteger;
const coerceInteger = (value) => {
    if (typeof value === 'number')
        return Math.round(value);
    if (typeof value === 'string')
        return parseInt(value, 10);
    throw new error_1.OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
exports.coerceInteger = coerceInteger;
const coerceFloat = (value) => {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return parseFloat(value);
    throw new error_1.OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
exports.coerceFloat = coerceFloat;
const coerceBoolean = (value) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string')
        return value === 'true';
    return Boolean(value);
};
exports.coerceBoolean = coerceBoolean;
const maybeCoerceInteger = (value) => {
    if (value == null) {
        return undefined;
    }
    return (0, exports.coerceInteger)(value);
};
exports.maybeCoerceInteger = maybeCoerceInteger;
const maybeCoerceFloat = (value) => {
    if (value == null) {
        return undefined;
    }
    return (0, exports.coerceFloat)(value);
};
exports.maybeCoerceFloat = maybeCoerceFloat;
const maybeCoerceBoolean = (value) => {
    if (value == null) {
        return undefined;
    }
    return (0, exports.coerceBoolean)(value);
};
exports.maybeCoerceBoolean = maybeCoerceBoolean;
const safeJSON = (text) => {
    try {
        return JSON.parse(text);
    }
    catch (err) {
        return undefined;
    }
};
exports.safeJSON = safeJSON;
//# sourceMappingURL=values.js.map

/***/ }),

/***/ 2883:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _AbstractChatCompletionRunner_instances, _a, _AbstractChatCompletionRunner_getFinalContent, _AbstractChatCompletionRunner_getFinalMessage, _AbstractChatCompletionRunner_getFinalFunctionToolCall, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult, _AbstractChatCompletionRunner_calculateTotalUsage, _AbstractChatCompletionRunner_validateParams, _AbstractChatCompletionRunner_stringifyFunctionCallResult;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AbstractChatCompletionRunner = void 0;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(3269);
const uuid_1 = __nccwpck_require__(660);
const parser_1 = __nccwpck_require__(1368);
const chatCompletionUtils_1 = __nccwpck_require__(1582);
const EventStream_1 = __nccwpck_require__(4283);
const RunnableFunction_1 = __nccwpck_require__(9802);
const DEFAULT_MAX_CHAT_COMPLETIONS = 10;
function normalizeToolCallIds(chatCompletion) {
    for (const choice of chatCompletion.choices) {
        for (const toolCall of choice.message.tool_calls ?? []) {
            // Some OpenAI-compatible providers omit tool call IDs or return an empty string.
            // Generate a unique ID before the completion is stored or emitted so the assistant
            // tool call and its result message always reference the same value.
            if (!toolCall.id) {
                toolCall.id = `call_${(0, uuid_1.uuid4)()}`;
            }
        }
    }
}
/**
 * Parsed completions contain response-only and helper-only fields. Keep those
 * on runner.messages for callers, but only replay valid request fields.
 */
function toRequestMessage(message) {
    if (!(0, chatCompletionUtils_1.isAssistantMessage)(message)) {
        return message;
    }
    const requestMessage = { role: 'assistant' };
    if (message.audio != null) {
        requestMessage.audio = { id: message.audio.id };
    }
    if (message.content !== undefined) {
        requestMessage.content = message.content;
    }
    if (message.function_call != null) {
        requestMessage.function_call = message.function_call;
    }
    if (message.name !== undefined) {
        requestMessage.name = message.name;
    }
    if (message.refusal != null) {
        requestMessage.refusal = message.refusal;
    }
    if (message.tool_calls !== undefined) {
        requestMessage.tool_calls = message.tool_calls.map((toolCall) => {
            if (toolCall.type === 'custom') {
                return {
                    id: toolCall.id,
                    type: toolCall.type,
                    custom: {
                        input: toolCall.custom.input,
                        name: toolCall.custom.name,
                    },
                };
            }
            return {
                id: toolCall.id,
                type: toolCall.type,
                function: {
                    arguments: toolCall.function.arguments,
                    name: toolCall.function.name,
                },
            };
        });
    }
    return requestMessage;
}
/** Shared conversation, event, cancellation, and final-result behavior for chat completion runners. */
class AbstractChatCompletionRunner extends EventStream_1.EventStream {
    constructor() {
        super(...arguments);
        _AbstractChatCompletionRunner_instances.add(this);
        this._chatCompletions = [];
        /** Mutable conversation history, including initial input, assistant replies, and tool results. */
        this.messages = [];
    }
    _addChatCompletion(chatCompletion) {
        normalizeToolCallIds(chatCompletion);
        this._chatCompletions.push(chatCompletion);
        this._emit('chatCompletion', chatCompletion);
        const message = chatCompletion.choices[0]?.message;
        if (message) {
            this._addMessage(message);
        }
        return chatCompletion;
    }
    _addMessage(message, emit = true) {
        if (!('content' in message)) {
            message.content = null;
        }
        this.messages.push(message);
        if (emit) {
            this._emit('message', message);
            if ((0, chatCompletionUtils_1.isToolMessage)(message) && message.content) {
                // Note, this assumes that {role: 'tool', content: …} is always the result of a call of tool of type=function.
                this._emit('functionToolCallResult', message.content);
            }
            else if ((0, chatCompletionUtils_1.isAssistantMessage)(message) && message.tool_calls) {
                for (const tool_call of message.tool_calls) {
                    if (tool_call.type === 'function') {
                        this._emit('functionToolCall', tool_call.function);
                    }
                }
            }
        }
    }
    /**
     * @returns a promise that resolves with the final ChatCompletion, or rejects
     * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
     */
    async finalChatCompletion() {
        await this.done();
        const completion = this._chatCompletions[this._chatCompletions.length - 1];
        if (!completion) {
            throw new error_1.OpenAIError('stream ended without producing a ChatCompletion');
        }
        return completion;
    }
    /**
     * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
     * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
     */
    async finalContent() {
        await this.done();
        return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    }
    /**
     * @returns a promise that resolves with the final assistant ChatCompletionMessage response,
     * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
     */
    async finalMessage() {
        await this.done();
        return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    }
    /**
     * Waits for completion and returns the last function-tool call, or `undefined`
     * when no assistant message contains a function-tool call.
     */
    async finalFunctionToolCall() {
        await this.done();
        return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
    }
    /** Waits for completion and returns the last matching function-tool result, if any. */
    async finalFunctionToolCallResult() {
        await this.done();
        return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
    }
    /** Waits for completion and sums token usage across every chat completion in the run. */
    async totalUsage() {
        await this.done();
        return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
    }
    /** Returns a copy of the chat completions received so far, in request order. */
    allChatCompletions() {
        return [...this._chatCompletions];
    }
    _emitFinal() {
        const completion = this._chatCompletions[this._chatCompletions.length - 1];
        if (completion) {
            this._emit('finalChatCompletion', completion);
        }
        const finalMessage = tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
        if (finalMessage) {
            this._emit('finalMessage', finalMessage);
        }
        const finalContent = tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
        if (finalContent) {
            this._emit('finalContent', finalContent);
        }
        const finalFunctionCall = tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
        if (finalFunctionCall) {
            this._emit('finalFunctionToolCall', finalFunctionCall);
        }
        const finalFunctionCallResult = tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
        if (finalFunctionCallResult != null) {
            this._emit('finalFunctionToolCallResult', finalFunctionCallResult);
        }
        if (this._chatCompletions.some((c) => c.usage)) {
            this._emit('totalUsage', tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
        }
    }
    async _createChatCompletion(client, params, options) {
        this._listenForAbort(options?.signal);
        tslib_1.__classPrivateFieldGet(_a, _a, "m", _AbstractChatCompletionRunner_validateParams).call(_a, params);
        const chatCompletion = await client.chat.completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
        this._connected();
        return this._addChatCompletion((0, parser_1.parseChatCompletion)(chatCompletion, params));
    }
    async _runChatCompletion(client, params, options) {
        for (const message of params.messages) {
            this._addMessage(message, false);
        }
        return await this._createChatCompletion(client, params, options);
    }
    async _runTools(client, params, runner, options) {
        const role = 'tool';
        const { tool_choice = 'auto', stream, toolContext: inputToolContext, ...restParams } = params;
        const toolContext = inputToolContext;
        const singleFunctionToCall = typeof tool_choice !== 'string' && tool_choice.type === 'function' && tool_choice?.function?.name;
        const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS, afterCompletion } = options || {};
        // Normalize tool definitions before invoking callbacks.
        const inputTools = params.tools.map((tool) => {
            if ((0, parser_1.isAutoParsableTool)(tool)) {
                if (!tool.$callback) {
                    throw new error_1.OpenAIError('Tool given to `.runTools()` that does not have an associated function');
                }
                return {
                    type: 'function',
                    function: {
                        function: tool.$callback,
                        name: tool.function.name,
                        description: tool.function.description || '',
                        parameters: tool.function.parameters,
                        parse: tool.$parseRaw,
                        strict: true,
                    },
                };
            }
            return tool;
        });
        const functionsByName = Object.create(null);
        for (const f of inputTools) {
            if (f.type === 'function') {
                functionsByName[f.function.name || f.function.function.name] = f.function;
            }
        }
        const tools = 'tools' in params
            ? inputTools.map((t) => t.type === 'function'
                ? {
                    type: 'function',
                    function: {
                        name: t.function.name || t.function.function.name,
                        parameters: t.function.parameters,
                        description: t.function.description,
                        strict: t.function.strict,
                    },
                }
                : t)
            : undefined;
        for (const message of params.messages) {
            this._addMessage(message, false);
        }
        const runToolCall = async (toolCall) => {
            if (toolCall.type !== 'function') {
                return { message: undefined, functionCalled: false };
            }
            const tool_call_id = toolCall.id;
            const { name, arguments: args } = toolCall.function;
            const fn = functionsByName[name];
            if (!fn) {
                const content = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName)
                    .map((name) => JSON.stringify(name))
                    .join(', ')}. Please try again`;
                return { message: { role, tool_call_id, content }, functionCalled: false };
            }
            if (singleFunctionToCall && singleFunctionToCall !== name) {
                const content = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
                return { message: { role, tool_call_id, content }, functionCalled: false };
            }
            let rawContent;
            if ((0, RunnableFunction_1.isRunnableFunctionWithParse)(fn)) {
                let parsed;
                try {
                    parsed = await fn.parse(args);
                }
                catch (error) {
                    const content = error instanceof Error ? error.message : String(error);
                    return { message: { role, tool_call_id, content }, functionCalled: false };
                }
                rawContent = await fn.function(parsed, runner, toolContext);
            }
            else {
                rawContent = await fn.function(args, runner, toolContext);
            }
            const content = tslib_1.__classPrivateFieldGet(_a, _a, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(_a, rawContent);
            return { message: { role, tool_call_id, content }, functionCalled: true };
        };
        for (let i = 0; i < maxChatCompletions; ++i) {
            const chatCompletion = await this._createChatCompletion(client, {
                ...restParams,
                tool_choice,
                tools,
                messages: this.messages.map(toRequestMessage),
            }, options);
            const message = chatCompletion.choices[0]?.message;
            if (!message) {
                throw new error_1.OpenAIError(`missing message in ChatCompletion response`);
            }
            if (!message.tool_calls?.length) {
                await afterCompletion?.(chatCompletion, runner);
                return;
            }
            if (singleFunctionToCall || params.parallel_tool_calls === false) {
                for (const toolCall of message.tool_calls) {
                    const result = await runToolCall(toolCall);
                    if (result.message) {
                        this._addMessage(result.message);
                    }
                    if (singleFunctionToCall && result.functionCalled) {
                        await afterCompletion?.(chatCompletion, runner);
                        return;
                    }
                }
            }
            else {
                const results = await Promise.allSettled(message.tool_calls.map(runToolCall));
                // Wait for every concurrently running tool to settle before surfacing an
                // error so tool side effects cannot continue after the runner has ended.
                for (const result of results) {
                    if (result.status === 'rejected') {
                        throw result.reason;
                    }
                }
                // Promise.allSettled preserves input order, so the next request receives
                // tool result messages in the same order as the assistant's tool calls.
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.message) {
                        this._addMessage(result.value.message);
                    }
                }
            }
            await afterCompletion?.(chatCompletion, runner);
        }
    }
}
exports.AbstractChatCompletionRunner = AbstractChatCompletionRunner;
_a = AbstractChatCompletionRunner, _AbstractChatCompletionRunner_instances = new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent() {
    return tslib_1.__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage() {
    let i = this.messages.length;
    while (i-- > 0) {
        const message = this.messages[i];
        if ((0, chatCompletionUtils_1.isAssistantMessage)(message)) {
            // Audio is intentionally omitted from the final message snapshot.
            const ret = {
                ...message,
                content: message.content ?? null,
                refusal: message.refusal ?? null,
            };
            return ret;
        }
    }
    throw new error_1.OpenAIError('stream ended without producing a ChatCompletionMessage with role=assistant');
}, _AbstractChatCompletionRunner_getFinalFunctionToolCall = function _AbstractChatCompletionRunner_getFinalFunctionToolCall() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
        const message = this.messages[i];
        if ((0, chatCompletionUtils_1.isAssistantMessage)(message) && message?.tool_calls?.length) {
            for (let j = message.tool_calls.length - 1; j >= 0; j--) {
                const toolCall = message.tool_calls[j];
                if (toolCall?.type === 'function') {
                    return toolCall.function;
                }
            }
        }
    }
    return undefined;
}, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
        const message = this.messages[i];
        if ((0, chatCompletionUtils_1.isToolMessage)(message) &&
            message.content != null &&
            typeof message.content === 'string' &&
            this.messages.some((x) => x.role === 'assistant' &&
                x.tool_calls?.some((y) => y.type === 'function' && y.id === message.tool_call_id))) {
            return message.content;
        }
    }
    return undefined;
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage() {
    const total = {
        completion_tokens: 0,
        prompt_tokens: 0,
        total_tokens: 0,
    };
    for (const { usage } of this._chatCompletions) {
        if (usage) {
            total.completion_tokens += usage.completion_tokens;
            total.prompt_tokens += usage.prompt_tokens;
            total.total_tokens += usage.total_tokens;
        }
    }
    return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams(params) {
    if (params.n != null && params.n > 1) {
        throw new error_1.OpenAIError('ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.');
    }
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult(rawContent) {
    if (typeof rawContent === 'string') {
        return rawContent;
    }
    if (rawContent === undefined) {
        return 'undefined';
    }
    return JSON.stringify(rawContent);
};
//# sourceMappingURL=AbstractChatCompletionRunner.js.map

/***/ }),

/***/ 723:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _AssistantStream_instances, _AssistantStream_events, _AssistantStream_runStepSnapshots, _AssistantStream_messageSnapshots, _AssistantStream_messageSnapshot, _AssistantStream_finalRun, _AssistantStream_currentContentIndex, _AssistantStream_currentContent, _AssistantStream_currentToolCallIndex, _AssistantStream_currentToolCall, _AssistantStream_currentEvent, _AssistantStream_currentRunSnapshot, _AssistantStream_currentRunStepSnapshot, _AssistantStream_addEvent, _AssistantStream_endRequest, _AssistantStream_handleMessage, _AssistantStream_handleRunStep, _AssistantStream_emitExposed, _AssistantStream_handleEvent, _AssistantStream_accumulateRunStep, _AssistantStream_accumulateMessage, _AssistantStream_accumulateContent, _AssistantStream_handleRun;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssistantStream = void 0;
const tslib_1 = __nccwpck_require__(2345);
const streaming_1 = __nccwpck_require__(1835);
const error_1 = __nccwpck_require__(3269);
const EventStream_1 = __nccwpck_require__(4283);
const utils_1 = __nccwpck_require__(2152);
const assistant_stream_delta_1 = __nccwpck_require__(2305);
/** Streams assistant-run events while accumulating messages, run steps, and tool-call snapshots. */
class AssistantStream extends EventStream_1.EventStream {
    constructor() {
        super(...arguments);
        _AssistantStream_instances.add(this);
        //Track all events in a single list for reference
        _AssistantStream_events.set(this, []);
        //Used to accumulate deltas
        //We are accumulating many types so the value here is not strict
        _AssistantStream_runStepSnapshots.set(this, Object.create(null));
        _AssistantStream_messageSnapshots.set(this, Object.create(null));
        _AssistantStream_messageSnapshot.set(this, void 0);
        _AssistantStream_finalRun.set(this, void 0);
        _AssistantStream_currentContentIndex.set(this, void 0);
        _AssistantStream_currentContent.set(this, void 0);
        _AssistantStream_currentToolCallIndex.set(this, void 0);
        _AssistantStream_currentToolCall.set(this, void 0);
        //For current snapshot methods
        _AssistantStream_currentEvent.set(this, void 0);
        _AssistantStream_currentRunSnapshot.set(this, void 0);
        _AssistantStream_currentRunStepSnapshot.set(this, void 0);
    }
    /** Iterates over cloned raw assistant events; stopping early aborts the underlying request. */
    [(_AssistantStream_events = new WeakMap(), _AssistantStream_runStepSnapshots = new WeakMap(), _AssistantStream_messageSnapshots = new WeakMap(), _AssistantStream_messageSnapshot = new WeakMap(), _AssistantStream_finalRun = new WeakMap(), _AssistantStream_currentContentIndex = new WeakMap(), _AssistantStream_currentContent = new WeakMap(), _AssistantStream_currentToolCallIndex = new WeakMap(), _AssistantStream_currentToolCall = new WeakMap(), _AssistantStream_currentEvent = new WeakMap(), _AssistantStream_currentRunSnapshot = new WeakMap(), _AssistantStream_currentRunStepSnapshot = new WeakMap(), _AssistantStream_instances = new WeakSet(), Symbol.asyncIterator)]() {
        return this._createIterator((push) => {
            //Catch all for passing along all events
            const onEvent = (event) => push(structuredClone(event));
            this.on('event', onEvent);
            return () => this.off('event', onEvent);
        }, { onReturn: () => this.abort() });
    }
    /** Restores an assistant stream from events serialized by `toReadableStream()`. */
    static fromReadableStream(stream) {
        const runner = new AssistantStream();
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    async _fromReadableStream(readableStream, options) {
        this._listenForAbort(options?.signal);
        this._connected();
        const stream = streaming_1.Stream.fromReadableStream(readableStream, this.controller);
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return this._addRun(tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
    }
    /** Serializes assistant events into a readable stream for transfer to another runtime. */
    toReadableStream() {
        const stream = new streaming_1.Stream(this[Symbol.asyncIterator].bind(this), this.controller);
        return stream.toReadableStream();
    }
    /** Submits tool outputs and starts streaming the continuation of an existing assistant run. */
    static createToolAssistantStream(runId, runs, params, options) {
        const runner = new AssistantStream();
        runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'stream' },
        }));
        return runner;
    }
    async _createToolAssistantStream(run, runId, params, options) {
        this._listenForAbort(options?.signal);
        const body = { ...params, stream: true };
        const stream = await run.submitToolOutputs(runId, body, {
            ...options,
            signal: this.controller.signal,
        });
        this._connected();
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return this._addRun(tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
    }
    /** Creates an assistant thread and starts streaming its newly created run. */
    static createThreadAssistantStream(params, thread, options) {
        const runner = new AssistantStream();
        runner._run(() => runner._threadAssistantStream(params, thread, {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'stream' },
        }));
        return runner;
    }
    /** Creates a run on an existing assistant thread and starts streaming its events. */
    static createAssistantStream(threadId, runs, params, options) {
        const runner = new AssistantStream();
        runner._run(() => runner._runAssistantStream(threadId, runs, params, {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'stream' },
        }));
        return runner;
    }
    /** Returns the most recent raw event, or `undefined` before any event arrives. */
    currentEvent() {
        (0, assistant_stream_delta_1.markAssistantStreamValueExternallyMutable)(tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentEvent, "f"));
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentEvent, "f");
    }
    /** Returns the latest run snapshot, or `undefined` before a run event arrives. */
    currentRun() {
        (0, assistant_stream_delta_1.markAssistantStreamValueExternallyMutable)(tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f"));
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f");
    }
    /** Returns the message currently being accumulated, or `undefined` before message creation. */
    currentMessageSnapshot() {
        (0, assistant_stream_delta_1.markAssistantStreamValueExternallyMutable)(tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f");
    }
    /** Returns the run step currently being accumulated, or `undefined` before a step begins. */
    currentRunStepSnapshot() {
        (0, assistant_stream_delta_1.markAssistantStreamValueExternallyMutable)(tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f"));
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f");
    }
    /** Waits for successful completion and returns the final snapshot of every observed run step. */
    async finalRunSteps() {
        await this.done();
        return Object.values(tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f"));
    }
    /** Waits for successful completion and returns the final snapshot of every observed message. */
    async finalMessages() {
        await this.done();
        return Object.values(tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f"));
    }
    /** Waits for completion and returns the final run, or rejects if no terminal run was received. */
    async finalRun() {
        await this.done();
        if (!tslib_1.__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) {
            throw new Error('Final run was not received.');
        }
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
    }
    async _createThreadAssistantStream(thread, params, options) {
        this._listenForAbort(options?.signal);
        const body = { ...params, stream: true };
        const stream = await thread.createAndRun(body, { ...options, signal: this.controller.signal });
        this._connected();
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return this._addRun(tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
    }
    async _createAssistantStream(run, threadId, params, options) {
        this._listenForAbort(options?.signal);
        const body = { ...params, stream: true };
        const stream = await run.create(threadId, body, { ...options, signal: this.controller.signal });
        this._connected();
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return this._addRun(tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
    }
    /**
     * Applies an assistant delta to its mutable snapshot, concatenating text and
     * merging nested objects and indexed array entries.
     */
    static accumulateDelta(acc, delta) {
        return (0, assistant_stream_delta_1.accumulateAssistantStreamDelta)(acc, delta);
    }
    _addRun(run) {
        tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'run', run);
        return run;
    }
    async _threadAssistantStream(params, thread, options) {
        return await this._createThreadAssistantStream(thread, params, options);
    }
    async _runAssistantStream(threadId, runs, params, options) {
        return await this._createAssistantStream(runs, threadId, params, options);
    }
    async _runToolAssistantStream(runId, runs, params, options) {
        return await this._createToolAssistantStream(runs, runId, params, options);
    }
}
exports.AssistantStream = AssistantStream;
_AssistantStream_addEvent = function _AssistantStream_addEvent(event) {
    if (this.ended) {
        return;
    }
    tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentEvent, event, "f");
    tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
    switch (event.event) {
        case 'thread.created': {
            //No action on this event.
            break;
        }
        case 'thread.run.created':
        case 'thread.run.queued':
        case 'thread.run.in_progress':
        case 'thread.run.requires_action':
        case 'thread.run.completed':
        case 'thread.run.incomplete':
        case 'thread.run.failed':
        case 'thread.run.cancelling':
        case 'thread.run.cancelled':
        case 'thread.run.expired': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
            break;
        }
        case 'thread.run.step.created':
        case 'thread.run.step.in_progress':
        case 'thread.run.step.delta':
        case 'thread.run.step.completed':
        case 'thread.run.step.failed':
        case 'thread.run.step.cancelled':
        case 'thread.run.step.expired': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
            break;
        }
        case 'thread.message.created':
        case 'thread.message.in_progress':
        case 'thread.message.delta':
        case 'thread.message.completed':
        case 'thread.message.incomplete': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
            break;
        }
        case 'error': {
            //This is included for completeness, but errors are processed in the SSE event processing so this should not occur
            throw new Error('Encountered an error event in event processing - errors should be processed earlier');
        }
        default: {
            assertNever(event);
        }
    }
}, _AssistantStream_endRequest = function _AssistantStream_endRequest() {
    if (this.ended) {
        throw new error_1.OpenAIError(`stream has ended, this shouldn't happen`);
    }
    if (!tslib_1.__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) {
        throw new Error('Final run has not been received');
    }
    return tslib_1.__classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage(event) {
    const [accumulatedMessage, newContent] = tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
    tslib_1.__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
    tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
    for (const content of newContent) {
        const snapshotContent = accumulatedMessage.content[content.index];
        if (snapshotContent?.type === 'text') {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'textCreated', snapshotContent.text);
        }
    }
    switch (event.event) {
        case 'thread.message.created': {
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContentIndex, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContent, undefined, "f");
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'messageCreated', event.data);
            break;
        }
        case 'thread.message.in_progress': {
            break;
        }
        case 'thread.message.delta': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'messageDelta', event.data.delta, accumulatedMessage);
            if (event.data.delta.content) {
                for (const content of event.data.delta.content) {
                    //If it is text delta, emit a text delta event
                    if (content.type === 'text' && content.text) {
                        const textDelta = content.text;
                        const snapshot = accumulatedMessage.content[content.index];
                        if (snapshot && snapshot.type === 'text') {
                            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'textDelta', textDelta, snapshot.text);
                        }
                        else {
                            throw new Error('The snapshot associated with this text delta is not text or missing');
                        }
                    }
                    if (content.index !== tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")) {
                        //See if we have in progress content
                        if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContent, "f")) {
                            switch (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").type) {
                                case 'text': {
                                    tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'textDone', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").text, tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                                    break;
                                }
                                case 'image_file': {
                                    tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'imageFileDone', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").image_file, tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                                    break;
                                }
                            }
                        }
                        tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContentIndex, content.index, "f");
                    }
                    tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
                }
            }
            break;
        }
        case 'thread.message.completed':
        case 'thread.message.incomplete': {
            //We emit the latest content we were working on on completion (including incomplete)
            if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f") !== undefined) {
                const currentContent = event.data.content[tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")];
                if (currentContent) {
                    switch (currentContent.type) {
                        case 'image_file': {
                            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'imageFileDone', currentContent.image_file, tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                            break;
                        }
                        case 'text': {
                            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'textDone', currentContent.text, tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                            break;
                        }
                    }
                }
            }
            if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f")) {
                tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'messageDone', event.data);
            }
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContentIndex, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentContent, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, undefined, "f");
        }
    }
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep(event) {
    const accumulatedRunStep = tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
    tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
    switch (event.event) {
        case 'thread.run.step.created': {
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCall, undefined, "f");
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'runStepCreated', event.data);
            break;
        }
        case 'thread.run.step.delta': {
            const delta = event.data.delta;
            if (delta.step_details &&
                delta.step_details.type === 'tool_calls' &&
                delta.step_details.tool_calls &&
                accumulatedRunStep.step_details.type === 'tool_calls') {
                for (const toolCall of delta.step_details.tool_calls) {
                    if (toolCall.index === tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCallIndex, "f")) {
                        tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'toolCallDelta', toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
                    }
                    else {
                        if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
                            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'toolCallDone', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
                        }
                        tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
                        tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
                        if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
                            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'toolCallCreated', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
                        }
                    }
                }
            }
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'runStepDelta', event.data.delta, accumulatedRunStep);
            break;
        }
        case 'thread.run.step.completed':
        case 'thread.run.step.failed':
        case 'thread.run.step.cancelled':
        case 'thread.run.step.expired': {
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, undefined, "f");
            const details = event.data.step_details;
            if (details.type === 'tool_calls' && tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
                tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'toolCallDone', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
            }
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'runStepDone', event.data, accumulatedRunStep);
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCall, undefined, "f");
            break;
        }
        case 'thread.run.step.in_progress': {
            break;
        }
    }
}, _AssistantStream_emitExposed = function _AssistantStream_emitExposed(event, ...args) {
    if (this._hasListeners(event)) {
        for (const value of args) {
            (0, assistant_stream_delta_1.markAssistantStreamValueExternallyMutable)(value);
        }
    }
    this._emit(event, ...args);
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent(event) {
    tslib_1.__classPrivateFieldGet(this, _AssistantStream_events, "f").push(event);
    tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'event', event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep(event) {
    switch (event.event) {
        case 'thread.run.step.created': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
            return event.data;
        }
        case 'thread.run.step.delta': {
            const snapshot = tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
            if (!snapshot) {
                throw new Error('Received a RunStepDelta before creation of a snapshot');
            }
            const data = event.data;
            if (data.delta) {
                const accumulated = (0, assistant_stream_delta_1.accumulateAssistantStreamDelta)(snapshot, data.delta, true);
                tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
            }
            return tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
        }
        case 'thread.run.step.completed':
        case 'thread.run.step.failed':
        case 'thread.run.step.cancelled':
        case 'thread.run.step.expired':
        case 'thread.run.step.in_progress': {
            tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
            break;
        }
    }
    if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id]) {
        return tslib_1.__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
    }
    throw new Error('No snapshot available');
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage(event, snapshot) {
    const newContent = [];
    switch (event.event) {
        case 'thread.message.created': {
            //On creation the snapshot is just the initial message
            return [event.data, newContent];
        }
        case 'thread.message.delta': {
            if (!snapshot) {
                throw new Error('Received a delta with no existing snapshot (there should be one from message creation)');
            }
            const data = event.data;
            //If this delta does not have content, nothing to process
            if (data.delta.content) {
                (0, assistant_stream_delta_1.assertSafeAssistantStreamDelta)(data.delta);
                const cacheArrays = !(0, assistant_stream_delta_1.isAssistantStreamValueExternallyMutable)(snapshot);
                const commitProjection = (0, assistant_stream_delta_1.createAssistantStreamArrayDeltaCommit)(snapshot.content, data.delta.content, 'content', cacheArrays);
                for (const contentElement of data.delta.content) {
                    if ((0, utils_1.hasOwn)(snapshot.content, contentElement.index)) {
                        const currentContent = snapshot.content[contentElement.index];
                        snapshot.content[contentElement.index] = tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent, cacheArrays);
                    }
                    else {
                        (0, assistant_stream_delta_1.defineAssistantStreamArrayEntry)(snapshot.content, contentElement.index, contentElement);
                        // This is a new element
                        newContent.push(contentElement);
                    }
                }
                commitProjection();
            }
            return [snapshot, newContent];
        }
        case 'thread.message.in_progress':
        case 'thread.message.completed':
        case 'thread.message.incomplete': {
            //No changes on other thread events
            if (snapshot) {
                return [snapshot, newContent];
            }
            throw new Error('Received thread message event with no existing snapshot');
        }
    }
    throw new Error('Tried to accumulate a non-message event');
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent(contentElement, currentContent, cacheArrays) {
    return (0, assistant_stream_delta_1.accumulateAssistantStreamDelta)(currentContent, contentElement, cacheArrays);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun(event) {
    tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentRunSnapshot, event.data, "f");
    switch (event.event) {
        case 'thread.run.created': {
            break;
        }
        case 'thread.run.queued': {
            break;
        }
        case 'thread.run.in_progress': {
            break;
        }
        case 'thread.run.requires_action':
        case 'thread.run.cancelled':
        case 'thread.run.failed':
        case 'thread.run.completed':
        case 'thread.run.expired':
        case 'thread.run.incomplete': {
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_finalRun, event.data, "f");
            if (tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
                tslib_1.__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_emitExposed).call(this, 'toolCallDone', tslib_1.__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
            }
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, undefined, "f");
            tslib_1.__classPrivateFieldSet(this, _AssistantStream_currentToolCall, undefined, "f");
            break;
        }
        case 'thread.run.cancelling': {
            break;
        }
    }
};
function assertNever(_x) {
    return _x;
}
//# sourceMappingURL=AssistantStream.js.map

/***/ }),

/***/ 2509:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatCompletionRunner = void 0;
const AbstractChatCompletionRunner_1 = __nccwpck_require__(2883);
const chatCompletionUtils_1 = __nccwpck_require__(1582);
/** Executes function tools and follows up with non-streaming chat completion requests. */
class ChatCompletionRunner extends AbstractChatCompletionRunner_1.AbstractChatCompletionRunner {
    /** Starts a non-streaming tool loop and returns its event-driven conversation runner. */
    static runTools(client, params, options) {
        const runner = new ChatCompletionRunner();
        const opts = {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'runTools' },
        };
        runner._run(() => runner._runTools(client, params, runner, opts));
        return runner;
    }
    /** Appends a conversation message and emits text content for assistant replies. */
    _addMessage(message, emit = true) {
        super._addMessage(message, emit);
        if ((0, chatCompletionUtils_1.isAssistantMessage)(message) && message.content) {
            this._emit('content', message.content);
        }
    }
}
exports.ChatCompletionRunner = ChatCompletionRunner;
//# sourceMappingURL=ChatCompletionRunner.js.map

/***/ }),

/***/ 3559:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _ChatCompletionStream_instances, _ChatCompletionStream_params, _ChatCompletionStream_audioDoneChoiceIndexes, _ChatCompletionStream_choiceEventStates, _ChatCompletionStream_currentChatCompletionSnapshot, _ChatCompletionStream_beginRequest, _ChatCompletionStream_getChoiceEventState, _ChatCompletionStream_addChunk, _ChatCompletionStream_emitToolCallDoneEvent, _ChatCompletionStream_emitContentDoneEvents, _ChatCompletionStream_endRequest, _ChatCompletionStream_accumulateChatCompletion;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatCompletionStream = void 0;
exports.makeChatCompletionReadableStreamMessageChunk = makeChatCompletionReadableStreamMessageChunk;
const tslib_1 = __nccwpck_require__(2345);
const parser_1 = __nccwpck_require__(6107);
const error_1 = __nccwpck_require__(3269);
const uuid_1 = __nccwpck_require__(660);
const values_1 = __nccwpck_require__(7325);
const parser_2 = __nccwpck_require__(1368);
const streaming_1 = __nccwpck_require__(1835);
const AbstractChatCompletionRunner_1 = __nccwpck_require__(2883);
// Keep message records readable as empty chunks by older SDKs. Their finalizer
// overwrites `object`, so the encoded payload does not leak into completions.
const CHAT_COMPLETION_READABLE_STREAM_MESSAGE_PREFIX = 'chat.completion.chunk.message:';
/** Encodes a tool-result message as a backwards-compatible, empty completion chunk. */
function makeChatCompletionReadableStreamMessageChunk(chunk, message, toolCallIds) {
    const payload = {
        type: 'message',
        message,
        ...(toolCallIds ? { tool_call_ids: toolCallIds } : {}),
    };
    return {
        id: chunk.id,
        choices: [],
        created: chunk.created,
        model: chunk.model,
        object: `${CHAT_COMPLETION_READABLE_STREAM_MESSAGE_PREFIX}${JSON.stringify(payload)}`,
    };
}
function isChatCompletionReadableStreamMessage(item) {
    return (('type' in item && item.type === 'message' && 'message' in item) ||
        ('object' in item &&
            typeof item.object === 'string' &&
            item.object.startsWith(CHAT_COMPLETION_READABLE_STREAM_MESSAGE_PREFIX)));
}
function getChatCompletionReadableStreamMessage(item) {
    if ('type' in item) {
        return item;
    }
    return JSON.parse(item.object.slice(CHAT_COMPLETION_READABLE_STREAM_MESSAGE_PREFIX.length));
}
// The Chat Completions schema limits n to 128. Replayed streams do not retain
// request parameters, so apply that choice limit independently and use the same
// conservative ceiling to prevent sparse tool-call arrays from growing unbounded.
const MAX_STREAM_CHOICES = 128;
const MAX_STREAM_TOOL_CALLS = 128;
function assignOwnProperties(target, source) {
    if (Object.prototype.propertyIsEnumerable.call(source, '__proto__') && !(0, values_1.hasOwn)(target, '__proto__')) {
        Object.defineProperty(target, '__proto__', {
            value: undefined,
            writable: true,
            enumerable: true,
            configurable: true,
        });
    }
    return Object.assign(target, source);
}
/** Streams chat completion chunks while accumulating snapshots, parsed output, and events. */
class ChatCompletionStream extends AbstractChatCompletionRunner_1.AbstractChatCompletionRunner {
    /** Creates an unstarted stream, retaining request parameters for structured-output parsing. */
    constructor(params) {
        super();
        _ChatCompletionStream_instances.add(this);
        _ChatCompletionStream_params.set(this, void 0);
        _ChatCompletionStream_audioDoneChoiceIndexes.set(this, void 0);
        _ChatCompletionStream_choiceEventStates.set(this, void 0);
        _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_params, params, "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_audioDoneChoiceIndexes, new Set(), "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
    }
    /** The latest accumulated completion, or `undefined` before a chunk arrives or after finalization. */
    get currentChatCompletionSnapshot() {
        return tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    }
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Original input messages are not included in the serialized stream. Tool-result
     * messages explicitly serialized by a streaming tool runner are replayed.
     */
    static fromReadableStream(stream) {
        const runner = new ChatCompletionStream(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    /** Starts a streaming chat completion request and returns its event-driven helper. */
    static createChatCompletion(client, params, options) {
        const runner = new ChatCompletionStream(params);
        runner._run(() => runner._runChatCompletion(client, { ...params, stream: true }, { ...options, __metadata: { ...options?.__metadata, helperMethod: 'stream' } }));
        return runner;
    }
    async _createChatCompletion(client, params, options) {
        this._listenForAbort(options?.signal);
        tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
        const stream = await client.chat.completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
        this._connected();
        for await (const chunk of stream) {
            tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return this._addChatCompletion(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
    }
    async _fromReadableStream(readableStream, options) {
        this._listenForAbort(options?.signal);
        tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
        this._connected();
        const stream = streaming_1.Stream.fromReadableStream(readableStream, this.controller);
        let chatId;
        for await (const item of stream) {
            if (isChatCompletionReadableStreamMessage(item)) {
                const message = getChatCompletionReadableStreamMessage(item);
                if (tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f")) {
                    const toolCalls = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f").choices[0]?.message.tool_calls;
                    for (const [index, id] of message.tool_call_ids?.entries() ?? []) {
                        const toolCall = toolCalls?.[index];
                        if (toolCall && id) {
                            toolCall.id = id;
                        }
                    }
                    this._addChatCompletion(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
                    chatId = undefined;
                }
                this._addMessage(message.message);
                continue;
            }
            const chunk = item;
            if (chatId && chunk.id && chatId !== chunk.id) {
                // A new request has been made.
                this._addChatCompletion(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
            }
            tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
            if (chunk.id) {
                chatId = chunk.id;
            }
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        if (tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f")) {
            return this._addChatCompletion(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
        }
        const lastChatCompletion = this._chatCompletions[this._chatCompletions.length - 1];
        if (lastChatCompletion) {
            return lastChatCompletion;
        }
        throw new error_1.OpenAIError(`request ended without sending any chunks`);
    }
    /** Iterates over raw API chunks; stopping iteration early aborts the underlying request. */
    [(_ChatCompletionStream_params = new WeakMap(), _ChatCompletionStream_audioDoneChoiceIndexes = new WeakMap(), _ChatCompletionStream_choiceEventStates = new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = new WeakMap(), _ChatCompletionStream_instances = new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest() {
        if (this.ended) {
            return;
        }
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_audioDoneChoiceIndexes, new Set(), "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, undefined, "f");
    }, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState(choice) {
        let state = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
        if (state) {
            return state;
        }
        state = {
            content_done: false,
            refusal_done: false,
            logprobs_content_done: false,
            logprobs_refusal_done: false,
            done_tool_calls: new Set(),
            current_tool_call_index: null,
        };
        tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
        return state;
    }, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk(chunk) {
        if (this.ended) {
            return;
        }
        const completion = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
        this._emit('chunk', chunk, completion);
        for (const choice of chunk.choices) {
            const choiceSnapshot = completion.choices[choice.index];
            const { delta } = choice;
            if (delta?.content != null &&
                choiceSnapshot.message?.role === 'assistant' &&
                choiceSnapshot.message?.content) {
                this._emit('content', delta.content, choiceSnapshot.message.content);
                this._emit('content.delta', {
                    delta: delta.content,
                    snapshot: choiceSnapshot.message.content,
                    parsed: choiceSnapshot.message.parsed,
                });
            }
            if (delta?.refusal != null &&
                choiceSnapshot.message?.role === 'assistant' &&
                choiceSnapshot.message?.refusal) {
                this._emit('refusal.delta', {
                    delta: delta.refusal,
                    snapshot: choiceSnapshot.message.refusal,
                });
            }
            if (choice.logprobs?.content != null && choiceSnapshot.message?.role === 'assistant') {
                this._emit('logprobs.content.delta', {
                    content: choice.logprobs?.content,
                    snapshot: choiceSnapshot.logprobs?.content ?? [],
                });
            }
            if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === 'assistant') {
                this._emit('logprobs.refusal.delta', {
                    refusal: choice.logprobs?.refusal,
                    snapshot: choiceSnapshot.logprobs?.refusal ?? [],
                });
            }
            const state = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
            if (choiceSnapshot.finish_reason) {
                tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
                if (state.current_tool_call_index != null) {
                    tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
                }
            }
            for (const toolCall of delta?.tool_calls ?? []) {
                if (state.current_tool_call_index !== toolCall.index) {
                    tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
                    // new tool call started, the previous one is done
                    if (state.current_tool_call_index != null) {
                        tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
                    }
                }
                state.current_tool_call_index = toolCall.index;
            }
            for (const toolCallDelta of delta?.tool_calls ?? []) {
                const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
                if (!toolCallSnapshot?.type) {
                    continue;
                }
                if (toolCallSnapshot.type === 'function') {
                    this._emit('tool_calls.function.arguments.delta', {
                        name: toolCallSnapshot.function.name,
                        index: toolCallDelta.index,
                        arguments: toolCallSnapshot.function.arguments,
                        parsed_arguments: toolCallSnapshot.function.parsed_arguments,
                        arguments_delta: toolCallDelta.function?.arguments ?? '',
                    });
                }
                else if (toolCallSnapshot.type !== 'custom') {
                    assertNever(toolCallSnapshot);
                }
            }
        }
    }, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent(choiceSnapshot, toolCallIndex) {
        const state = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
        if (state.done_tool_calls.has(toolCallIndex)) {
            // we've already fired the done event
            return;
        }
        const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
        if (!toolCallSnapshot) {
            throw new Error('no tool call snapshot');
        }
        if (!toolCallSnapshot.type) {
            throw new Error('tool call snapshot missing `type`');
        }
        if (toolCallSnapshot.type === 'function') {
            const inputTool = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => (0, parser_2.isChatCompletionFunctionTool)(tool) && tool.function.name === toolCallSnapshot.function.name); // TS doesn't narrow based on isChatCompletionTool
            let parsedArguments = null;
            if ((0, parser_2.isAutoParsableTool)(inputTool)) {
                parsedArguments = inputTool.$parseRaw(toolCallSnapshot.function.arguments);
            }
            else if (inputTool?.function.strict) {
                parsedArguments = JSON.parse(toolCallSnapshot.function.arguments);
            }
            this._emit('tool_calls.function.arguments.done', {
                name: toolCallSnapshot.function.name,
                index: toolCallIndex,
                arguments: toolCallSnapshot.function.arguments,
                parsed_arguments: parsedArguments,
            });
        }
        else if (toolCallSnapshot.type !== 'custom') {
            assertNever(toolCallSnapshot);
        }
    }, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents(choiceSnapshot) {
        const state = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
        if (choiceSnapshot.message.content != null &&
            (choiceSnapshot.message.content !== '' ||
                (!choiceSnapshot.message.refusal &&
                    !choiceSnapshot.message.tool_calls?.length &&
                    !choiceSnapshot.message.function_call)) &&
            !state.content_done) {
            state.content_done = true;
            this._emit('content.done', {
                content: choiceSnapshot.message.content,
                parsed: choiceSnapshot.message.refusal
                    ? null
                    : (0, parser_2.parseResponseFormatContent)(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format, choiceSnapshot.message.content),
            });
        }
        if (choiceSnapshot.message.refusal && !state.refusal_done) {
            state.refusal_done = true;
            this._emit('refusal.done', { refusal: choiceSnapshot.message.refusal });
        }
        if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
            state.logprobs_content_done = true;
            this._emit('logprobs.content.done', { content: choiceSnapshot.logprobs.content });
        }
        if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
            state.logprobs_refusal_done = true;
            this._emit('logprobs.refusal.done', { refusal: choiceSnapshot.logprobs.refusal });
        }
    }, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest() {
        if (this.ended) {
            throw new error_1.OpenAIError(`stream has ended, this shouldn't happen`);
        }
        const snapshot = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
        if (!snapshot) {
            throw new error_1.OpenAIError(`request ended without sending any chunks`);
        }
        const audioDoneChoiceIndexes = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_audioDoneChoiceIndexes, "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_audioDoneChoiceIndexes, new Set(), "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, undefined, "f");
        tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
        return finalizeChatCompletion(snapshot, tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), audioDoneChoiceIndexes);
    }, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion(chunk) {
        var _a, _b, _c, _d, _e;
        let snapshot = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
        const { choices, ...rest } = chunk;
        if (!snapshot) {
            const newSnapshot = {
                ...rest,
                choices: [],
            };
            tslib_1.__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, newSnapshot, "f");
            snapshot = newSnapshot;
        }
        else if (chunk.id) {
            assignOwnProperties(snapshot, rest);
        }
        const requestedChoiceCount = tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.n;
        const maxChoices = typeof requestedChoiceCount === 'number' &&
            Number.isSafeInteger(requestedChoiceCount) &&
            requestedChoiceCount > 0
            ? Math.min(requestedChoiceCount, MAX_STREAM_CHOICES)
            : MAX_STREAM_CHOICES;
        for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
            if (!Number.isSafeInteger(index) || index < 0 || index >= maxChoices) {
                throw new error_1.OpenAIError(`Chat completion stream contains an invalid choice index: ${index}`);
            }
            let choice = snapshot.choices[index];
            if (!choice) {
                const newChoice = { finish_reason, index, message: {}, logprobs, ...other };
                snapshot.choices[index] = newChoice;
                choice = newChoice;
            }
            if (logprobs) {
                if (choice.logprobs) {
                    const { content, refusal, ...rest } = logprobs;
                    assertIsEmpty(rest);
                    assignOwnProperties(choice.logprobs, rest);
                    if (content) {
                        (_a = choice.logprobs).content ?? (_a.content = []);
                        choice.logprobs.content.push(...content);
                    }
                    if (refusal) {
                        (_b = choice.logprobs).refusal ?? (_b.refusal = []);
                        choice.logprobs.refusal.push(...refusal);
                    }
                }
                else {
                    choice.logprobs = { ...logprobs };
                }
            }
            if (finish_reason) {
                choice.finish_reason = finish_reason;
                if (tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f") && (0, parser_2.hasAutoParseableInput)(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"))) {
                    if (finish_reason === 'length') {
                        throw new error_1.LengthFinishReasonError();
                    }
                    if (finish_reason === 'content_filter') {
                        throw new error_1.ContentFilterFinishReasonError();
                    }
                }
            }
            assignOwnProperties(choice, other);
            if (!delta) {
                continue;
            } // Shouldn't happen; just in case.
            tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_audioDoneChoiceIndexes, "f").delete(index);
            const { audio, content, refusal, function_call, role, tool_calls, ...rest } = delta;
            assertIsEmpty(rest);
            assignOwnProperties(choice.message, rest);
            if (audio?.expires_at != null &&
                audio.id == null &&
                audio.data == null &&
                audio.transcript == null &&
                content == null &&
                refusal == null &&
                function_call == null &&
                role == null &&
                tool_calls == null &&
                Object.keys(rest).length === 0) {
                tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_audioDoneChoiceIndexes, "f").add(index);
            }
            if (refusal) {
                choice.message.refusal = (choice.message.refusal || '') + refusal;
            }
            if (role) {
                choice.message.role = role;
            }
            if (audio) {
                const audioSnapshot = ((_c = choice.message).audio ?? (_c.audio = {}));
                if (audio.id != null) {
                    audioSnapshot.id = audio.id;
                }
                if (audio.data != null) {
                    audioSnapshot.data = (audioSnapshot.data ?? '') + audio.data;
                }
                if (audio.transcript != null) {
                    audioSnapshot.transcript = (audioSnapshot.transcript ?? '') + audio.transcript;
                }
                if (audio.expires_at != null) {
                    audioSnapshot.expires_at = audio.expires_at;
                }
            }
            if (function_call) {
                if (choice.message.function_call) {
                    if (function_call.name) {
                        choice.message.function_call.name = function_call.name;
                    }
                    if (function_call.arguments) {
                        (_d = choice.message.function_call).arguments ?? (_d.arguments = '');
                        choice.message.function_call.arguments += function_call.arguments;
                    }
                }
                else {
                    choice.message.function_call = function_call;
                }
            }
            if (content != null) {
                choice.message.content = (choice.message.content || '') + content;
                if (!choice.message.refusal && (0, parser_2.isParseableResponseFormat)(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format)) {
                    // The partial parser does not accept whitespace-only input.
                    choice.message.parsed = choice.message.content.trim() ? (0, parser_1.partialParse)(choice.message.content) : null;
                }
            }
            if (tool_calls) {
                // Tool calls are built up across chunks, so while the stream is in progress the
                // entries are only partially filled in; they match `ChatCompletionSnapshot.Choice.Message.ToolCall`
                // once every delta for them has been accumulated.
                const toolCallSnapshots = ((_e = choice.message).tool_calls ?? (_e.tool_calls = []));
                for (const { index, id, type, function: fn, custom, ...rest } of tool_calls) {
                    if (!Number.isSafeInteger(index) || index < 0 || index >= MAX_STREAM_TOOL_CALLS) {
                        throw new error_1.OpenAIError(`Chat completion stream contains an invalid tool call index: ${index}`);
                    }
                    const tool_call = (toolCallSnapshots[index] ?? (toolCallSnapshots[index] = {}));
                    assignOwnProperties(tool_call, rest);
                    if (id) {
                        tool_call.id = id;
                    }
                    if (type) {
                        tool_call.type = type;
                    }
                    if (custom) {
                        const customSnapshot = (tool_call.custom ?? (tool_call.custom = { name: custom.name ?? '', input: '' }));
                        if (custom.name) {
                            customSnapshot.name = custom.name;
                        }
                        if (custom.input) {
                            customSnapshot.input += custom.input;
                        }
                    }
                    if (fn) {
                        const functionSnapshot = (tool_call.function ?? (tool_call.function = { name: fn.name ?? '', arguments: '' }));
                        if (fn.name) {
                            functionSnapshot.name = fn.name;
                        }
                        if (fn.arguments) {
                            functionSnapshot.arguments += fn.arguments;
                            if ((0, parser_2.shouldParseToolCall)(tslib_1.__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), tool_call)) {
                                functionSnapshot.parsed_arguments = (0, parser_1.partialParse)(functionSnapshot.arguments);
                            }
                        }
                    }
                }
            }
        }
        return snapshot;
    }, Symbol.asyncIterator)]() {
        return this._createIterator((push) => {
            const onChunk = (chunk) => push(chunk);
            this.on('chunk', onChunk);
            return () => this.off('chunk', onChunk);
        }, { onReturn: () => this.abort() });
    }
    /** Serializes raw completion chunks into a readable stream for transfer to another runtime. */
    toReadableStream() {
        const stream = new streaming_1.Stream(this[Symbol.asyncIterator].bind(this), this.controller);
        return stream.toReadableStream();
    }
}
exports.ChatCompletionStream = ChatCompletionStream;
function finalizeChatCompletion(snapshot, params, audioDoneChoiceIndexes) {
    const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
    const completion = {
        ...rest,
        id,
        choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
            const { content = null, function_call, tool_calls, audio, ...messageRest } = message;
            // Audio streams can end with an expires_at-only chunk after the
            // generated audio, without a separate finish_reason.
            const finishReason = finish_reason ?? (audioDoneChoiceIndexes.has(index) && isCompleteAudio(audio) ? 'stop' : null);
            if (!finishReason) {
                throw new error_1.OpenAIError(`missing finish_reason for choice ${index}`);
            }
            const audioResponse = audio ? { audio: audio } : {};
            const role = message.role; // this is what we expect; in theory it could be different which would make our types a slight lie but would be fine.
            if (!role) {
                throw new error_1.OpenAIError(`missing role for choice ${index}`);
            }
            if (function_call) {
                const { arguments: args, name } = function_call;
                if (args == null) {
                    throw new error_1.OpenAIError(`missing function_call.arguments for choice ${index}`);
                }
                if (!name) {
                    throw new error_1.OpenAIError(`missing function_call.name for choice ${index}`);
                }
                return {
                    ...choiceRest,
                    message: {
                        ...audioResponse,
                        content,
                        function_call: { arguments: args, name },
                        role,
                        refusal: message.refusal ?? null,
                    },
                    finish_reason: finishReason,
                    index,
                    logprobs,
                };
            }
            if (tool_calls) {
                return {
                    ...choiceRest,
                    index,
                    finish_reason: finishReason,
                    logprobs,
                    message: {
                        ...messageRest,
                        ...audioResponse,
                        role,
                        content,
                        refusal: message.refusal ?? null,
                        tool_calls: tool_calls.map((tool_call, i) => {
                            if (tool_call.type == null) {
                                throw new error_1.OpenAIError(`missing choices[${index}].tool_calls[${i}].type\n${str(snapshot)}`);
                            }
                            if (tool_call.type === 'custom') {
                                const { custom, type, id, ...toolRest } = tool_call;
                                const { input = '', name, ...customRest } = custom || {};
                                if (name == null) {
                                    throw new error_1.OpenAIError(`missing choices[${index}].tool_calls[${i}].custom.name\n${str(snapshot)}`);
                                }
                                return {
                                    ...toolRest,
                                    id: id || `call_${(0, uuid_1.uuid4)()}`,
                                    type,
                                    custom: { ...customRest, name, input },
                                };
                            }
                            const { function: fn, type, id, ...toolRest } = tool_call;
                            const { arguments: args, name, ...fnRest } = fn || {};
                            if (name == null) {
                                throw new error_1.OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name\n${str(snapshot)}`);
                            }
                            if (args == null) {
                                throw new error_1.OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments\n${str(snapshot)}`);
                            }
                            return {
                                ...toolRest,
                                id: id || `call_${(0, uuid_1.uuid4)()}`,
                                type,
                                function: { ...fnRest, name, arguments: args },
                            };
                        }),
                    },
                };
            }
            return {
                ...choiceRest,
                message: { ...messageRest, ...audioResponse, content, role, refusal: message.refusal ?? null },
                finish_reason: finishReason,
                index,
                logprobs,
            };
        }),
        created,
        model,
        object: 'chat.completion',
        ...(system_fingerprint ? { system_fingerprint } : {}),
    };
    return (0, parser_2.maybeParseChatCompletion)(completion, params);
}
function isCompleteAudio(audio) {
    return audio?.id != null && audio.data != null && audio.transcript != null && audio.expires_at != null;
}
function str(x) {
    return JSON.stringify(x);
}
/**
 * Ensures the given argument is an empty object, useful for
 * asserting that all known properties on an object have been
 * destructured.
 */
function assertIsEmpty(obj) {
    void obj;
}
function assertNever(_x) {
    return _x;
}
//# sourceMappingURL=ChatCompletionStream.js.map

/***/ }),

/***/ 997:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatCompletionStreamingRunner = void 0;
const ChatCompletionStream_1 = __nccwpck_require__(3559);
const error_1 = __nccwpck_require__(3269);
const streaming_1 = __nccwpck_require__(1835);
const chatCompletionUtils_1 = __nccwpck_require__(1582);
/** Executes function tools while streaming every intermediate chat completion. */
class ChatCompletionStreamingRunner extends ChatCompletionStream_1.ChatCompletionStream {
    /** Restores a serialized tool run, including intermediate completions and tool-result messages. */
    static fromReadableStream(stream) {
        const runner = new ChatCompletionStreamingRunner(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    /** Serializes completion chunks and tool-result messages for replay in another runtime. */
    toReadableStream() {
        let lastChunk;
        let toolCallIds;
        const iterator = this._createIterator((push) => {
            const onChunk = (chunk) => {
                lastChunk = chunk;
                push(chunk);
            };
            const onMessage = (message) => {
                if ((0, chatCompletionUtils_1.isAssistantMessage)(message)) {
                    toolCallIds = message.tool_calls?.map((toolCall) => toolCall.id);
                    return;
                }
                if ((0, chatCompletionUtils_1.isToolMessage)(message)) {
                    if (!lastChunk) {
                        throw new error_1.OpenAIError('cannot serialize a tool message before receiving any chunks');
                    }
                    push((0, ChatCompletionStream_1.makeChatCompletionReadableStreamMessageChunk)(lastChunk, message, toolCallIds));
                }
            };
            this.on('chunk', onChunk);
            this.on('message', onMessage);
            return () => {
                this.off('chunk', onChunk);
                this.off('message', onMessage);
            };
        }, { onReturn: () => this.abort() });
        const stream = new streaming_1.Stream(() => iterator, this.controller);
        return stream.toReadableStream();
    }
    /** Starts a streaming tool loop and returns its event-driven conversation runner. */
    static runTools(client, params, options) {
        const runner = new ChatCompletionStreamingRunner(
        // @ts-expect-error TODO these types are incompatible
        params);
        const opts = {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'runTools' },
        };
        runner._run(() => runner._runTools(client, params, runner, opts));
        return runner;
    }
}
exports.ChatCompletionStreamingRunner = ChatCompletionStreamingRunner;
//# sourceMappingURL=ChatCompletionStreamingRunner.js.map

/***/ }),

/***/ 4283:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _EventStream_instances, _EventStream_connectedPromise, _EventStream_resolveConnectedPromise, _EventStream_rejectConnectedPromise, _EventStream_endPromise, _EventStream_resolveEndPromise, _EventStream_rejectEndPromise, _EventStream_listeners, _EventStream_abortListeners, _EventStream_ended, _EventStream_errored, _EventStream_aborted, _EventStream_catchingPromiseCreated, _EventStream_removeAbortListeners, _EventStream_handleError;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EventStream = void 0;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(3269);
function createEventQueue() {
    let entries = [];
    let head = 0;
    return {
        get length() {
            return entries.length - head;
        },
        enqueue(value) {
            entries.push(value);
        },
        dequeue() {
            if (head === entries.length) {
                return undefined;
            }
            const value = entries[head];
            entries[head] = undefined;
            head += 1;
            if (head === entries.length) {
                entries = [];
                head = 0;
            }
            else if (head >= 1024 && head * 2 >= entries.length) {
                entries = entries.slice(head);
                head = 0;
            }
            return value;
        },
        clear() {
            entries = [];
            head = 0;
        },
    };
}
/** An abortable event stream with typed listeners, asynchronous iteration, and lifecycle state. */
class EventStream {
    /** Creates an unstarted stream with independent connection and completion lifecycle promises. */
    constructor() {
        _EventStream_instances.add(this);
        /** Controls the underlying request; aborting this controller cancels the stream. */
        this.controller = new AbortController();
        _EventStream_connectedPromise.set(this, void 0);
        // oxlint-disable class-methods-use-this -- Deferred promise resolvers are intentionally per-instance mutable callbacks.
        _EventStream_resolveConnectedPromise.set(this, () => undefined);
        _EventStream_rejectConnectedPromise.set(this, () => undefined);
        _EventStream_endPromise.set(this, void 0);
        _EventStream_resolveEndPromise.set(this, () => undefined);
        _EventStream_rejectEndPromise.set(this, () => undefined);
        // oxlint-enable class-methods-use-this
        _EventStream_listeners.set(this, Object.create(null));
        _EventStream_abortListeners.set(this, []);
        _EventStream_ended.set(this, false);
        _EventStream_errored.set(this, false);
        _EventStream_aborted.set(this, false);
        _EventStream_catchingPromiseCreated.set(this, false);
        tslib_1.__classPrivateFieldSet(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
            tslib_1.__classPrivateFieldSet(this, _EventStream_resolveConnectedPromise, resolve, "f");
            tslib_1.__classPrivateFieldSet(this, _EventStream_rejectConnectedPromise, reject, "f");
        }), "f");
        tslib_1.__classPrivateFieldSet(this, _EventStream_endPromise, new Promise((resolve, reject) => {
            tslib_1.__classPrivateFieldSet(this, _EventStream_resolveEndPromise, resolve, "f");
            tslib_1.__classPrivateFieldSet(this, _EventStream_rejectEndPromise, reject, "f");
        }), "f");
        // Don't let these promises cause unhandled rejection errors.
        // we will manually cause an unhandled rejection error later
        // if the user hasn't registered any error listener or called
        // any promise-returning method.
        tslib_1.__classPrivateFieldGet(this, _EventStream_connectedPromise, "f").catch(() => undefined);
        tslib_1.__classPrivateFieldGet(this, _EventStream_endPromise, "f").catch(() => undefined);
    }
    _run(executor) {
        // Unfortunately if we call `executor()` immediately we get runtime errors about
        // references to `this` before the `super()` constructor call returns.
        setTimeout(() => {
            let failed = false;
            Promise.resolve()
                .then(executor)
                .catch((error) => {
                failed = true;
                tslib_1.__classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).call(this, error);
            })
                .then(() => {
                if (failed) {
                    return;
                }
                try {
                    this._emitFinal();
                }
                catch (error) {
                    tslib_1.__classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).call(this, error);
                    return;
                }
                this._emit('end');
            });
        }, 0);
    }
    _connected() {
        if (this.ended) {
            return;
        }
        tslib_1.__classPrivateFieldGet(this, _EventStream_resolveConnectedPromise, "f").call(this);
        this._emit('connect');
    }
    /** Whether the stream has finished successfully, failed, or been aborted. */
    get ended() {
        return tslib_1.__classPrivateFieldGet(this, _EventStream_ended, "f");
    }
    /** Whether an error or user cancellation has been observed. */
    get errored() {
        return tslib_1.__classPrivateFieldGet(this, _EventStream_errored, "f");
    }
    /** Whether the stream ended because its request was cancelled. */
    get aborted() {
        return tslib_1.__classPrivateFieldGet(this, _EventStream_aborted, "f");
    }
    /**
     * Cancels the underlying request; {@link done} and {@link events} observe cancellation.
     * Promises returned by {@link emitted} for other events may remain pending.
     */
    abort() {
        this.controller.abort();
    }
    _listenForAbort(signal) {
        if (!signal || this.ended) {
            return;
        }
        if (signal.aborted) {
            this.controller.abort();
            return;
        }
        const listener = () => this.controller.abort();
        signal.addEventListener('abort', listener, { once: true });
        tslib_1.__classPrivateFieldGet(this, _EventStream_abortListeners, "f").push({ signal, listener });
    }
    /**
     * Adds the listener function to the end of the listeners array for the event.
     * No checks are made to see if the listener has already been added. Multiple calls passing
     * the same combination of event and listener will result in the listener being added, and
     * called, multiple times.
     * @returns This stream, so that listener registration calls can be chained.
     */
    on(event, listener) {
        var _a;
        const listeners = ((_a = tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f"))[event] || (_a[event] = []));
        listeners.push({ listener });
        return this;
    }
    /**
     * Removes the specified listener from the listener array for the event.
     * off() will remove, at most, one instance of a listener from the listener array. If any single
     * listener has been added multiple times to the listener array for the specified event, then
     * off() must be called multiple times to remove each instance.
     * @returns This stream, so that listener registration calls can be chained.
     */
    off(event, listener) {
        const listeners = tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
        if (!listeners) {
            return this;
        }
        const index = listeners.findIndex((l) => l.listener === listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        return this;
    }
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns This stream, so that listener registration calls can be chained.
     */
    once(event, listener) {
        var _a;
        const listeners = ((_a = tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f"))[event] || (_a[event] = []));
        listeners.push({ listener, once: true });
        return this;
    }
    /**
     * This is similar to `.once()`, but returns a Promise that resolves the next time
     * the event is triggered, instead of calling a listener callback.
     * Events without arguments resolve to `undefined`, single-argument events resolve
     * to that argument, and events with multiple arguments resolve to an argument tuple.
     *
     * @returns A promise for the next event, or a rejection if an error occurs first.
     * Requesting the `error` event resolves with the emitted error instead.
     *
     * Example:
     *
     *   const message = await stream.emitted('message') // rejects if the stream errors
     */
    emitted(event) {
        return new Promise((resolve, reject) => {
            tslib_1.__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
            const onError = (error) => {
                this.off(event, onEvent);
                reject(error);
            };
            const onEvent = (...values) => {
                if (event !== 'error') {
                    this.off('error', onError);
                }
                resolve((values.length > 1 ? values : values[0]));
            };
            if (event !== 'error') {
                this.once('error', onError);
            }
            this.once(event, onEvent);
        });
    }
    /**
     * Returns an async iterator that yields every time the event is triggered.
     * The iterator ends when the stream ends and rejects if the stream errors
     * or is aborted. If you request the 'error' or 'abort' event, the iterator
     * yields that event instead of rejecting.
     *
     * Example:
     *
     *   for await (const [message] of stream.events('message')) {
     *     await processMessage(message);
     *   }
     */
    events(event) {
        return this._createIterator((push) => {
            const onEvent = (...args) => push(args);
            this.on(event, onEvent);
            return () => this.off(event, onEvent);
        }, {
            // When iterating the 'error' or 'abort' event itself, yield it as a
            // value instead of rejecting the iterator.
            rejectOnError: event !== 'error',
            rejectOnAbort: event !== 'abort',
        });
    }
    /**
     * Shared buffered async-iterator adapter over this stream's events.
     *
     * `attach` registers the producer listener(s) with the given `push` and
     * returns a cleanup function that removes them. Termination is handled
     * here: the iterator ends when the stream ends, listeners are removed on
     * end/return, and a terminal error is retained until buffered values have
     * drained so it is surfaced even when no reader was waiting when it fired.
     */
    _createIterator(attach, { rejectOnError = true, rejectOnAbort = true, onReturn, } = {}) {
        const pushQueue = createEventQueue();
        const readQueue = createEventQueue();
        let ended = this.ended;
        let failure;
        let failureDelivered = false;
        let detach = () => undefined;
        const doneResult = () => ({ value: undefined, done: true });
        const finishReaders = () => {
            while (readQueue.length) {
                readQueue.dequeue().resolve(doneResult());
            }
        };
        const rejectReader = () => {
            if (!failure || failureDelivered || !readQueue.length) {
                return;
            }
            failureDelivered = true;
            readQueue.dequeue().reject(failure);
        };
        const cleanup = () => {
            detach();
            this.off('end', onEnd);
            if (rejectOnError) {
                this.off('error', onFailure);
            }
            if (rejectOnAbort) {
                this.off('abort', onFailure);
            }
        };
        const push = (value) => {
            if (ended) {
                return;
            }
            const reader = readQueue.dequeue();
            if (reader) {
                reader.resolve({ value, done: false });
            }
            else {
                pushQueue.enqueue(value);
            }
        };
        const onFailure = (error) => {
            failure = error;
            if (!pushQueue.length) {
                rejectReader();
            }
        };
        const onEnd = () => {
            ended = true;
            cleanup();
            if (!pushQueue.length) {
                rejectReader();
                finishReaders();
            }
        };
        if (!ended) {
            detach = attach(push);
            this.on('end', onEnd);
            if (rejectOnError) {
                this.on('error', onFailure);
            }
            if (rejectOnAbort) {
                this.on('abort', onFailure);
            }
        }
        return {
            next: () => {
                if (pushQueue.length) {
                    return Promise.resolve({ value: pushQueue.dequeue(), done: false });
                }
                if (failure && !failureDelivered) {
                    failureDelivered = true;
                    return Promise.reject(failure);
                }
                if (ended) {
                    return Promise.resolve(doneResult());
                }
                return new Promise((resolve, reject) => {
                    readQueue.enqueue({ resolve, reject });
                });
            },
            return: () => {
                ended = true;
                pushQueue.clear();
                cleanup();
                finishReaders();
                if (onReturn) {
                    // The consumer explicitly ended iteration, so any failure the
                    // onReturn callback triggers (e.g. aborting the stream) is
                    // self-inflicted; mark the stream's terminal promise as handled so
                    // it does not surface as an unhandled rejection.
                    void this.done().catch(() => undefined);
                    onReturn();
                }
                return Promise.resolve(doneResult());
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
    /** Resolves when the stream ends successfully or rejects when it fails or is aborted. */
    async done() {
        tslib_1.__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
        await tslib_1.__classPrivateFieldGet(this, _EventStream_endPromise, "f");
    }
    /** Returns whether an event currently has one or more registered listeners. */
    _hasListeners(event) {
        return Boolean(tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f")[event]?.length);
    }
    /** Dispatches a stream event and performs the associated lifecycle transitions. */
    _emit(event, ...args) {
        // make sure we don't emit any events after end
        if (tslib_1.__classPrivateFieldGet(this, _EventStream_ended, "f")) {
            return;
        }
        if (event === 'end') {
            tslib_1.__classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_removeAbortListeners).call(this);
            tslib_1.__classPrivateFieldSet(this, _EventStream_ended, true, "f");
            tslib_1.__classPrivateFieldGet(this, _EventStream_resolveEndPromise, "f").call(this);
        }
        const listeners = tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
        if (listeners) {
            tslib_1.__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
            for (const { listener } of listeners) {
                listener(...args);
            }
        }
        if (event === 'abort') {
            const error = args[0];
            if (!tslib_1.__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
                Promise.reject(error);
            }
            tslib_1.__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
            tslib_1.__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
            return;
        }
        if (event === 'error') {
            // NOTE: _emit('error', error) should only be called from #handleError().
            const error = args[0];
            if (!tslib_1.__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
                // Trigger an unhandled rejection if the user hasn't registered any error handlers.
                // If you are seeing stack traces here, make sure to handle errors via either:
                // - runner.on('error', () => ...)
                // - await runner.done()
                // - await runner.finalChatCompletion()
                // - etc.
                Promise.reject(error);
            }
            tslib_1.__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
            tslib_1.__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
        }
    }
    // oxlint-disable-next-line class-methods-use-this -- Subclasses override this instance hook.
    _emitFinal() {
        // Hook for subclasses.
    }
}
exports.EventStream = EventStream;
_EventStream_connectedPromise = new WeakMap(), _EventStream_resolveConnectedPromise = new WeakMap(), _EventStream_rejectConnectedPromise = new WeakMap(), _EventStream_endPromise = new WeakMap(), _EventStream_resolveEndPromise = new WeakMap(), _EventStream_rejectEndPromise = new WeakMap(), _EventStream_listeners = new WeakMap(), _EventStream_abortListeners = new WeakMap(), _EventStream_ended = new WeakMap(), _EventStream_errored = new WeakMap(), _EventStream_aborted = new WeakMap(), _EventStream_catchingPromiseCreated = new WeakMap(), _EventStream_instances = new WeakSet(), _EventStream_removeAbortListeners = function _EventStream_removeAbortListeners() {
    for (const { signal, listener } of tslib_1.__classPrivateFieldGet(this, _EventStream_abortListeners, "f").splice(0)) {
        signal.removeEventListener('abort', listener);
    }
}, _EventStream_handleError = function _EventStream_handleError(error) {
    tslib_1.__classPrivateFieldSet(this, _EventStream_errored, true, "f");
    if (error instanceof Error && error.name === 'AbortError') {
        error = new error_1.APIUserAbortError();
    }
    if (error instanceof error_1.APIUserAbortError) {
        tslib_1.__classPrivateFieldSet(this, _EventStream_aborted, true, "f");
        return this._emit('abort', error);
    }
    if (error instanceof error_1.OpenAIError) {
        return this._emit('error', error);
    }
    if (error instanceof Error) {
        const openAIError = new error_1.OpenAIError(error.message);
        // @ts-ignore
        openAIError.cause = error;
        return this._emit('error', openAIError);
    }
    return this._emit('error', new error_1.OpenAIError(String(error)));
};
//# sourceMappingURL=EventStream.js.map

/***/ }),

/***/ 3980:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.maybeParseResponse = maybeParseResponse;
exports.parseResponse = parseResponse;
exports.hasAutoParseableInput = hasAutoParseableInput;
exports.makeParseableResponseTool = makeParseableResponseTool;
exports.isAutoParsableTool = isAutoParsableTool;
exports.shouldParseToolCall = shouldParseToolCall;
exports.validateInputTools = validateInputTools;
exports.addOutputText = addOutputText;
const error_1 = __nccwpck_require__(3269);
const parser_1 = __nccwpck_require__(1368);
/**
 * Adds parsed-output fields to a response, invoking parsers only when its request
 * includes an auto-parseable text format or strict function tool.
 */
function maybeParseResponse(response, params) {
    if (!params || !hasAutoParseableInput(params)) {
        const parsed = {
            ...response,
            output_parsed: null,
            output: response.output.map((item) => {
                if (item.type === 'function_call') {
                    return {
                        ...item,
                        parsed_arguments: null,
                    };
                }
                if (item.type === 'message') {
                    return {
                        ...item,
                        content: item.content.map((content) => ({
                            ...content,
                            parsed: null,
                        })),
                    };
                }
                return item;
            }),
        };
        if (needsOutputText(response, parsed)) {
            addOutputText(parsed);
        }
        return parsed;
    }
    return parseResponse(response, params);
}
/**
 * Parses completed response text and strict function-tool arguments.
 *
 * Incomplete or nonterminal responses keep their parsed values as `null`, and
 * `output_parsed` returns the first successfully parsed output-text item.
 */
function parseResponse(response, params) {
    const shouldParse = !response.status || response.status === 'completed';
    const output = response.output.map((item) => {
        if (item.type === 'function_call') {
            return shouldParse ? parseToolCall(params, item) : { ...item, parsed_arguments: null };
        }
        if (item.type === 'message') {
            const content = item.content.map((content) => {
                if (content.type === 'output_text') {
                    return {
                        ...content,
                        parsed: shouldParse ? parseTextFormat(params, content.text) : null,
                    };
                }
                return content;
            });
            return {
                ...item,
                content,
            };
        }
        return item;
    });
    const parsed = { ...response, output };
    if (needsOutputText(response, parsed)) {
        addOutputText(parsed);
    }
    Object.defineProperty(parsed, 'output_parsed', {
        enumerable: true,
        get() {
            for (const output of parsed.output) {
                if (output.type !== 'message') {
                    continue;
                }
                for (const content of output.content) {
                    if (content.type === 'output_text' && content.parsed !== null) {
                        return content.parsed;
                    }
                }
            }
            return null;
        },
    });
    return parsed;
}
function parseTextFormat(params, content) {
    return (0, parser_1.parseResponseFormatContent)(params.text?.format, content);
}
/** Returns whether the request includes an auto-parseable text format or strict function tool. */
function hasAutoParseableInput(params) {
    if ((0, parser_1.isParseableResponseFormat)(params.text?.format)) {
        return true;
    }
    return (Array.isArray(params.tools) &&
        params.tools.some((tool) => isAutoParsableTool(tool) || (tool.type === 'function' && tool.strict === true)));
}
/** Copies a Responses API function tool and attaches non-enumerable parser and callback metadata. */
function makeParseableResponseTool(tool, { parser, callback, }) {
    const obj = { ...tool };
    Object.defineProperties(obj, {
        $brand: {
            value: 'auto-parseable-tool',
            enumerable: false,
        },
        $parseRaw: {
            value: parser,
            enumerable: false,
        },
        $callback: {
            value: callback,
            enumerable: false,
        },
    });
    return obj;
}
/** Returns whether a Responses API tool carries the SDK's argument-parser marker. */
function isAutoParsableTool(tool) {
    return tool?.['$brand'] === 'auto-parseable-tool';
}
function getInputToolByName(input_tools, name) {
    return input_tools.find((tool) => tool.type === 'function' && tool.name === name);
}
function parseToolCall(params, toolCall) {
    const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
    let parsedArguments = null;
    if (isAutoParsableTool(inputTool)) {
        parsedArguments = inputTool.$parseRaw(toolCall.arguments);
    }
    else if (inputTool?.strict) {
        parsedArguments = JSON.parse(toolCall.arguments);
    }
    return {
        ...toolCall,
        parsed_arguments: parsedArguments,
    };
}
/** Returns whether a response function call matches a strict or auto-parseable request tool. */
function shouldParseToolCall(params, toolCall) {
    if (!params) {
        return false;
    }
    const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
    return isAutoParsableTool(inputTool) || inputTool?.strict || false;
}
/**
 * Validates that compatible chat completion tools can be automatically parsed.
 *
 * @throws {OpenAIError} If a tool is not a function or is missing `strict: true`.
 */
function validateInputTools(tools) {
    for (const tool of tools ?? []) {
        if (tool.type !== 'function') {
            throw new error_1.OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
        }
        if (tool.function.strict !== true) {
            throw new error_1.OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
        }
    }
}
function needsOutputText(response, target) {
    return !Object.getOwnPropertyDescriptor(response, 'output_text') || target.output_text == null;
}
/** Replaces `output_text` with the concatenated text from every response output message. */
function addOutputText(rsp) {
    const texts = [];
    for (const output of rsp.output) {
        if (output.type !== 'message') {
            continue;
        }
        for (const content of output.content) {
            if (content.type === 'output_text') {
                texts.push(content.text);
            }
        }
    }
    rsp.output_text = texts.join('');
}
//# sourceMappingURL=ResponsesParser.js.map

/***/ }),

/***/ 9802:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParsingToolFunction = void 0;
exports.isRunnableFunctionWithParse = isRunnableFunctionWithParse;
/** Returns whether a runnable function provides a parser for its raw argument string. */
function isRunnableFunctionWithParse(fn) {
    return typeof fn.parse === 'function';
}
/**
 * This is helper class for passing a `function` and `parse` where the `function`
 * argument type matches the `parse` return type.
 */
class ParsingToolFunction {
    /** Wraps a parsed-argument function definition in the function-tool shape. */
    constructor(input) {
        /** Identifies the wrapped tool as a callable function. */
        this.type = 'function';
        this.function = input;
    }
}
exports.ParsingToolFunction = ParsingToolFunction;
//# sourceMappingURL=RunnableFunction.js.map

/***/ }),

/***/ 3831:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.allSettledWithThrow = void 0;
/**
 * Like `Promise.allSettled()` but throws an error if any promises are rejected.
 */
const allSettledWithThrow = async (promises) => {
    const results = await Promise.allSettled(promises);
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length) {
        for (const result of rejected) {
            console.error(result.reason);
        }
        throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
    }
    // Note: TS was complaining about using `.filter().map()` here for some reason
    const values = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            values.push(result.value);
        }
    }
    return values;
};
exports.allSettledWithThrow = allSettledWithThrow;
//# sourceMappingURL=Util.js.map

/***/ }),

/***/ 1582:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isToolMessage = exports.isAssistantMessage = void 0;
exports.isPresent = isPresent;
/** Returns whether a conversation message was produced by the assistant. */
const isAssistantMessage = (message) => message?.role === 'assistant';
exports.isAssistantMessage = isAssistantMessage;
/** Returns whether a conversation message contains the result of a tool call. */
const isToolMessage = (message) => message?.role === 'tool';
exports.isToolMessage = isToolMessage;
/** Narrows a value by excluding both `null` and `undefined`. */
function isPresent(obj) {
    return obj != null;
}
//# sourceMappingURL=chatCompletionUtils.js.map

/***/ }),

/***/ 1368:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isChatCompletionFunctionTool = isChatCompletionFunctionTool;
exports.makeParseableResponseFormat = makeParseableResponseFormat;
exports.makeParseableTextFormat = makeParseableTextFormat;
exports.isAutoParsableResponseFormat = isAutoParsableResponseFormat;
exports.isParseableResponseFormat = isParseableResponseFormat;
exports.parseResponseFormatContent = parseResponseFormatContent;
exports.makeParseableTool = makeParseableTool;
exports.isAutoParsableTool = isAutoParsableTool;
exports.maybeParseChatCompletion = maybeParseChatCompletion;
exports.parseChatCompletion = parseChatCompletion;
exports.shouldParseToolCall = shouldParseToolCall;
exports.hasAutoParseableInput = hasAutoParseableInput;
exports.assertToolCallsAreChatCompletionFunctionToolCalls = assertToolCallsAreChatCompletionFunctionToolCalls;
exports.validateInputTools = validateInputTools;
const error_1 = __nccwpck_require__(3269);
/** Returns whether an optional chat completion tool contains a function-tool definition. */
function isChatCompletionFunctionTool(tool) {
    return tool !== undefined && 'function' in tool && tool.function !== undefined;
}
/** Copies a JSON Schema response format and attaches a non-enumerable structured-output parser. */
function makeParseableResponseFormat(response_format, parser) {
    const obj = { ...response_format };
    Object.defineProperties(obj, {
        $brand: {
            value: 'auto-parseable-response-format',
            enumerable: false,
        },
        $parseRaw: {
            value: parser,
            enumerable: false,
        },
    });
    return obj;
}
/** Copies a Responses API text format and attaches a non-enumerable structured-output parser. */
function makeParseableTextFormat(response_format, parser) {
    const obj = { ...response_format };
    Object.defineProperties(obj, {
        $brand: {
            value: 'auto-parseable-response-format',
            enumerable: false,
        },
        $parseRaw: {
            value: parser,
            enumerable: false,
        },
    });
    return obj;
}
/**
 * Whether the given format was built by an SDK helper (e.g. `zodResponseFormat()`)
 * and therefore carries its own `$parseRaw` callback.
 *
 * Prefer {@link isParseableResponseFormat} when deciding whether output should be
 * parsed at all; raw `{ type: 'json_schema' }` formats are parsed too, but are not
 * branded.
 */
function isAutoParsableResponseFormat(response_format) {
    return response_format?.['$brand'] === 'auto-parseable-response-format';
}
/**
 * The canonical definition of an auto-parseable response format, covering both the
 * Chat Completions `response_format` and the Responses `text.format` shapes.
 *
 * Every gate that decides whether output should be parsed must go through this
 * predicate so the runtime, the streaming events and
 * {@link ExtractParsedContentFromParams} cannot drift apart.
 */
function isParseableResponseFormat(format) {
    return isAutoParsableResponseFormat(format) || format?.type === 'json_schema';
}
/**
 * The canonical parser for auto-parseable response formats. This is the only place
 * that chooses between an existing `$parseRaw` callback and generic `JSON.parse()`.
 *
 * Returns `null` for formats that are not auto-parseable.
 */
function parseResponseFormatContent(format, content) {
    if (!isParseableResponseFormat(format)) {
        return null;
    }
    if (typeof format === 'object' &&
        format !== null &&
        '$parseRaw' in format &&
        typeof format.$parseRaw === 'function') {
        return format.$parseRaw(content);
    }
    return JSON.parse(content);
}
/** Copies a function tool and attaches non-enumerable parsing and callback metadata. */
function makeParseableTool(tool, { parser, callback, }) {
    const obj = { ...tool };
    Object.defineProperties(obj, {
        $brand: {
            value: 'auto-parseable-tool',
            enumerable: false,
        },
        $parseRaw: {
            value: parser,
            enumerable: false,
        },
        $callback: {
            value: callback,
            enumerable: false,
        },
    });
    return obj;
}
/** Returns whether a Chat Completions tool carries the SDK's argument-parser marker. */
function isAutoParsableTool(tool) {
    return tool?.['$brand'] === 'auto-parseable-tool';
}
/**
 * Adds parsed-content fields to a chat completion, invoking parsers only when the
 * request includes an auto-parseable response format or a strict function tool.
 */
function maybeParseChatCompletion(completion, params) {
    if (!params || !hasAutoParseableInput(params)) {
        return {
            ...completion,
            choices: completion.choices.map((choice) => ({
                ...choice,
                message: {
                    ...choice.message,
                    parsed: null,
                    ...(choice.message.tool_calls
                        ? {
                            tool_calls: choice.message.tool_calls,
                        }
                        : undefined),
                },
            })),
        };
    }
    return parseChatCompletion(completion, params);
}
/**
 * Parses structured assistant content and strict function-tool arguments.
 *
 * @throws {LengthFinishReasonError} If generation stopped at its token limit.
 * @throws {ContentFilterFinishReasonError} If generation stopped because of content filtering.
 * @throws {OpenAIError} If the completion contains an unsupported tool-call type.
 */
function parseChatCompletion(completion, params) {
    const choices = completion.choices.map((choice) => {
        if (choice.finish_reason === 'length') {
            throw new error_1.LengthFinishReasonError();
        }
        if (choice.finish_reason === 'content_filter') {
            throw new error_1.ContentFilterFinishReasonError();
        }
        return {
            ...choice,
            message: {
                ...choice.message,
                ...(choice.message.tool_calls
                    ? {
                        tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall(params, toolCall)) ?? undefined,
                    }
                    : undefined),
                parsed: choice.message.content !== null &&
                    choice.message.content !== undefined &&
                    !choice.message.refusal &&
                    (choice.message.content !== '' ||
                        (!choice.message.tool_calls?.length && !choice.message.function_call))
                    ? parseResponseFormat(params, choice.message.content)
                    : null,
            },
        };
    });
    return { ...completion, choices };
}
function parseResponseFormat(params, content) {
    return parseResponseFormatContent(params.response_format, content);
}
function parseToolCall(params, toolCall) {
    if (toolCall.type === 'custom') {
        return toolCall;
    }
    if (toolCall.type !== 'function') {
        const unsupportedType = toolCall.type;
        throw new error_1.OpenAIError(`Currently only \`function\` and \`custom\` tool calls are supported; Received \`${unsupportedType}\``);
    }
    const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function.name); // TS doesn't narrow based on isChatCompletionTool
    let parsedArguments = null;
    if (isAutoParsableTool(inputTool)) {
        parsedArguments = inputTool.$parseRaw(toolCall.function.arguments);
    }
    else if (inputTool?.function.strict) {
        parsedArguments = JSON.parse(toolCall.function.arguments);
    }
    return {
        ...toolCall,
        function: {
            ...toolCall.function,
            parsed_arguments: parsedArguments,
        },
    };
}
/** Returns whether a tool call matches a strict or auto-parseable function in the request. */
function shouldParseToolCall(params, 
// accepts partially accumulated tool calls so streaming snapshots can be checked as they build up
toolCall) {
    if (!params || !('tools' in params) || !params.tools || toolCall.type !== 'function') {
        return false;
    }
    const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function?.name);
    return (isChatCompletionFunctionTool(inputTool) &&
        (isAutoParsableTool(inputTool) || inputTool?.function.strict || false));
}
/** Returns whether the request contains an auto-parseable response format or strict function tool. */
function hasAutoParseableInput(params) {
    if (isParseableResponseFormat(params.response_format)) {
        return true;
    }
    return (params.tools?.some((t) => isAutoParsableTool(t) || (t.type === 'function' && t.function.strict === true)) ?? false);
}
/**
 * Narrows completion tool calls to function calls supported by parsing helpers.
 *
 * @throws {OpenAIError} If any tool call has a non-function type.
 */
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
    for (const toolCall of toolCalls || []) {
        if (toolCall.type !== 'function') {
            throw new error_1.OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
        }
    }
}
/**
 * Validates strict function tools while preserving supported custom tools.
 *
 * @throws {OpenAIError} If a tool is unsupported or a function is missing `strict: true`.
 */
function validateInputTools(tools) {
    for (const tool of tools ?? []) {
        if (tool.type === 'custom') {
            continue;
        }
        if (tool.type !== 'function') {
            const unsupportedType = tool.type;
            throw new error_1.OpenAIError(`Currently only \`function\` and \`custom\` tool types are supported; Received \`${unsupportedType}\``);
        }
        if (tool.function.strict !== true) {
            throw new error_1.OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
        }
    }
}
//# sourceMappingURL=parser.js.map

/***/ }),

/***/ 9977:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

var _ResponseStream_instances, _ResponseStream_params, _ResponseStream_currentResponseSnapshot, _ResponseStream_finalResponse, _ResponseStream_accumulatorContext, _ResponseStream_beginRequest, _ResponseStream_addEvent, _ResponseStream_endRequest;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResponseStream = void 0;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(3269);
const EventStream_1 = __nccwpck_require__(4283);
const response_accumulator_1 = __nccwpck_require__(4596);
const ResponsesParser_1 = __nccwpck_require__(3980);
const streaming_1 = __nccwpck_require__(1835);
/** Streams Responses API events while accumulating the latest response and parsed output. */
class ResponseStream extends EventStream_1.EventStream {
    /** Creates an unstarted stream, retaining request parameters for structured-output parsing. */
    constructor(params) {
        super();
        _ResponseStream_instances.add(this);
        _ResponseStream_params.set(this, void 0);
        _ResponseStream_currentResponseSnapshot.set(this, void 0);
        _ResponseStream_finalResponse.set(this, void 0);
        _ResponseStream_accumulatorContext.set(this, (0, response_accumulator_1.createResponseContext)());
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_params, params, "f");
    }
    /** Starts a new response stream or replays an existing response by its identifier. */
    static createResponse(client, params, options) {
        const runner = new ResponseStream(params);
        runner._run(() => runner._createOrRetrieveResponse(client, params, {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'stream' },
        }));
        return runner;
    }
    /** Consumes serialized response events from a readable stream in another runtime. */
    static fromReadableStream(stream) {
        const runner = new ResponseStream(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    async _createOrRetrieveResponse(client, params, options) {
        this._listenForAbort(options?.signal);
        tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
        let stream;
        let starting_after = null;
        if ('response_id' in params) {
            // Keep the full replay so that `accumulateResponse()` sees `response.created` and can build
            // complete snapshots before locally filtering events at `starting_after`.
            stream = await client.responses.retrieve(params.response_id, { stream: true }, { ...options, signal: this.controller.signal, stream: true });
            starting_after = params.starting_after ?? null;
        }
        else {
            stream = await client.responses.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
        }
        this._connected();
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
    }
    async _fromReadableStream(readableStream, options) {
        this._listenForAbort(options?.signal);
        tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
        this._connected();
        const stream = streaming_1.Stream.fromReadableStream(readableStream, this.controller);
        for await (const event of stream) {
            tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, null);
        }
        if (stream.controller.signal?.aborted) {
            throw new error_1.APIUserAbortError();
        }
        return tslib_1.__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
    }
    /** Iterates over response events; stopping iteration early aborts the underlying request. */
    [(_ResponseStream_params = new WeakMap(), _ResponseStream_currentResponseSnapshot = new WeakMap(), _ResponseStream_finalResponse = new WeakMap(), _ResponseStream_accumulatorContext = new WeakMap(), _ResponseStream_instances = new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest() {
        if (this.ended) {
            return;
        }
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, undefined, "f");
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_accumulatorContext, (0, response_accumulator_1.createResponseContext)(), "f");
    }, _ResponseStream_addEvent = function _ResponseStream_addEvent(event, starting_after) {
        if (this.ended) {
            return;
        }
        const maybeEmit = (name, event) => {
            if (starting_after == null || event.sequence_number > starting_after) {
                this._emit(name, event);
            }
        };
        if (event.type === 'error') {
            // First-party providers nest their error payload; retain flat compatibility for
            // serialized events matching the currently published event schema.
            const error = 'error' in event && typeof event.error === 'object' && event.error !== null ? event.error : event;
            throw new error_1.APIError(undefined, error, event.message, undefined);
        }
        const response = (0, response_accumulator_1.accumulateResponseWithContext)(event, tslib_1.__classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f"), tslib_1.__classPrivateFieldGet(this, _ResponseStream_accumulatorContext, "f"));
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, response, "f");
        maybeEmit('event', event);
        switch (event.type) {
            case 'response.output_text.delta': {
                const output = response.output[event.output_index];
                if (!output) {
                    throw new error_1.OpenAIError(`missing output at index ${event.output_index}`);
                }
                if (output.type === 'message') {
                    const content = output.content[event.content_index];
                    if (!content) {
                        throw new error_1.OpenAIError(`missing content at index ${event.content_index}`);
                    }
                    if (content.type !== 'output_text') {
                        throw new error_1.OpenAIError(`expected content to be 'output_text', got ${content.type}`);
                    }
                    maybeEmit('response.output_text.delta', {
                        ...event,
                        snapshot: content.text,
                    });
                }
                break;
            }
            case 'response.function_call_arguments.delta': {
                const output = response.output[event.output_index];
                if (!output) {
                    throw new error_1.OpenAIError(`missing output at index ${event.output_index}`);
                }
                if (output.type === 'function_call') {
                    maybeEmit('response.function_call_arguments.delta', {
                        ...event,
                        snapshot: output.arguments,
                    });
                }
                break;
            }
            default: {
                maybeEmit(event.type, event);
                break;
            }
        }
    }, _ResponseStream_endRequest = function _ResponseStream_endRequest() {
        if (this.ended) {
            throw new error_1.OpenAIError(`stream has ended, this shouldn't happen`);
        }
        const snapshot = tslib_1.__classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
        if (!snapshot) {
            throw new error_1.OpenAIError(`request ended without sending any events`);
        }
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, undefined, "f");
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_accumulatorContext, (0, response_accumulator_1.createResponseContext)(), "f");
        const parsedResponse = finalizeResponse(snapshot, tslib_1.__classPrivateFieldGet(this, _ResponseStream_params, "f"));
        tslib_1.__classPrivateFieldSet(this, _ResponseStream_finalResponse, parsedResponse, "f");
        return parsedResponse;
    }, Symbol.asyncIterator)]() {
        return this._createIterator((push) => {
            const onEvent = (event) => push(event);
            this.on('event', onEvent);
            return () => this.off('event', onEvent);
        }, { onReturn: () => this.abort() });
    }
    /**
     * Waits for the stream to end and returns its latest accumulated response.
     *
     * A clean end after at least one response event resolves even when the response is
     * incomplete. Network errors, cancellation, and streams without a response reject.
     */
    async finalResponse() {
        await this.done();
        const response = tslib_1.__classPrivateFieldGet(this, _ResponseStream_finalResponse, "f");
        if (!response) {
            throw new error_1.OpenAIError('stream ended without producing a Response');
        }
        return response;
    }
}
exports.ResponseStream = ResponseStream;
function finalizeResponse(snapshot, params) {
    return (0, ResponsesParser_1.maybeParseResponse)(snapshot, params);
}
//# sourceMappingURL=ResponseStream.js.map

/***/ }),

/***/ 8874:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Admin = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const OrganizationAPI = tslib_1.__importStar(__nccwpck_require__(6570));
const organization_1 = __nccwpck_require__(6570);
class Admin extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.organization = new OrganizationAPI.Organization(this._client);
    }
}
exports.Admin = Admin;
Admin.Organization = organization_1.Organization;
//# sourceMappingURL=admin.js.map

/***/ }),

/***/ 2068:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AdminAPIKeys = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class AdminAPIKeys extends resource_1.APIResource {
    /**
     * Create an organization admin API key
     *
     * @example
     * ```ts
     * const adminAPIKey =
     *   await client.admin.organization.adminAPIKeys.create({
     *     name: 'New Admin Key',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/admin_api_keys', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieve a single organization API key
     *
     * @example
     * ```ts
     * const adminAPIKey =
     *   await client.admin.organization.adminAPIKeys.retrieve(
     *     'key_id',
     *   );
     * ```
     */
    retrieve(keyID, options) {
        return this._client.get((0, path_1.path) `/organization/admin_api_keys/${keyID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * List organization API keys
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const adminAPIKey of client.admin.organization.adminAPIKeys.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/admin_api_keys', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Delete an organization admin API key
     *
     * @example
     * ```ts
     * const adminAPIKey =
     *   await client.admin.organization.adminAPIKeys.delete(
     *     'key_id',
     *   );
     * ```
     */
    delete(keyID, options) {
        return this._client.delete((0, path_1.path) `/organization/admin_api_keys/${keyID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.AdminAPIKeys = AdminAPIKeys;
//# sourceMappingURL=admin-api-keys.js.map

/***/ }),

/***/ 684:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuditLogs = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
/**
 * List user actions and configuration changes within this organization.
 */
class AuditLogs extends resource_1.APIResource {
    /**
     * List user actions and configuration changes within this organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const auditLogListResponse of client.admin.organization.auditLogs.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/audit_logs', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.AuditLogs = AuditLogs;
//# sourceMappingURL=audit-logs.js.map

/***/ }),

/***/ 6993:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Certificates = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Certificates extends resource_1.APIResource {
    /**
     * Upload a certificate to the organization. This does **not** automatically
     * activate the certificate.
     *
     * Organizations can upload up to 50 certificates.
     *
     * @example
     * ```ts
     * const certificate =
     *   await client.admin.organization.certificates.create({
     *     certificate: 'certificate',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/certificates', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get a certificate that has been uploaded to the organization.
     *
     * You can get a certificate regardless of whether it is active or not.
     *
     * @example
     * ```ts
     * const certificate =
     *   await client.admin.organization.certificates.retrieve(
     *     'certificate_id',
     *   );
     * ```
     */
    retrieve(certificateID, query = {}, options) {
        return this._client.get((0, path_1.path) `/organization/certificates/${certificateID}`, {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Modify a certificate. Note that only the name can be modified.
     *
     * @example
     * ```ts
     * const certificate =
     *   await client.admin.organization.certificates.update(
     *     'certificate_id',
     *   );
     * ```
     */
    update(certificateID, body, options) {
        return this._client.post((0, path_1.path) `/organization/certificates/${certificateID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * List uploaded certificates for this organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateListResponse of client.admin.organization.certificates.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/certificates', (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Delete a certificate from the organization.
     *
     * The certificate must be inactive for the organization and all projects.
     *
     * @example
     * ```ts
     * const certificate =
     *   await client.admin.organization.certificates.delete(
     *     'certificate_id',
     *   );
     * ```
     */
    delete(certificateID, options) {
        return this._client.delete((0, path_1.path) `/organization/certificates/${certificateID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Activate certificates at the organization level.
     *
     * You can atomically and idempotently activate up to 10 certificates at a time.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateActivateResponse of client.admin.organization.certificates.activate(
     *   { certificate_ids: ['cert_abc'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    activate(body, options) {
        return this._client.getAPIList('/organization/certificates/activate', (pagination_1.Page), {
            body,
            method: 'post',
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deactivate certificates at the organization level.
     *
     * You can atomically and idempotently deactivate up to 10 certificates at a time.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateDeactivateResponse of client.admin.organization.certificates.deactivate(
     *   { certificate_ids: ['cert_abc'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    deactivate(body, options) {
        return this._client.getAPIList('/organization/certificates/deactivate', (pagination_1.Page), { body, method: 'post', ...options, __security: { adminAPIKeyAuth: true } });
    }
}
exports.Certificates = Certificates;
//# sourceMappingURL=certificates.js.map

/***/ }),

/***/ 6918:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DataRetention = void 0;
const resource_1 = __nccwpck_require__(9487);
class DataRetention extends resource_1.APIResource {
    /**
     * Retrieves organization data retention controls.
     *
     * @example
     * ```ts
     * const organizationDataRetention =
     *   await client.admin.organization.dataRetention.retrieve();
     * ```
     */
    retrieve(options) {
        return this._client.get('/organization/data_retention', {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates organization data retention controls.
     *
     * @example
     * ```ts
     * const organizationDataRetention =
     *   await client.admin.organization.dataRetention.update({
     *     retention_type: 'zero_data_retention',
     *   });
     * ```
     */
    update(body, options) {
        return this._client.post('/organization/data_retention', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.DataRetention = DataRetention;
//# sourceMappingURL=data-retention.js.map

/***/ }),

/***/ 1576:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Groups = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(4483));
const roles_1 = __nccwpck_require__(4483);
const UsersAPI = tslib_1.__importStar(__nccwpck_require__(3066));
const users_1 = __nccwpck_require__(3066);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Groups extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.users = new UsersAPI.Users(this._client);
        this.roles = new RolesAPI.Roles(this._client);
    }
    /**
     * Creates a new group in the organization.
     *
     * @example
     * ```ts
     * const group = await client.admin.organization.groups.create(
     *   { name: 'x' },
     * );
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/groups', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a group.
     *
     * @example
     * ```ts
     * const group =
     *   await client.admin.organization.groups.retrieve(
     *     'group_id',
     *   );
     * ```
     */
    retrieve(groupID, options) {
        return this._client.get((0, path_1.path) `/organization/groups/${groupID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates a group's information.
     *
     * @example
     * ```ts
     * const group = await client.admin.organization.groups.update(
     *   'group_id',
     *   { name: 'x' },
     * );
     * ```
     */
    update(groupID, body, options) {
        return this._client.post((0, path_1.path) `/organization/groups/${groupID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists all groups in the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const group of client.admin.organization.groups.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/groups', (pagination_1.NextCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deletes a group from the organization.
     *
     * @example
     * ```ts
     * const group = await client.admin.organization.groups.delete(
     *   'group_id',
     * );
     * ```
     */
    delete(groupID, options) {
        return this._client.delete((0, path_1.path) `/organization/groups/${groupID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Groups = Groups;
Groups.Users = users_1.Users;
Groups.Roles = roles_1.Roles;
//# sourceMappingURL=groups.js.map

/***/ }),

/***/ 4483:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Assigns an organization role to a group within the organization.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.groups.roles.create(
     *     'group_id',
     *     { role_id: 'role_id' },
     *   );
     * ```
     */
    create(groupID, body, options) {
        return this._client.post((0, path_1.path) `/organization/groups/${groupID}/roles`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves an organization role assigned to a group.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.groups.roles.retrieve(
     *     'role_id',
     *     { group_id: 'group_id' },
     *   );
     * ```
     */
    retrieve(roleID, params, options) {
        const { group_id } = params;
        return this._client.get((0, path_1.path) `/organization/groups/${group_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the organization roles assigned to a group within the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const roleListResponse of client.admin.organization.groups.roles.list(
     *   'group_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(groupID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/groups/${groupID}/roles`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Unassigns an organization role from a group within the organization.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.groups.roles.delete(
     *     'role_id',
     *     { group_id: 'group_id' },
     *   );
     * ```
     */
    delete(roleID, params, options) {
        const { group_id } = params;
        return this._client.delete((0, path_1.path) `/organization/groups/${group_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 3066:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Users = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Users extends resource_1.APIResource {
    /**
     * Adds a user to a group.
     *
     * @example
     * ```ts
     * const user =
     *   await client.admin.organization.groups.users.create(
     *     'group_id',
     *     { user_id: 'user_id' },
     *   );
     * ```
     */
    create(groupID, body, options) {
        return this._client.post((0, path_1.path) `/organization/groups/${groupID}/users`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a user in a group.
     *
     * @example
     * ```ts
     * const user =
     *   await client.admin.organization.groups.users.retrieve(
     *     'user_id',
     *     { group_id: 'group_id' },
     *   );
     * ```
     */
    retrieve(userID, params, options) {
        const { group_id } = params;
        return this._client.get((0, path_1.path) `/organization/groups/${group_id}/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the users assigned to a group.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const organizationGroupUser of client.admin.organization.groups.users.list(
     *   'group_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(groupID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/groups/${groupID}/users`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Removes a user from a group.
     *
     * @example
     * ```ts
     * const user =
     *   await client.admin.organization.groups.users.delete(
     *     'user_id',
     *     { group_id: 'group_id' },
     *   );
     * ```
     */
    delete(userID, params, options) {
        const { group_id } = params;
        return this._client.delete((0, path_1.path) `/organization/groups/${group_id}/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Users = Users;
//# sourceMappingURL=users.js.map

/***/ }),

/***/ 1491:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Invites = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Invites extends resource_1.APIResource {
    /**
     * Create an invite for a user to the organization. The invite must be accepted by
     * the user before they have access to the organization.
     *
     * @example
     * ```ts
     * const invite =
     *   await client.admin.organization.invites.create({
     *     email: 'email',
     *     role: 'reader',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/invites', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves an invite.
     *
     * @example
     * ```ts
     * const invite =
     *   await client.admin.organization.invites.retrieve(
     *     'invite_id',
     *   );
     * ```
     */
    retrieve(inviteID, options) {
        return this._client.get((0, path_1.path) `/organization/invites/${inviteID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Returns a list of invites in the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const invite of client.admin.organization.invites.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/invites', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Delete an invite. If the invite has already been accepted, it cannot be deleted.
     *
     * @example
     * ```ts
     * const invite =
     *   await client.admin.organization.invites.delete(
     *     'invite_id',
     *   );
     * ```
     */
    delete(inviteID, options) {
        return this._client.delete((0, path_1.path) `/organization/invites/${inviteID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Invites = Invites;
//# sourceMappingURL=invites.js.map

/***/ }),

/***/ 6570:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Organization = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const AdminAPIKeysAPI = tslib_1.__importStar(__nccwpck_require__(2068));
const admin_api_keys_1 = __nccwpck_require__(2068);
const AuditLogsAPI = tslib_1.__importStar(__nccwpck_require__(684));
const audit_logs_1 = __nccwpck_require__(684);
const CertificatesAPI = tslib_1.__importStar(__nccwpck_require__(6993));
const certificates_1 = __nccwpck_require__(6993);
const DataRetentionAPI = tslib_1.__importStar(__nccwpck_require__(6918));
const data_retention_1 = __nccwpck_require__(6918);
const InvitesAPI = tslib_1.__importStar(__nccwpck_require__(1491));
const invites_1 = __nccwpck_require__(1491);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(6572));
const roles_1 = __nccwpck_require__(6572);
const SpendAlertsAPI = tslib_1.__importStar(__nccwpck_require__(449));
const spend_alerts_1 = __nccwpck_require__(449);
const SpendLimitAPI = tslib_1.__importStar(__nccwpck_require__(5179));
const spend_limit_1 = __nccwpck_require__(5179);
const UsageAPI = tslib_1.__importStar(__nccwpck_require__(6754));
const usage_1 = __nccwpck_require__(6754);
const GroupsAPI = tslib_1.__importStar(__nccwpck_require__(1576));
const groups_1 = __nccwpck_require__(1576);
const ProjectsAPI = tslib_1.__importStar(__nccwpck_require__(8560));
const projects_1 = __nccwpck_require__(8560);
const UsersAPI = tslib_1.__importStar(__nccwpck_require__(5754));
const users_1 = __nccwpck_require__(5754);
class Organization extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.auditLogs = new AuditLogsAPI.AuditLogs(this._client);
        this.adminAPIKeys = new AdminAPIKeysAPI.AdminAPIKeys(this._client);
        this.usage = new UsageAPI.Usage(this._client);
        this.invites = new InvitesAPI.Invites(this._client);
        this.users = new UsersAPI.Users(this._client);
        this.groups = new GroupsAPI.Groups(this._client);
        this.roles = new RolesAPI.Roles(this._client);
        this.dataRetention = new DataRetentionAPI.DataRetention(this._client);
        this.spendLimit = new SpendLimitAPI.SpendLimit(this._client);
        this.spendAlerts = new SpendAlertsAPI.SpendAlerts(this._client);
        this.certificates = new CertificatesAPI.Certificates(this._client);
        this.projects = new ProjectsAPI.Projects(this._client);
    }
}
exports.Organization = Organization;
Organization.AuditLogs = audit_logs_1.AuditLogs;
Organization.AdminAPIKeys = admin_api_keys_1.AdminAPIKeys;
Organization.Usage = usage_1.Usage;
Organization.Invites = invites_1.Invites;
Organization.Users = users_1.Users;
Organization.Groups = groups_1.Groups;
Organization.Roles = roles_1.Roles;
Organization.DataRetention = data_retention_1.DataRetention;
Organization.SpendLimit = spend_limit_1.SpendLimit;
Organization.SpendAlerts = spend_alerts_1.SpendAlerts;
Organization.Certificates = certificates_1.Certificates;
Organization.Projects = projects_1.Projects;
//# sourceMappingURL=organization.js.map

/***/ }),

/***/ 1777:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.APIKeys = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class APIKeys extends resource_1.APIResource {
    /**
     * Retrieves an API key in the project.
     *
     * @example
     * ```ts
     * const projectAPIKey =
     *   await client.admin.organization.projects.apiKeys.retrieve(
     *     'api_key_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(apiKeyID, params, options) {
        const { project_id } = params;
        return this._client.get((0, path_1.path) `/organization/projects/${project_id}/api_keys/${apiKeyID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Returns a list of API keys in the project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectAPIKey of client.admin.organization.projects.apiKeys.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/api_keys`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deletes an API key from the project.
     *
     * Returns confirmation of the key deletion, or an error if the key belonged to a
     * service account.
     *
     * @example
     * ```ts
     * const apiKey =
     *   await client.admin.organization.projects.apiKeys.delete(
     *     'api_key_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(apiKeyID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/organization/projects/${project_id}/api_keys/${apiKeyID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.APIKeys = APIKeys;
//# sourceMappingURL=api-keys.js.map

/***/ }),

/***/ 318:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Certificates = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Certificates extends resource_1.APIResource {
    /**
     * List certificates for this project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateListResponse of client.admin.organization.projects.certificates.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/certificates`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Activate certificates at the project level.
     *
     * You can atomically and idempotently activate up to 10 certificates at a time.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateActivateResponse of client.admin.organization.projects.certificates.activate(
     *   'project_id',
     *   { certificate_ids: ['cert_abc'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    activate(projectID, body, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/certificates/activate`, (pagination_1.Page), { body, method: 'post', ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deactivate certificates at the project level. You can atomically and
     * idempotently deactivate up to 10 certificates at a time.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const certificateDeactivateResponse of client.admin.organization.projects.certificates.deactivate(
     *   'project_id',
     *   { certificate_ids: ['cert_abc'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    deactivate(projectID, body, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/certificates/deactivate`, (pagination_1.Page), { body, method: 'post', ...options, __security: { adminAPIKeyAuth: true } });
    }
}
exports.Certificates = Certificates;
//# sourceMappingURL=certificates.js.map

/***/ }),

/***/ 6457:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DataRetention = void 0;
const resource_1 = __nccwpck_require__(9487);
const path_1 = __nccwpck_require__(2704);
class DataRetention extends resource_1.APIResource {
    /**
     * Retrieves project data retention controls.
     *
     * @example
     * ```ts
     * const projectDataRetention =
     *   await client.admin.organization.projects.dataRetention.retrieve(
     *     'project_id',
     *   );
     * ```
     */
    retrieve(projectID, options) {
        return this._client.get((0, path_1.path) `/organization/projects/${projectID}/data_retention`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates project data retention controls.
     *
     * @example
     * ```ts
     * const projectDataRetention =
     *   await client.admin.organization.projects.dataRetention.update(
     *     'project_id',
     *     { retention_type: 'organization_default' },
     *   );
     * ```
     */
    update(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/data_retention`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.DataRetention = DataRetention;
//# sourceMappingURL=data-retention.js.map

/***/ }),

/***/ 5749:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Groups = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(8416));
const roles_1 = __nccwpck_require__(8416);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Groups extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.roles = new RolesAPI.Roles(this._client);
    }
    /**
     * Grants a group access to a project.
     *
     * @example
     * ```ts
     * const projectGroup =
     *   await client.admin.organization.projects.groups.create(
     *     'project_id',
     *     { group_id: 'group_id', role: 'role' },
     *   );
     * ```
     */
    create(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/groups`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project's group.
     *
     * @example
     * ```ts
     * const projectGroup =
     *   await client.admin.organization.projects.groups.retrieve(
     *     'group_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(groupID, params, options) {
        const { project_id, ...query } = params;
        return this._client.get((0, path_1.path) `/organization/projects/${project_id}/groups/${groupID}`, {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the groups that have access to a project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectGroup of client.admin.organization.projects.groups.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/groups`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Revokes a group's access to a project.
     *
     * @example
     * ```ts
     * const group =
     *   await client.admin.organization.projects.groups.delete(
     *     'group_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(groupID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/organization/projects/${project_id}/groups/${groupID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Groups = Groups;
Groups.Roles = roles_1.Roles;
//# sourceMappingURL=groups.js.map

/***/ }),

/***/ 8416:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Assigns a project role to a group within a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.groups.roles.create(
     *     'group_id',
     *     { project_id: 'project_id', role_id: 'role_id' },
     *   );
     * ```
     */
    create(groupID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/projects/${project_id}/groups/${groupID}/roles`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project role assigned to a group.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.groups.roles.retrieve(
     *     'role_id',
     *     { project_id: 'project_id', group_id: 'group_id' },
     *   );
     * ```
     */
    retrieve(roleID, params, options) {
        const { project_id, group_id } = params;
        return this._client.get((0, path_1.path) `/projects/${project_id}/groups/${group_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the project roles assigned to a group within a project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const roleListResponse of client.admin.organization.projects.groups.roles.list(
     *   'group_id',
     *   { project_id: 'project_id' },
     * )) {
     *   // ...
     * }
     * ```
     */
    list(groupID, params, options) {
        const { project_id, ...query } = params;
        return this._client.getAPIList((0, path_1.path) `/projects/${project_id}/groups/${groupID}/roles`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Unassigns a project role from a group within a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.groups.roles.delete(
     *     'role_id',
     *     { project_id: 'project_id', group_id: 'group_id' },
     *   );
     * ```
     */
    delete(roleID, params, options) {
        const { project_id, group_id } = params;
        return this._client.delete((0, path_1.path) `/projects/${project_id}/groups/${group_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 7889:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HostedToolPermissions = void 0;
const resource_1 = __nccwpck_require__(9487);
const path_1 = __nccwpck_require__(2704);
class HostedToolPermissions extends resource_1.APIResource {
    /**
     * Returns hosted tool permissions for a project.
     *
     * @example
     * ```ts
     * const projectHostedToolPermissions =
     *   await client.admin.organization.projects.hostedToolPermissions.retrieve(
     *     'project_id',
     *   );
     * ```
     */
    retrieve(projectID, options) {
        return this._client.get((0, path_1.path) `/organization/projects/${projectID}/hosted_tool_permissions`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates hosted tool permissions for a project.
     *
     * @example
     * ```ts
     * const projectHostedToolPermissions =
     *   await client.admin.organization.projects.hostedToolPermissions.update(
     *     'project_id',
     *   );
     * ```
     */
    update(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/hosted_tool_permissions`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.HostedToolPermissions = HostedToolPermissions;
//# sourceMappingURL=hosted-tool-permissions.js.map

/***/ }),

/***/ 1524:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModelPermissions = void 0;
const resource_1 = __nccwpck_require__(9487);
const path_1 = __nccwpck_require__(2704);
class ModelPermissions extends resource_1.APIResource {
    /**
     * Returns model permissions for a project.
     *
     * @example
     * ```ts
     * const projectModelPermissions =
     *   await client.admin.organization.projects.modelPermissions.retrieve(
     *     'project_id',
     *   );
     * ```
     */
    retrieve(projectID, options) {
        return this._client.get((0, path_1.path) `/organization/projects/${projectID}/model_permissions`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates model permissions for a project.
     *
     * @example
     * ```ts
     * const projectModelPermissions =
     *   await client.admin.organization.projects.modelPermissions.update(
     *     'project_id',
     *     { mode: 'allow_list', model_ids: ['string'] },
     *   );
     * ```
     */
    update(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/model_permissions`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deletes model permissions for a project.
     *
     * @example
     * ```ts
     * const projectModelPermissionsDeleted =
     *   await client.admin.organization.projects.modelPermissions.delete(
     *     'project_id',
     *   );
     * ```
     */
    delete(projectID, options) {
        return this._client.delete((0, path_1.path) `/organization/projects/${projectID}/model_permissions`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.ModelPermissions = ModelPermissions;
//# sourceMappingURL=model-permissions.js.map

/***/ }),

/***/ 8560:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Projects = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const APIKeysAPI = tslib_1.__importStar(__nccwpck_require__(1777));
const api_keys_1 = __nccwpck_require__(1777);
const CertificatesAPI = tslib_1.__importStar(__nccwpck_require__(318));
const certificates_1 = __nccwpck_require__(318);
const DataRetentionAPI = tslib_1.__importStar(__nccwpck_require__(6457));
const data_retention_1 = __nccwpck_require__(6457);
const HostedToolPermissionsAPI = tslib_1.__importStar(__nccwpck_require__(7889));
const hosted_tool_permissions_1 = __nccwpck_require__(7889);
const ModelPermissionsAPI = tslib_1.__importStar(__nccwpck_require__(1524));
const model_permissions_1 = __nccwpck_require__(1524);
const RateLimitsAPI = tslib_1.__importStar(__nccwpck_require__(3833));
const rate_limits_1 = __nccwpck_require__(3833);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(7941));
const roles_1 = __nccwpck_require__(7941);
const SpendAlertsAPI = tslib_1.__importStar(__nccwpck_require__(4886));
const spend_alerts_1 = __nccwpck_require__(4886);
const SpendLimitAPI = tslib_1.__importStar(__nccwpck_require__(9678));
const spend_limit_1 = __nccwpck_require__(9678);
const GroupsAPI = tslib_1.__importStar(__nccwpck_require__(5749));
const groups_1 = __nccwpck_require__(5749);
const ServiceAccountsAPI = tslib_1.__importStar(__nccwpck_require__(1369));
const service_accounts_1 = __nccwpck_require__(1369);
const UsersAPI = tslib_1.__importStar(__nccwpck_require__(1551));
const users_1 = __nccwpck_require__(1551);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Projects extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.users = new UsersAPI.Users(this._client);
        this.serviceAccounts = new ServiceAccountsAPI.ServiceAccounts(this._client);
        this.apiKeys = new APIKeysAPI.APIKeys(this._client);
        this.rateLimits = new RateLimitsAPI.RateLimits(this._client);
        this.modelPermissions = new ModelPermissionsAPI.ModelPermissions(this._client);
        this.hostedToolPermissions = new HostedToolPermissionsAPI.HostedToolPermissions(this._client);
        this.groups = new GroupsAPI.Groups(this._client);
        this.roles = new RolesAPI.Roles(this._client);
        this.dataRetention = new DataRetentionAPI.DataRetention(this._client);
        this.spendLimit = new SpendLimitAPI.SpendLimit(this._client);
        this.spendAlerts = new SpendAlertsAPI.SpendAlerts(this._client);
        this.certificates = new CertificatesAPI.Certificates(this._client);
    }
    /**
     * Create a new project in the organization. Projects can be created and archived,
     * but cannot be deleted.
     *
     * @example
     * ```ts
     * const project =
     *   await client.admin.organization.projects.create({
     *     name: 'name',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/projects', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project.
     *
     * @example
     * ```ts
     * const project =
     *   await client.admin.organization.projects.retrieve(
     *     'project_id',
     *   );
     * ```
     */
    retrieve(projectID, options) {
        return this._client.get((0, path_1.path) `/organization/projects/${projectID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Modifies a project in the organization.
     *
     * @example
     * ```ts
     * const project =
     *   await client.admin.organization.projects.update(
     *     'project_id',
     *   );
     * ```
     */
    update(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Returns a list of projects.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const project of client.admin.organization.projects.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/projects', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Archives a project in the organization. Archived projects cannot be used or
     * updated.
     *
     * @example
     * ```ts
     * const project =
     *   await client.admin.organization.projects.archive(
     *     'project_id',
     *   );
     * ```
     */
    archive(projectID, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/archive`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Projects = Projects;
Projects.Users = users_1.Users;
Projects.ServiceAccounts = service_accounts_1.ServiceAccounts;
Projects.APIKeys = api_keys_1.APIKeys;
Projects.RateLimits = rate_limits_1.RateLimits;
Projects.ModelPermissions = model_permissions_1.ModelPermissions;
Projects.HostedToolPermissions = hosted_tool_permissions_1.HostedToolPermissions;
Projects.Groups = groups_1.Groups;
Projects.Roles = roles_1.Roles;
Projects.DataRetention = data_retention_1.DataRetention;
Projects.SpendLimit = spend_limit_1.SpendLimit;
Projects.SpendAlerts = spend_alerts_1.SpendAlerts;
Projects.Certificates = certificates_1.Certificates;
//# sourceMappingURL=projects.js.map

/***/ }),

/***/ 3833:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RateLimits = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class RateLimits extends resource_1.APIResource {
    /**
     * Returns the rate limits per model for a project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectRateLimit of client.admin.organization.projects.rateLimits.listRateLimits(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    listRateLimits(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/rate_limits`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Updates a project rate limit.
     *
     * @example
     * ```ts
     * const projectRateLimit =
     *   await client.admin.organization.projects.rateLimits.updateRateLimit(
     *     'rate_limit_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    updateRateLimit(rateLimitID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/organization/projects/${project_id}/rate_limits/${rateLimitID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.RateLimits = RateLimits;
//# sourceMappingURL=rate-limits.js.map

/***/ }),

/***/ 7941:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Creates a custom role for a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.roles.create(
     *     'project_id',
     *     { permissions: ['string'], role_name: 'role_name' },
     *   );
     * ```
     */
    create(projectID, body, options) {
        return this._client.post((0, path_1.path) `/projects/${projectID}/roles`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project role.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.roles.retrieve(
     *     'role_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(roleID, params, options) {
        const { project_id } = params;
        return this._client.get((0, path_1.path) `/projects/${project_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates an existing project role.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.roles.update(
     *     'role_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    update(roleID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/projects/${project_id}/roles/${roleID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the roles configured for a project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const role of client.admin.organization.projects.roles.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/projects/${projectID}/roles`, (pagination_1.NextCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deletes a custom role from a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.roles.delete(
     *     'role_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(roleID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/projects/${project_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 920:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.APIKeys = void 0;
const resource_1 = __nccwpck_require__(9487);
const path_1 = __nccwpck_require__(2704);
class APIKeys extends resource_1.APIResource {
    /**
     * Creates an API key for a service account in the project.
     *
     * @example
     * ```ts
     * const apiKey =
     *   await client.admin.organization.projects.serviceAccounts.apiKeys.create(
     *     'service_account_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    create(serviceAccountID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/organization/projects/${project_id}/service_accounts/${serviceAccountID}/api_keys`, { body, ...options, __security: { adminAPIKeyAuth: true } });
    }
}
exports.APIKeys = APIKeys;
//# sourceMappingURL=api-keys.js.map

/***/ }),

/***/ 1369:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServiceAccounts = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const APIKeysAPI = tslib_1.__importStar(__nccwpck_require__(920));
const api_keys_1 = __nccwpck_require__(920);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class ServiceAccounts extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.apiKeys = new APIKeysAPI.APIKeys(this._client);
    }
    /**
     * Creates a new service account in the project. By default, this also returns an
     * unredacted API key for the service account.
     *
     * @example
     * ```ts
     * const serviceAccount =
     *   await client.admin.organization.projects.serviceAccounts.create(
     *     'project_id',
     *     { name: 'name' },
     *   );
     * ```
     */
    create(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/service_accounts`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a service account in the project.
     *
     * @example
     * ```ts
     * const projectServiceAccount =
     *   await client.admin.organization.projects.serviceAccounts.retrieve(
     *     'service_account_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(serviceAccountID, params, options) {
        const { project_id } = params;
        return this._client.get((0, path_1.path) `/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates a service account in the project.
     *
     * @example
     * ```ts
     * const projectServiceAccount =
     *   await client.admin.organization.projects.serviceAccounts.update(
     *     'service_account_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    update(serviceAccountID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, { body, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Returns a list of service accounts in the project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectServiceAccount of client.admin.organization.projects.serviceAccounts.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/service_accounts`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deletes a service account from the project.
     *
     * Returns confirmation of service account deletion, or an error if the project is
     * archived (archived projects have no service accounts).
     *
     * @example
     * ```ts
     * const serviceAccount =
     *   await client.admin.organization.projects.serviceAccounts.delete(
     *     'service_account_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(serviceAccountID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, { ...options, __security: { adminAPIKeyAuth: true } });
    }
}
exports.ServiceAccounts = ServiceAccounts;
ServiceAccounts.APIKeys = api_keys_1.APIKeys;
//# sourceMappingURL=service-accounts.js.map

/***/ }),

/***/ 4886:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpendAlerts = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class SpendAlerts extends resource_1.APIResource {
    /**
     * Creates a project spend alert.
     *
     * @example
     * ```ts
     * const projectSpendAlert =
     *   await client.admin.organization.projects.spendAlerts.create(
     *     'project_id',
     *     {
     *       currency: 'USD',
     *       interval: 'month',
     *       notification_channel: {
     *         recipients: ['string'],
     *         type: 'email',
     *       },
     *       threshold_amount: 0,
     *     },
     *   );
     * ```
     */
    create(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/spend_alerts`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project spend alert.
     *
     * @example
     * ```ts
     * const projectSpendAlert =
     *   await client.admin.organization.projects.spendAlerts.retrieve(
     *     'alert_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(alertID, params, options) {
        const { project_id } = params;
        return this._client.get((0, path_1.path) `/organization/projects/${project_id}/spend_alerts/${alertID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates a project spend alert.
     *
     * @example
     * ```ts
     * const projectSpendAlert =
     *   await client.admin.organization.projects.spendAlerts.update(
     *     'alert_id',
     *     {
     *       project_id: 'project_id',
     *       currency: 'USD',
     *       interval: 'month',
     *       notification_channel: {
     *         recipients: ['string'],
     *         type: 'email',
     *       },
     *       threshold_amount: 0,
     *     },
     *   );
     * ```
     */
    update(alertID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/organization/projects/${project_id}/spend_alerts/${alertID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists project spend alerts.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectSpendAlert of client.admin.organization.projects.spendAlerts.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/spend_alerts`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deletes a project spend alert.
     *
     * @example
     * ```ts
     * const projectSpendAlertDeleted =
     *   await client.admin.organization.projects.spendAlerts.delete(
     *     'alert_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(alertID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/organization/projects/${project_id}/spend_alerts/${alertID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.SpendAlerts = SpendAlerts;
//# sourceMappingURL=spend-alerts.js.map

/***/ }),

/***/ 9678:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpendLimit = void 0;
const resource_1 = __nccwpck_require__(9487);
const path_1 = __nccwpck_require__(2704);
class SpendLimit extends resource_1.APIResource {
    /**
     * Get a project's hard spend limit.
     *
     * @example
     * ```ts
     * const projectSpendLimit =
     *   await client.admin.organization.projects.spendLimit.retrieve(
     *     'proj_123',
     *   );
     * ```
     */
    retrieve(projectID, options) {
        return this._client.get((0, path_1.path) `/organization/projects/${projectID}/spend_limit`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Create or replace a project's hard spend limit.
     *
     * @example
     * ```ts
     * const projectSpendLimit =
     *   await client.admin.organization.projects.spendLimit.update(
     *     'proj_123',
     *     {
     *       currency: 'USD',
     *       interval: 'month',
     *       threshold_amount: 1,
     *     },
     *   );
     * ```
     */
    update(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/spend_limit`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Delete a project's hard spend limit.
     *
     * @example
     * ```ts
     * const projectSpendLimitDeleted =
     *   await client.admin.organization.projects.spendLimit.delete(
     *     'proj_123',
     *   );
     * ```
     */
    delete(projectID, options) {
        return this._client.delete((0, path_1.path) `/organization/projects/${projectID}/spend_limit`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.SpendLimit = SpendLimit;
//# sourceMappingURL=spend-limit.js.map

/***/ }),

/***/ 26:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Assigns a project role to a user within a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.users.roles.create(
     *     'user_id',
     *     { project_id: 'project_id', role_id: 'role_id' },
     *   );
     * ```
     */
    create(userID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/projects/${project_id}/users/${userID}/roles`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a project role assigned to a user.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.users.roles.retrieve(
     *     'role_id',
     *     { project_id: 'project_id', user_id: 'user_id' },
     *   );
     * ```
     */
    retrieve(roleID, params, options) {
        const { project_id, user_id } = params;
        return this._client.get((0, path_1.path) `/projects/${project_id}/users/${user_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the project roles assigned to a user within a project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const roleListResponse of client.admin.organization.projects.users.roles.list(
     *   'user_id',
     *   { project_id: 'project_id' },
     * )) {
     *   // ...
     * }
     * ```
     */
    list(userID, params, options) {
        const { project_id, ...query } = params;
        return this._client.getAPIList((0, path_1.path) `/projects/${project_id}/users/${userID}/roles`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Unassigns a project role from a user within a project.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.projects.users.roles.delete(
     *     'role_id',
     *     { project_id: 'project_id', user_id: 'user_id' },
     *   );
     * ```
     */
    delete(roleID, params, options) {
        const { project_id, user_id } = params;
        return this._client.delete((0, path_1.path) `/projects/${project_id}/users/${user_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 1551:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Users = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(26));
const roles_1 = __nccwpck_require__(26);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Users extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.roles = new RolesAPI.Roles(this._client);
    }
    /**
     * Adds a user to the project. Users must already be members of the organization to
     * be added to a project.
     *
     * @example
     * ```ts
     * const projectUser =
     *   await client.admin.organization.projects.users.create(
     *     'project_id',
     *     { role: 'role' },
     *   );
     * ```
     */
    create(projectID, body, options) {
        return this._client.post((0, path_1.path) `/organization/projects/${projectID}/users`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves a user in the project.
     *
     * @example
     * ```ts
     * const projectUser =
     *   await client.admin.organization.projects.users.retrieve(
     *     'user_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    retrieve(userID, params, options) {
        const { project_id } = params;
        return this._client.get((0, path_1.path) `/organization/projects/${project_id}/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Modifies a user's role in the project.
     *
     * @example
     * ```ts
     * const projectUser =
     *   await client.admin.organization.projects.users.update(
     *     'user_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    update(userID, params, options) {
        const { project_id, ...body } = params;
        return this._client.post((0, path_1.path) `/organization/projects/${project_id}/users/${userID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Returns a list of users in the project.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const projectUser of client.admin.organization.projects.users.list(
     *   'project_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(projectID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/projects/${projectID}/users`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deletes a user from the project.
     *
     * Returns confirmation of project user deletion, or an error if the project is
     * archived (archived projects have no users).
     *
     * @example
     * ```ts
     * const user =
     *   await client.admin.organization.projects.users.delete(
     *     'user_id',
     *     { project_id: 'project_id' },
     *   );
     * ```
     */
    delete(userID, params, options) {
        const { project_id } = params;
        return this._client.delete((0, path_1.path) `/organization/projects/${project_id}/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Users = Users;
Users.Roles = roles_1.Roles;
//# sourceMappingURL=users.js.map

/***/ }),

/***/ 6572:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Creates a custom role for the organization.
     *
     * @example
     * ```ts
     * const role = await client.admin.organization.roles.create({
     *   permissions: ['string'],
     *   role_name: 'role_name',
     * });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/roles', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves an organization role.
     *
     * @example
     * ```ts
     * const role = await client.admin.organization.roles.retrieve(
     *   'role_id',
     * );
     * ```
     */
    retrieve(roleID, options) {
        return this._client.get((0, path_1.path) `/organization/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates an existing organization role.
     *
     * @example
     * ```ts
     * const role = await client.admin.organization.roles.update(
     *   'role_id',
     * );
     * ```
     */
    update(roleID, body, options) {
        return this._client.post((0, path_1.path) `/organization/roles/${roleID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the roles configured for the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const role of client.admin.organization.roles.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/roles', (pagination_1.NextCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deletes a custom role from the organization.
     *
     * @example
     * ```ts
     * const role = await client.admin.organization.roles.delete(
     *   'role_id',
     * );
     * ```
     */
    delete(roleID, options) {
        return this._client.delete((0, path_1.path) `/organization/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 449:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpendAlerts = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class SpendAlerts extends resource_1.APIResource {
    /**
     * Creates an organization spend alert.
     *
     * @example
     * ```ts
     * const organizationSpendAlert =
     *   await client.admin.organization.spendAlerts.create({
     *     currency: 'USD',
     *     interval: 'month',
     *     notification_channel: {
     *       recipients: ['string'],
     *       type: 'email',
     *     },
     *     threshold_amount: 0,
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/organization/spend_alerts', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves an organization spend alert.
     *
     * @example
     * ```ts
     * const organizationSpendAlert =
     *   await client.admin.organization.spendAlerts.retrieve(
     *     'alert_id',
     *   );
     * ```
     */
    retrieve(alertID, options) {
        return this._client.get((0, path_1.path) `/organization/spend_alerts/${alertID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Updates an organization spend alert.
     *
     * @example
     * ```ts
     * const organizationSpendAlert =
     *   await client.admin.organization.spendAlerts.update(
     *     'alert_id',
     *     {
     *       currency: 'USD',
     *       interval: 'month',
     *       notification_channel: {
     *         recipients: ['string'],
     *         type: 'email',
     *       },
     *       threshold_amount: 0,
     *     },
     *   );
     * ```
     */
    update(alertID, body, options) {
        return this._client.post((0, path_1.path) `/organization/spend_alerts/${alertID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists organization spend alerts.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const organizationSpendAlert of client.admin.organization.spendAlerts.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/spend_alerts', (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Deletes an organization spend alert.
     *
     * @example
     * ```ts
     * const organizationSpendAlertDeleted =
     *   await client.admin.organization.spendAlerts.delete(
     *     'alert_id',
     *   );
     * ```
     */
    delete(alertID, options) {
        return this._client.delete((0, path_1.path) `/organization/spend_alerts/${alertID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.SpendAlerts = SpendAlerts;
//# sourceMappingURL=spend-alerts.js.map

/***/ }),

/***/ 5179:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SpendLimit = void 0;
const resource_1 = __nccwpck_require__(9487);
class SpendLimit extends resource_1.APIResource {
    /**
     * Get the organization's hard spend limit.
     *
     * @example
     * ```ts
     * const organizationSpendLimit =
     *   await client.admin.organization.spendLimit.retrieve();
     * ```
     */
    retrieve(options) {
        return this._client.get('/organization/spend_limit', {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Create or replace the organization's hard spend limit.
     *
     * @example
     * ```ts
     * const organizationSpendLimit =
     *   await client.admin.organization.spendLimit.update({
     *     currency: 'USD',
     *     interval: 'month',
     *     threshold_amount: 1,
     *   });
     * ```
     */
    update(body, options) {
        return this._client.post('/organization/spend_limit', {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Delete the organization's hard spend limit.
     *
     * @example
     * ```ts
     * const organizationSpendLimitDeleted =
     *   await client.admin.organization.spendLimit.delete();
     * ```
     */
    delete(options) {
        return this._client.delete('/organization/spend_limit', {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.SpendLimit = SpendLimit;
//# sourceMappingURL=spend-limit.js.map

/***/ }),

/***/ 6754:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Usage = void 0;
const resource_1 = __nccwpck_require__(9487);
class Usage extends resource_1.APIResource {
    /**
     * Get audio speeches usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.audioSpeeches({
     *     start_time: 0,
     *   });
     * ```
     */
    audioSpeeches(query, options) {
        return this._client.get('/organization/usage/audio_speeches', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get audio transcriptions usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.audioTranscriptions(
     *     { start_time: 0 },
     *   );
     * ```
     */
    audioTranscriptions(query, options) {
        return this._client.get('/organization/usage/audio_transcriptions', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get code interpreter sessions usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.codeInterpreterSessions(
     *     { start_time: 0 },
     *   );
     * ```
     */
    codeInterpreterSessions(query, options) {
        return this._client.get('/organization/usage/code_interpreter_sessions', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get completions usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.completions({
     *     start_time: 0,
     *   });
     * ```
     */
    completions(query, options) {
        return this._client.get('/organization/usage/completions', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get costs details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.costs({
     *     start_time: 0,
     *   });
     * ```
     */
    costs(query, options) {
        return this._client.get('/organization/costs', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get embeddings usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.embeddings({
     *     start_time: 0,
     *   });
     * ```
     */
    embeddings(query, options) {
        return this._client.get('/organization/usage/embeddings', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get file search calls usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.fileSearchCalls({
     *     start_time: 0,
     *   });
     * ```
     */
    fileSearchCalls(query, options) {
        return this._client.get('/organization/usage/file_search_calls', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get images usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.images({
     *     start_time: 0,
     *   });
     * ```
     */
    images(query, options) {
        return this._client.get('/organization/usage/images', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get moderations usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.moderations({
     *     start_time: 0,
     *   });
     * ```
     */
    moderations(query, options) {
        return this._client.get('/organization/usage/moderations', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get vector stores usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.vectorStores({
     *     start_time: 0,
     *   });
     * ```
     */
    vectorStores(query, options) {
        return this._client.get('/organization/usage/vector_stores', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Get web search calls usage details for the organization.
     *
     * @example
     * ```ts
     * const response =
     *   await client.admin.organization.usage.webSearchCalls({
     *     start_time: 0,
     *   });
     * ```
     */
    webSearchCalls(query, options) {
        return this._client.get('/organization/usage/web_search_calls', {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Usage = Usage;
//# sourceMappingURL=usage.js.map

/***/ }),

/***/ 2867:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Roles extends resource_1.APIResource {
    /**
     * Assigns an organization role to a user within the organization.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.users.roles.create(
     *     'user_id',
     *     { role_id: 'role_id' },
     *   );
     * ```
     */
    create(userID, body, options) {
        return this._client.post((0, path_1.path) `/organization/users/${userID}/roles`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Retrieves an organization role assigned to a user.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.users.roles.retrieve(
     *     'role_id',
     *     { user_id: 'user_id' },
     *   );
     * ```
     */
    retrieve(roleID, params, options) {
        const { user_id } = params;
        return this._client.get((0, path_1.path) `/organization/users/${user_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists the organization roles assigned to a user within the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const roleListResponse of client.admin.organization.users.roles.list(
     *   'user_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(userID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/organization/users/${userID}/roles`, (pagination_1.NextCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * Unassigns an organization role from a user within the organization.
     *
     * @example
     * ```ts
     * const role =
     *   await client.admin.organization.users.roles.delete(
     *     'role_id',
     *     { user_id: 'user_id' },
     *   );
     * ```
     */
    delete(roleID, params, options) {
        const { user_id } = params;
        return this._client.delete((0, path_1.path) `/organization/users/${user_id}/roles/${roleID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Roles = Roles;
//# sourceMappingURL=roles.js.map

/***/ }),

/***/ 5754:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Users = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const RolesAPI = tslib_1.__importStar(__nccwpck_require__(2867));
const roles_1 = __nccwpck_require__(2867);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class Users extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.roles = new RolesAPI.Roles(this._client);
    }
    /**
     * Retrieves a user by their identifier.
     *
     * @example
     * ```ts
     * const organizationUser =
     *   await client.admin.organization.users.retrieve('user_id');
     * ```
     */
    retrieve(userID, options) {
        return this._client.get((0, path_1.path) `/organization/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Modifies a user's role in the organization.
     *
     * @example
     * ```ts
     * const organizationUser =
     *   await client.admin.organization.users.update('user_id');
     * ```
     */
    update(userID, body, options) {
        return this._client.post((0, path_1.path) `/organization/users/${userID}`, {
            body,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Lists all of the users in the organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const organizationUser of client.admin.organization.users.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/organization/users', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * Deletes a user from the organization.
     *
     * @example
     * ```ts
     * const user = await client.admin.organization.users.delete(
     *   'user_id',
     * );
     * ```
     */
    delete(userID, options) {
        return this._client.delete((0, path_1.path) `/organization/users/${userID}`, {
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
}
exports.Users = Users;
Users.Roles = roles_1.Roles;
//# sourceMappingURL=users.js.map

/***/ }),

/***/ 3638:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Audio = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const SpeechAPI = tslib_1.__importStar(__nccwpck_require__(40));
const speech_1 = __nccwpck_require__(40);
const TranscriptionsAPI = tslib_1.__importStar(__nccwpck_require__(4031));
const transcriptions_1 = __nccwpck_require__(4031);
const TranslationsAPI = tslib_1.__importStar(__nccwpck_require__(2882));
const translations_1 = __nccwpck_require__(2882);
class Audio extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.transcriptions = new TranscriptionsAPI.Transcriptions(this._client);
        this.translations = new TranslationsAPI.Translations(this._client);
        this.speech = new SpeechAPI.Speech(this._client);
    }
}
exports.Audio = Audio;
Audio.Transcriptions = transcriptions_1.Transcriptions;
Audio.Translations = translations_1.Translations;
Audio.Speech = speech_1.Speech;
//# sourceMappingURL=audio.js.map

/***/ }),

/***/ 40:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Speech = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
/**
 * Turn audio into text or text into audio.
 */
class Speech extends resource_1.APIResource {
    /**
     * Generates audio from the input text.
     *
     * Returns the audio file content, or a stream of audio events.
     *
     * @example
     * ```ts
     * const speech = await client.audio.speech.create({
     *   input: 'input',
     *   model: 'tts-1',
     *   voice: 'alloy',
     * });
     *
     * const content = await speech.blob();
     * console.log(content);
     * ```
     */
    create(body, options) {
        return this._client.post('/audio/speech', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/octet-stream' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
}
exports.Speech = Speech;
//# sourceMappingURL=speech.js.map

/***/ }),

/***/ 4031:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Transcriptions = void 0;
const resource_1 = __nccwpck_require__(9487);
const uploads_1 = __nccwpck_require__(5887);
/**
 * Turn audio into text or text into audio.
 */
class Transcriptions extends resource_1.APIResource {
    create(body, options) {
        return this._client.post('/audio/transcriptions', (0, uploads_1.multipartFormRequestOptions)({
            body,
            ...options,
            stream: body.stream ?? false,
            __metadata: { model: body.model },
            __security: { bearerAuth: true },
        }, this._client));
    }
}
exports.Transcriptions = Transcriptions;
//# sourceMappingURL=transcriptions.js.map

/***/ }),

/***/ 2882:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Translations = void 0;
const resource_1 = __nccwpck_require__(9487);
const uploads_1 = __nccwpck_require__(5887);
/**
 * Turn audio into text or text into audio.
 */
class Translations extends resource_1.APIResource {
    create(body, options) {
        return this._client.post('/audio/translations', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __metadata: { model: body.model }, __security: { bearerAuth: true } }, this._client));
    }
}
exports.Translations = Translations;
//# sourceMappingURL=translations.js.map

/***/ }),

/***/ 257:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Batches = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Create large batches of API requests to run asynchronously.
 */
class Batches extends resource_1.APIResource {
    /**
     * Creates and executes a batch from an uploaded file of requests
     */
    create(body, options) {
        return this._client.post('/batches', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Retrieves a batch.
     */
    retrieve(batchID, options) {
        return this._client.get((0, path_1.path) `/batches/${batchID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * List your organization's batches.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/batches', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
     * 10 minutes, before changing to `cancelled`, where it will have partial results
     * (if any) available in the output file.
     */
    cancel(batchID, options) {
        return this._client.post((0, path_1.path) `/batches/${batchID}/cancel`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Batches = Batches;
//# sourceMappingURL=batches.js.map

/***/ }),

/***/ 1627:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Assistants = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
/**
 * Build Assistants that can call models and use tools.
 */
class Assistants extends resource_1.APIResource {
    /**
     * Create an assistant with a model and instructions.
     *
     * @deprecated
     */
    create(body, options) {
        return this._client.post('/assistants', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves an assistant.
     *
     * @deprecated
     */
    retrieve(assistantID, options) {
        return this._client.get((0, path_1.path) `/assistants/${assistantID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modifies an assistant.
     *
     * @deprecated
     */
    update(assistantID, body, options) {
        return this._client.post((0, path_1.path) `/assistants/${assistantID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of assistants.
     *
     * @deprecated
     */
    list(query = {}, options) {
        return this._client.getAPIList('/assistants', (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete an assistant.
     *
     * @deprecated
     */
    delete(assistantID, options) {
        return this._client.delete((0, path_1.path) `/assistants/${assistantID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Assistants = Assistants;
//# sourceMappingURL=assistants.js.map

/***/ }),

/***/ 8852:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Beta = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const AssistantsAPI = tslib_1.__importStar(__nccwpck_require__(1627));
const assistants_1 = __nccwpck_require__(1627);
const RealtimeAPI = tslib_1.__importStar(__nccwpck_require__(5367));
const realtime_1 = __nccwpck_require__(5367);
const ChatKitAPI = tslib_1.__importStar(__nccwpck_require__(5027));
const chatkit_1 = __nccwpck_require__(5027);
const ResponsesAPI = tslib_1.__importStar(__nccwpck_require__(7891));
const responses_1 = __nccwpck_require__(7891);
const ThreadsAPI = tslib_1.__importStar(__nccwpck_require__(6847));
const threads_1 = __nccwpck_require__(6847);
class Beta extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.realtime = new RealtimeAPI.Realtime(this._client);
        this.responses = new ResponsesAPI.Responses(this._client);
        this.chatkit = new ChatKitAPI.ChatKit(this._client);
        this.assistants = new AssistantsAPI.Assistants(this._client);
        this.threads = new ThreadsAPI.Threads(this._client);
    }
}
exports.Beta = Beta;
Beta.Realtime = realtime_1.Realtime;
Beta.Responses = responses_1.Responses;
Beta.ChatKit = chatkit_1.ChatKit;
Beta.Assistants = assistants_1.Assistants;
Beta.Threads = threads_1.Threads;
//# sourceMappingURL=beta.js.map

/***/ }),

/***/ 5027:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatKit = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const SessionsAPI = tslib_1.__importStar(__nccwpck_require__(7696));
const sessions_1 = __nccwpck_require__(7696);
const ThreadsAPI = tslib_1.__importStar(__nccwpck_require__(2928));
const threads_1 = __nccwpck_require__(2928);
class ChatKit extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.sessions = new SessionsAPI.Sessions(this._client);
        this.threads = new ThreadsAPI.Threads(this._client);
    }
}
exports.ChatKit = ChatKit;
ChatKit.Sessions = sessions_1.Sessions;
ChatKit.Threads = threads_1.Threads;
//# sourceMappingURL=chatkit.js.map

/***/ }),

/***/ 7696:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Sessions = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Sessions extends resource_1.APIResource {
    /**
     * Create a ChatKit session.
     *
     * @example
     * ```ts
     * const chatSession =
     *   await client.beta.chatkit.sessions.create({
     *     user: 'x',
     *     workflow: { id: 'id' },
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/chatkit/sessions', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancel an active ChatKit session and return its most recent metadata.
     *
     * Cancelling prevents new requests from using the issued client secret.
     *
     * @example
     * ```ts
     * const chatSession =
     *   await client.beta.chatkit.sessions.cancel('cksess_123');
     * ```
     */
    cancel(sessionID, options) {
        return this._client.post((0, path_1.path) `/chatkit/sessions/${sessionID}/cancel`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Sessions = Sessions;
//# sourceMappingURL=sessions.js.map

/***/ }),

/***/ 2928:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Threads = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Threads extends resource_1.APIResource {
    /**
     * Retrieve a ChatKit thread by its identifier.
     *
     * @example
     * ```ts
     * const chatkitThread =
     *   await client.beta.chatkit.threads.retrieve('cthr_123');
     * ```
     */
    retrieve(threadID, options) {
        return this._client.get((0, path_1.path) `/chatkit/threads/${threadID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * List ChatKit threads with optional pagination and user filters.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const chatkitThread of client.beta.chatkit.threads.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/chatkit/threads', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a ChatKit thread along with its items and stored attachments.
     *
     * @example
     * ```ts
     * const thread = await client.beta.chatkit.threads.delete(
     *   'cthr_123',
     * );
     * ```
     */
    delete(threadID, options) {
        return this._client.delete((0, path_1.path) `/chatkit/threads/${threadID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * List items that belong to a ChatKit thread.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const thread of client.beta.chatkit.threads.listItems(
     *   'cthr_123',
     * )) {
     *   // ...
     * }
     * ```
     */
    listItems(threadID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/chatkit/threads/${threadID}/items`, (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'chatkit_beta=v1' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Threads = Threads;
//# sourceMappingURL=threads.js.map

/***/ }),

/***/ 5367:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Realtime = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const SessionsAPI = tslib_1.__importStar(__nccwpck_require__(1015));
const sessions_1 = __nccwpck_require__(1015);
const TranscriptionSessionsAPI = tslib_1.__importStar(__nccwpck_require__(6900));
const transcription_sessions_1 = __nccwpck_require__(6900);
/**
 * @deprecated Realtime has now launched and is generally available. The old beta API is now deprecated.
 */
class Realtime extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.sessions = new SessionsAPI.Sessions(this._client);
        this.transcriptionSessions = new TranscriptionSessionsAPI.TranscriptionSessions(this._client);
    }
}
exports.Realtime = Realtime;
Realtime.Sessions = sessions_1.Sessions;
Realtime.TranscriptionSessions = transcription_sessions_1.TranscriptionSessions;
//# sourceMappingURL=realtime.js.map

/***/ }),

/***/ 1015:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Sessions = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
class Sessions extends resource_1.APIResource {
    /**
     * Create an ephemeral API token for use in client-side applications with the
     * Realtime API. Can be configured with the same session parameters as the
     * `session.update` client event.
     *
     * It responds with a session object, plus a `client_secret` key which contains a
     * usable ephemeral API token that can be used to authenticate browser clients for
     * the Realtime API.
     *
     * @example
     * ```ts
     * const session =
     *   await client.beta.realtime.sessions.create();
     * ```
     */
    create(body, options) {
        return this._client.post('/realtime/sessions', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Sessions = Sessions;
//# sourceMappingURL=sessions.js.map

/***/ }),

/***/ 6900:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TranscriptionSessions = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
class TranscriptionSessions extends resource_1.APIResource {
    /**
     * Create an ephemeral API token for use in client-side applications with the
     * Realtime API specifically for realtime transcriptions. Can be configured with
     * the same session parameters as the `transcription_session.update` client event.
     *
     * It responds with a session object, plus a `client_secret` key which contains a
     * usable ephemeral API token that can be used to authenticate browser clients for
     * the Realtime API.
     *
     * @example
     * ```ts
     * const transcriptionSession =
     *   await client.beta.realtime.transcriptionSessions.create();
     * ```
     */
    create(body, options) {
        return this._client.post('/realtime/transcription_sessions', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.TranscriptionSessions = TranscriptionSessions;
//# sourceMappingURL=transcription-sessions.js.map

/***/ }),

/***/ 2430:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InputItems = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class InputItems extends resource_1.APIResource {
    /**
     * Returns a list of input items for a given response.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaResponseItem of client.beta.responses.inputItems.list(
     *   'response_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(responseID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList((0, path_1.path) `/responses/${responseID}/input_items?beta=true`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            __security: { bearerAuth: true },
        });
    }
}
exports.InputItems = InputItems;
//# sourceMappingURL=input-items.js.map

/***/ }),

/***/ 618:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InputTokens = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
class InputTokens extends resource_1.APIResource {
    /**
     * Returns input token counts of the request.
     *
     * Returns an object with `object` set to `response.input_tokens` and an
     * `input_tokens` count.
     *
     * @example
     * ```ts
     * const response =
     *   await client.beta.responses.inputTokens.count();
     * ```
     */
    count(params = {}, options) {
        const { betas, ...body } = params ?? {};
        return this._client.post('/responses/input_tokens?beta=true', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            __security: { bearerAuth: true },
        });
    }
}
exports.InputTokens = InputTokens;
//# sourceMappingURL=input-tokens.js.map

/***/ }),

/***/ 7891:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Responses = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const InputItemsAPI = tslib_1.__importStar(__nccwpck_require__(2430));
const input_items_1 = __nccwpck_require__(2430);
const InputTokensAPI = tslib_1.__importStar(__nccwpck_require__(618));
const input_tokens_1 = __nccwpck_require__(618);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Responses extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.inputItems = new InputItemsAPI.InputItems(this._client);
        this.inputTokens = new InputTokensAPI.InputTokens(this._client);
    }
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/responses?beta=true', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            stream: params.stream ?? false,
            __security: { bearerAuth: true },
        });
    }
    retrieve(responseID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.get((0, path_1.path) `/responses/${responseID}?beta=true`, {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            stream: params?.stream ?? false,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Deletes a model response with the given ID.
     *
     * @example
     * ```ts
     * await client.beta.responses.delete(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    delete(responseID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.delete((0, path_1.path) `/responses/${responseID}?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { Accept: '*/*', ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancels a model response with the given ID. Only responses created with the
     * `background` parameter set to `true` can be cancelled.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     *
     * @example
     * ```ts
     * const betaResponse = await client.beta.responses.cancel(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    cancel(responseID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post((0, path_1.path) `/responses/${responseID}/cancel?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Compact a conversation. Returns a compacted response object.
     *
     * Learn when and how to compact long-running conversations in the
     * [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
     * For ZDR-compatible compaction details, see
     * [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
     *
     * @example
     * ```ts
     * const betaCompactedResponse =
     *   await client.beta.responses.compact({
     *     model: 'gpt-5.6-sol',
     *   });
     * ```
     */
    compact(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/responses/compact?beta=true', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { ...(betas?.toString() != null ? { 'openai-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Responses = Responses;
Responses.InputItems = input_items_1.InputItems;
Responses.InputTokens = input_tokens_1.InputTokens;
//# sourceMappingURL=responses.js.map

/***/ }),

/***/ 6648:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Messages = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
/**
 * Build Assistants that can call models and use tools.
 *
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
class Messages extends resource_1.APIResource {
    /**
     * Create a message.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    create(threadID, body, options) {
        return this._client.post((0, path_1.path) `/threads/${threadID}/messages`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieve a message.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    retrieve(messageID, params, options) {
        const { thread_id } = params;
        return this._client.get((0, path_1.path) `/threads/${thread_id}/messages/${messageID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modifies a message.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    update(messageID, params, options) {
        const { thread_id, ...body } = params;
        return this._client.post((0, path_1.path) `/threads/${thread_id}/messages/${messageID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of messages for a given thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    list(threadID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/threads/${threadID}/messages`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Deletes a message.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    delete(messageID, params, options) {
        const { thread_id } = params;
        return this._client.delete((0, path_1.path) `/threads/${thread_id}/messages/${messageID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Messages = Messages;
//# sourceMappingURL=messages.js.map

/***/ }),

/***/ 3051:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Runs = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const StepsAPI = tslib_1.__importStar(__nccwpck_require__(9201));
const steps_1 = __nccwpck_require__(9201);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const AssistantStream_1 = __nccwpck_require__(723);
const sleep_1 = __nccwpck_require__(5668);
const path_1 = __nccwpck_require__(2704);
/**
 * Build Assistants that can call models and use tools.
 *
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
class Runs extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.steps = new StepsAPI.Steps(this._client);
    }
    create(threadID, params, options) {
        const { include, ...body } = params;
        return this._client.post((0, path_1.path) `/threads/${threadID}/runs`, {
            query: { include },
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            stream: params.stream ?? false,
            __synthesizeEventData: true,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves a run.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    retrieve(runID, params, options) {
        const { thread_id } = params;
        return this._client.get((0, path_1.path) `/threads/${thread_id}/runs/${runID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modifies a run.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    update(runID, params, options) {
        const { thread_id, ...body } = params;
        return this._client.post((0, path_1.path) `/threads/${thread_id}/runs/${runID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of runs belonging to a thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    list(threadID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/threads/${threadID}/runs`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancels a run that is `in_progress`.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    cancel(runID, params, options) {
        const { thread_id } = params;
        return this._client.post((0, path_1.path) `/threads/${thread_id}/runs/${runID}/cancel`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * A helper to create a run an poll for a terminal state. More information on Run
     * lifecycles can be found here:
     * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
     */
    async createAndPoll(threadId, body, options) {
        const run = await this.create(threadId, body, options);
        return await this.poll(run.id, { thread_id: threadId }, options);
    }
    /**
     * Create a Run stream
     *
     * @deprecated use `stream` instead
     */
    createAndStream(threadId, body, options) {
        return AssistantStream_1.AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
    }
    /**
     * A helper to poll a run status until it reaches a terminal state. More
     * information on Run lifecycles can be found here:
     * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
     */
    async poll(runId, params, options) {
        const headers = (0, headers_1.buildHeaders)([
            options?.headers,
            {
                'X-Stainless-Poll-Helper': 'true',
                'X-Stainless-Custom-Poll-Interval': options?.pollIntervalMs?.toString() ?? undefined,
            },
        ]);
        while (true) {
            const { data: run, response } = await this.retrieve(runId, params, {
                ...options,
                headers: { ...options?.headers, ...headers },
            }).withResponse();
            switch (run.status) {
                //If we are in any sort of intermediate state we poll
                case 'queued':
                case 'in_progress':
                case 'cancelling':
                    let sleepInterval = 5000;
                    if (options?.pollIntervalMs) {
                        sleepInterval = options.pollIntervalMs;
                    }
                    else {
                        const headerInterval = response.headers.get('openai-poll-after-ms');
                        if (headerInterval) {
                            const headerIntervalMs = parseInt(headerInterval);
                            if (!isNaN(headerIntervalMs)) {
                                sleepInterval = headerIntervalMs;
                            }
                        }
                    }
                    await (0, sleep_1.sleep)(sleepInterval);
                    break;
                //We return the run in any terminal state.
                case 'requires_action':
                case 'incomplete':
                case 'cancelled':
                case 'completed':
                case 'failed':
                case 'expired':
                    return run;
            }
        }
    }
    /**
     * Create a Run stream
     */
    stream(threadId, body, options) {
        return AssistantStream_1.AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
    }
    submitToolOutputs(runID, params, options) {
        const { thread_id, ...body } = params;
        return this._client.post((0, path_1.path) `/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            stream: params.stream ?? false,
            __synthesizeEventData: true,
            __security: { bearerAuth: true },
        });
    }
    /**
     * A helper to submit a tool output to a run and poll for a terminal run state.
     * More information on Run lifecycles can be found here:
     * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
     */
    async submitToolOutputsAndPoll(runId, params, options) {
        const run = await this.submitToolOutputs(runId, params, options);
        return await this.poll(run.id, params, options);
    }
    /**
     * Submit the tool outputs from a previous run and stream the run to a terminal
     * state. More information on Run lifecycles can be found here:
     * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
     */
    submitToolOutputsStream(runId, params, options) {
        return AssistantStream_1.AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
    }
}
exports.Runs = Runs;
Runs.Steps = steps_1.Steps;
//# sourceMappingURL=runs.js.map

/***/ }),

/***/ 9201:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Steps = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
/**
 * Build Assistants that can call models and use tools.
 *
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
class Steps extends resource_1.APIResource {
    /**
     * Retrieves a run step.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    retrieve(stepID, params, options) {
        const { thread_id, run_id, ...query } = params;
        return this._client.get((0, path_1.path) `/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of run steps belonging to a run.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    list(runID, params, options) {
        const { thread_id, ...query } = params;
        return this._client.getAPIList((0, path_1.path) `/threads/${thread_id}/runs/${runID}/steps`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Steps = Steps;
//# sourceMappingURL=steps.js.map

/***/ }),

/***/ 6847:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Threads = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const MessagesAPI = tslib_1.__importStar(__nccwpck_require__(6648));
const messages_1 = __nccwpck_require__(6648);
const RunsAPI = tslib_1.__importStar(__nccwpck_require__(3051));
const runs_1 = __nccwpck_require__(3051);
const headers_1 = __nccwpck_require__(9267);
const AssistantStream_1 = __nccwpck_require__(723);
const path_1 = __nccwpck_require__(2704);
/**
 * Build Assistants that can call models and use tools.
 *
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
class Threads extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.runs = new RunsAPI.Runs(this._client);
        this.messages = new MessagesAPI.Messages(this._client);
    }
    /**
     * Create a thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    create(body = {}, options) {
        return this._client.post('/threads', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves a thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    retrieve(threadID, options) {
        return this._client.get((0, path_1.path) `/threads/${threadID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modifies a thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    update(threadID, body, options) {
        return this._client.post((0, path_1.path) `/threads/${threadID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a thread.
     *
     * @deprecated The Assistants API is deprecated in favor of the Responses API
     */
    delete(threadID, options) {
        return this._client.delete((0, path_1.path) `/threads/${threadID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    createAndRun(body, options) {
        return this._client.post('/threads/runs', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            stream: body.stream ?? false,
            __synthesizeEventData: true,
            __security: { bearerAuth: true },
        });
    }
    /**
     * A helper to create a thread, start a run and then poll for a terminal state.
     * More information on Run lifecycles can be found here:
     * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
     */
    async createAndRunPoll(body, options) {
        const run = await this.createAndRun(body, options);
        return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
    }
    /**
     * Create a thread and stream the run back
     */
    createAndRunStream(body, options) {
        return AssistantStream_1.AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
    }
}
exports.Threads = Threads;
Threads.Runs = runs_1.Runs;
Threads.Messages = messages_1.Messages;
//# sourceMappingURL=threads.js.map

/***/ }),

/***/ 3164:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Chat = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const CompletionsAPI = tslib_1.__importStar(__nccwpck_require__(1963));
const completions_1 = __nccwpck_require__(1963);
class Chat extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.completions = new CompletionsAPI.Completions(this._client);
    }
}
exports.Chat = Chat;
Chat.Completions = completions_1.Completions;
//# sourceMappingURL=chat.js.map

/***/ }),

/***/ 1963:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatCompletionRunner = exports.ChatCompletionStream = exports.ParsingToolFunction = exports.ChatCompletionStreamingRunner = exports.Completions = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const MessagesAPI = tslib_1.__importStar(__nccwpck_require__(7294));
const messages_1 = __nccwpck_require__(7294);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
const ChatCompletionRunner_1 = __nccwpck_require__(2509);
const ChatCompletionStreamingRunner_1 = __nccwpck_require__(997);
const ChatCompletionStream_1 = __nccwpck_require__(3559);
const parser_1 = __nccwpck_require__(1368);
/**
 * Given a list of messages comprising a conversation, the model will return a response.
 */
class Completions extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.messages = new MessagesAPI.Messages(this._client);
    }
    create(body, options) {
        return this._client.post('/chat/completions', {
            body,
            ...options,
            stream: body.stream ?? false,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get a stored chat completion. Only Chat Completions that have been created with
     * the `store` parameter set to `true` will be returned.
     *
     * @example
     * ```ts
     * const chatCompletion =
     *   await client.chat.completions.retrieve('completion_id');
     * ```
     */
    retrieve(completionID, options) {
        return this._client.get((0, path_1.path) `/chat/completions/${completionID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modify a stored chat completion. Only Chat Completions that have been created
     * with the `store` parameter set to `true` can be modified. Currently, the only
     * supported modification is to update the `metadata` field.
     *
     * @example
     * ```ts
     * const chatCompletion = await client.chat.completions.update(
     *   'completion_id',
     *   { metadata: { foo: 'string' } },
     * );
     * ```
     */
    update(completionID, body, options) {
        return this._client.post((0, path_1.path) `/chat/completions/${completionID}`, {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List stored Chat Completions. Only Chat Completions that have been stored with
     * the `store` parameter set to `true` will be returned.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const chatCompletion of client.chat.completions.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/chat/completions', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a stored chat completion. Only Chat Completions that have been created
     * with the `store` parameter set to `true` can be deleted.
     *
     * @example
     * ```ts
     * const chatCompletionDeleted =
     *   await client.chat.completions.delete('completion_id');
     * ```
     */
    delete(completionID, options) {
        return this._client.delete((0, path_1.path) `/chat/completions/${completionID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    parse(body, options) {
        (0, parser_1.validateInputTools)(body.tools);
        return this._client.chat.completions
            .create(body, {
            ...options,
            __metadata: { ...options?.__metadata, helperMethod: 'chat.completions.parse' },
        })
            ._thenUnwrap((completion) => (0, parser_1.parseChatCompletion)(completion, body));
    }
    runTools(body, options) {
        if (body.stream) {
            return ChatCompletionStreamingRunner_1.ChatCompletionStreamingRunner.runTools(this._client, body, options);
        }
        return ChatCompletionRunner_1.ChatCompletionRunner.runTools(this._client, body, options);
    }
    /**
     * Creates a chat completion stream
     */
    stream(body, options) {
        return ChatCompletionStream_1.ChatCompletionStream.createChatCompletion(this._client, body, options);
    }
}
exports.Completions = Completions;
var ChatCompletionStreamingRunner_2 = __nccwpck_require__(997);
Object.defineProperty(exports, "ChatCompletionStreamingRunner", ({ enumerable: true, get: function () { return ChatCompletionStreamingRunner_2.ChatCompletionStreamingRunner; } }));
var RunnableFunction_1 = __nccwpck_require__(9802);
Object.defineProperty(exports, "ParsingToolFunction", ({ enumerable: true, get: function () { return RunnableFunction_1.ParsingToolFunction; } }));
var ChatCompletionStream_2 = __nccwpck_require__(3559);
Object.defineProperty(exports, "ChatCompletionStream", ({ enumerable: true, get: function () { return ChatCompletionStream_2.ChatCompletionStream; } }));
var ChatCompletionRunner_2 = __nccwpck_require__(2509);
Object.defineProperty(exports, "ChatCompletionRunner", ({ enumerable: true, get: function () { return ChatCompletionRunner_2.ChatCompletionRunner; } }));
Completions.Messages = messages_1.Messages;
//# sourceMappingURL=completions.js.map

/***/ }),

/***/ 3768:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Messages = exports.Completions = void 0;
const tslib_1 = __nccwpck_require__(2345);
var completions_1 = __nccwpck_require__(1963);
Object.defineProperty(exports, "Completions", ({ enumerable: true, get: function () { return completions_1.Completions; } }));
tslib_1.__exportStar(__nccwpck_require__(1963), exports);
var messages_1 = __nccwpck_require__(7294);
Object.defineProperty(exports, "Messages", ({ enumerable: true, get: function () { return messages_1.Messages; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 7294:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Messages = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Given a list of messages comprising a conversation, the model will return a response.
 */
class Messages extends resource_1.APIResource {
    /**
     * Get the messages in a stored chat completion. Only Chat Completions that have
     * been created with the `store` parameter set to `true` will be returned.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
     *   'completion_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(completionID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/chat/completions/${completionID}/messages`, (pagination_1.CursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
}
exports.Messages = Messages;
//# sourceMappingURL=messages.js.map

/***/ }),

/***/ 9436:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Completions = exports.Chat = void 0;
var chat_1 = __nccwpck_require__(3164);
Object.defineProperty(exports, "Chat", ({ enumerable: true, get: function () { return chat_1.Chat; } }));
var index_1 = __nccwpck_require__(3768);
Object.defineProperty(exports, "Completions", ({ enumerable: true, get: function () { return index_1.Completions; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 4066:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Completions = void 0;
const resource_1 = __nccwpck_require__(9487);
/**
 * Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
 */
class Completions extends resource_1.APIResource {
    create(body, options) {
        return this._client.post('/completions', {
            body,
            ...options,
            stream: body.stream ?? false,
            __security: { bearerAuth: true },
        });
    }
}
exports.Completions = Completions;
//# sourceMappingURL=completions.js.map

/***/ }),

/***/ 5764:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Containers = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const FilesAPI = tslib_1.__importStar(__nccwpck_require__(8217));
const files_1 = __nccwpck_require__(8217);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Containers extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.files = new FilesAPI.Files(this._client);
    }
    /**
     * Create Container
     */
    create(body, options) {
        return this._client.post('/containers', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Retrieve Container
     */
    retrieve(containerID, options) {
        return this._client.get((0, path_1.path) `/containers/${containerID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List Containers
     */
    list(query = {}, options) {
        return this._client.getAPIList('/containers', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete Container
     */
    delete(containerID, options) {
        return this._client.delete((0, path_1.path) `/containers/${containerID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Containers = Containers;
Containers.Files = files_1.Files;
//# sourceMappingURL=containers.js.map

/***/ }),

/***/ 7479:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Content = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Content extends resource_1.APIResource {
    /**
     * Retrieve Container File Content
     */
    retrieve(fileID, params, options) {
        const { container_id } = params;
        return this._client.get((0, path_1.path) `/containers/${container_id}/files/${fileID}/content`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
}
exports.Content = Content;
//# sourceMappingURL=content.js.map

/***/ }),

/***/ 8217:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Files = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const ContentAPI = tslib_1.__importStar(__nccwpck_require__(7479));
const content_1 = __nccwpck_require__(7479);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
class Files extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.content = new ContentAPI.Content(this._client);
    }
    /**
     * Create a Container File
     *
     * You can send either a multipart/form-data request with the raw file content, or
     * a JSON request with a file ID.
     */
    create(containerID, body, options) {
        return this._client.post((0, path_1.path) `/containers/${containerID}/files`, (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Retrieve Container File
     */
    retrieve(fileID, params, options) {
        const { container_id } = params;
        return this._client.get((0, path_1.path) `/containers/${container_id}/files/${fileID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List Container files
     */
    list(containerID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/containers/${containerID}/files`, (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete Container File
     */
    delete(fileID, params, options) {
        const { container_id } = params;
        return this._client.delete((0, path_1.path) `/containers/${container_id}/files/${fileID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Files = Files;
Files.Content = content_1.Content;
//# sourceMappingURL=files.js.map

/***/ }),

/***/ 2170:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ContentProvenanceChecks = void 0;
const resource_1 = __nccwpck_require__(9487);
const uploads_1 = __nccwpck_require__(5887);
class ContentProvenanceChecks extends resource_1.APIResource {
    /**
     * Check whether an image or audio file contains known OpenAI provenance signals.
     * [Learn more about content provenance](/api/docs/guides/content-provenance).
     *
     * If `not_detected`, it means the tool did not find supported signals in the
     * uploaded file. The content could still have been generated by OpenAI if the
     * metadata was stripped or has evidence of tampering, the watermark was degraded,
     * it comes from a legacy generation model, or it was created before provenance
     * signals were available. Content could also still be AI-generated by another
     * company's model, which the tool currently does not detect.
     */
    create(body, options) {
        return this._client.post('/content_provenance_checks', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
}
exports.ContentProvenanceChecks = ContentProvenanceChecks;
//# sourceMappingURL=content-provenance-checks.js.map

/***/ }),

/***/ 398:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Conversations = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const ItemsAPI = tslib_1.__importStar(__nccwpck_require__(3110));
const items_1 = __nccwpck_require__(3110);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage conversations and conversation items.
 */
class Conversations extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.items = new ItemsAPI.Items(this._client);
    }
    /**
     * Create a conversation.
     */
    create(body = {}, options) {
        return this._client.post('/conversations', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Get a conversation
     */
    retrieve(conversationID, options) {
        return this._client.get((0, path_1.path) `/conversations/${conversationID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Update a conversation
     */
    update(conversationID, body, options) {
        return this._client.post((0, path_1.path) `/conversations/${conversationID}`, {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a conversation. Items in the conversation will not be deleted.
     */
    delete(conversationID, options) {
        return this._client.delete((0, path_1.path) `/conversations/${conversationID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Conversations = Conversations;
Conversations.Items = items_1.Items;
//# sourceMappingURL=conversations.js.map

/***/ }),

/***/ 3110:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Items = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage conversations and conversation items.
 */
class Items extends resource_1.APIResource {
    /**
     * Create items in a conversation with the given ID.
     */
    create(conversationID, params, options) {
        const { include, ...body } = params;
        return this._client.post((0, path_1.path) `/conversations/${conversationID}/items`, {
            query: { include },
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get a single item from a conversation with the given IDs.
     */
    retrieve(itemID, params, options) {
        const { conversation_id, ...query } = params;
        return this._client.get((0, path_1.path) `/conversations/${conversation_id}/items/${itemID}`, {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List all items for a conversation with the given ID.
     */
    list(conversationID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/conversations/${conversationID}/items`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Delete an item from a conversation with the given IDs.
     */
    delete(itemID, params, options) {
        const { conversation_id } = params;
        return this._client.delete((0, path_1.path) `/conversations/${conversation_id}/items/${itemID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Items = Items;
//# sourceMappingURL=items.js.map

/***/ }),

/***/ 7435:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Embeddings = void 0;
const resource_1 = __nccwpck_require__(9487);
const utils_1 = __nccwpck_require__(2152);
/**
 * Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
 */
class Embeddings extends resource_1.APIResource {
    create(body, options) {
        const hasUserProvidedEncodingFormat = !!body.encoding_format;
        // No encoding_format specified, defaulting to base64 for performance reasons
        // See https://github.com/openai/openai-node/pull/1312
        let encoding_format = hasUserProvidedEncodingFormat
            ? body.encoding_format
            : 'base64';
        if (hasUserProvidedEncodingFormat) {
            (0, utils_1.loggerFor)(this._client).debug('embeddings/user defined encoding_format:', body.encoding_format);
        }
        const response = this._client.post('/embeddings', {
            body: {
                ...body,
                encoding_format: encoding_format,
            },
            ...options,
            __security: { bearerAuth: true },
        });
        // if the user specified an encoding_format, return the response as-is
        if (hasUserProvidedEncodingFormat) {
            return response;
        }
        // in this stage, we are sure the user did not specify an encoding_format
        // and we defaulted to base64 for performance reasons
        // we are sure then that the response is base64 encoded, let's decode it
        // the returned result will be a float32 array since this is OpenAI API's default encoding
        (0, utils_1.loggerFor)(this._client).debug('embeddings/decoding base64 embeddings from base64');
        return response._thenUnwrap((response) => {
            if (response && response.data) {
                response.data.forEach((embeddingBase64Obj) => {
                    const embeddingBase64Str = embeddingBase64Obj.embedding;
                    embeddingBase64Obj.embedding = (0, utils_1.toFloat32Array)(embeddingBase64Str);
                });
            }
            return response;
        });
    }
}
exports.Embeddings = Embeddings;
//# sourceMappingURL=embeddings.js.map

/***/ }),

/***/ 4466:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Evals = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const RunsAPI = tslib_1.__importStar(__nccwpck_require__(2908));
const runs_1 = __nccwpck_require__(2908);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage and run evals in the OpenAI platform.
 */
class Evals extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.runs = new RunsAPI.Runs(this._client);
    }
    /**
     * Create the structure of an evaluation that can be used to test a model's
     * performance. An evaluation is a set of testing criteria and the config for a
     * data source, which dictates the schema of the data used in the evaluation. After
     * creating an evaluation, you can run it on different models and model parameters.
     * We support several types of graders and datasources. For more information, see
     * the [Evals guide](https://platform.openai.com/docs/guides/evals).
     */
    create(body, options) {
        return this._client.post('/evals', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Get an evaluation by ID.
     */
    retrieve(evalID, options) {
        return this._client.get((0, path_1.path) `/evals/${evalID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Update certain properties of an evaluation.
     */
    update(evalID, body, options) {
        return this._client.post((0, path_1.path) `/evals/${evalID}`, { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * List evaluations for a project.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/evals', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete an evaluation.
     */
    delete(evalID, options) {
        return this._client.delete((0, path_1.path) `/evals/${evalID}`, { ...options, __security: { bearerAuth: true } });
    }
}
exports.Evals = Evals;
Evals.Runs = runs_1.Runs;
//# sourceMappingURL=evals.js.map

/***/ }),

/***/ 6394:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OutputItems = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage and run evals in the OpenAI platform.
 */
class OutputItems extends resource_1.APIResource {
    /**
     * Get an evaluation run output item by ID.
     */
    retrieve(outputItemID, params, options) {
        const { eval_id, run_id } = params;
        return this._client.get((0, path_1.path) `/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get a list of output items for an evaluation run.
     */
    list(runID, params, options) {
        const { eval_id, ...query } = params;
        return this._client.getAPIList((0, path_1.path) `/evals/${eval_id}/runs/${runID}/output_items`, (pagination_1.CursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
}
exports.OutputItems = OutputItems;
//# sourceMappingURL=output-items.js.map

/***/ }),

/***/ 2908:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Runs = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const OutputItemsAPI = tslib_1.__importStar(__nccwpck_require__(6394));
const output_items_1 = __nccwpck_require__(6394);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage and run evals in the OpenAI platform.
 */
class Runs extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.outputItems = new OutputItemsAPI.OutputItems(this._client);
    }
    /**
     * Kicks off a new run for a given evaluation, specifying the data source, and what
     * model configuration to use to test. The datasource will be validated against the
     * schema specified in the config of the evaluation.
     */
    create(evalID, body, options) {
        return this._client.post((0, path_1.path) `/evals/${evalID}/runs`, {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get an evaluation run by ID.
     */
    retrieve(runID, params, options) {
        const { eval_id } = params;
        return this._client.get((0, path_1.path) `/evals/${eval_id}/runs/${runID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get a list of runs for an evaluation.
     */
    list(evalID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/evals/${evalID}/runs`, (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete an eval run.
     */
    delete(runID, params, options) {
        const { eval_id } = params;
        return this._client.delete((0, path_1.path) `/evals/${eval_id}/runs/${runID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancel an ongoing evaluation run.
     */
    cancel(runID, params, options) {
        const { eval_id } = params;
        return this._client.post((0, path_1.path) `/evals/${eval_id}/runs/${runID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Runs = Runs;
Runs.OutputItems = output_items_1.OutputItems;
//# sourceMappingURL=runs.js.map

/***/ }),

/***/ 9230:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Files = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const sleep_1 = __nccwpck_require__(5668);
const error_1 = __nccwpck_require__(3269);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
/**
 * Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
 */
class Files extends resource_1.APIResource {
    /**
     * Upload a file that can be used across various endpoints. Individual files can be
     * up to 512 MB, and each project can store up to 2.5 TB of files in total. There
     * is no organization-wide storage limit. Uploads to this endpoint are rate-limited
     * to 1,000 requests per minute per authenticated user.
     *
     * - The Assistants API supports files up to 2 million tokens and of specific file
     *   types. See the
     *   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
     *   for details.
     * - The Fine-tuning API only supports `.jsonl` files. The input also has certain
     *   required formats for fine-tuning
     *   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
     *   or
     *   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
     *   models.
     * - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
     *   also has a specific required
     *   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
     * - For Retrieval or `file_search` ingestion, upload files here first. If you need
     *   to attach multiple uploaded files to the same vector store, use
     *   [`/vector_stores/{vector_store_id}/file_batches`](https://platform.openai.com/docs/api-reference/vector-stores-file-batches/createBatch)
     *   instead of attaching them one by one. Vector store attachment has separate
     *   limits from file upload, including 2,000 attached files per minute per
     *   organization.
     *
     * Please [contact us](https://help.openai.com/) if you need to increase these
     * storage limits.
     */
    create(body, options) {
        return this._client.post('/files', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Returns information about a specific file.
     */
    retrieve(fileID, options) {
        return this._client.get((0, path_1.path) `/files/${fileID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Returns a list of files.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/files', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a file and remove it from all vector stores.
     */
    delete(fileID, options) {
        return this._client.delete((0, path_1.path) `/files/${fileID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Returns a response containing the contents of the specified file.
     */
    content(fileID, options) {
        return this._client.get((0, path_1.path) `/files/${fileID}/content`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
    /**
     * Waits for the given file to be processed, default timeout is 30 mins.
     */
    async waitForProcessing(id, { pollInterval = 5000, maxWait = 30 * 60 * 1000 } = {}) {
        const TERMINAL_STATES = new Set(['processed', 'error', 'deleted']);
        const start = Date.now();
        let file = await this.retrieve(id);
        while (!file.status || !TERMINAL_STATES.has(file.status)) {
            await (0, sleep_1.sleep)(pollInterval);
            file = await this.retrieve(id);
            if (Date.now() - start > maxWait) {
                throw new error_1.APIConnectionTimeoutError({
                    message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`,
                });
            }
        }
        return file;
    }
}
exports.Files = Files;
//# sourceMappingURL=files.js.map

/***/ }),

/***/ 1235:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Alpha = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const GradersAPI = tslib_1.__importStar(__nccwpck_require__(5651));
const graders_1 = __nccwpck_require__(5651);
class Alpha extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.graders = new GradersAPI.Graders(this._client);
    }
}
exports.Alpha = Alpha;
Alpha.Graders = graders_1.Graders;
//# sourceMappingURL=alpha.js.map

/***/ }),

/***/ 5651:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Graders = void 0;
const resource_1 = __nccwpck_require__(9487);
/**
 * Manage fine-tuning jobs to tailor a model to your specific training data.
 */
class Graders extends resource_1.APIResource {
    /**
     * Run a grader.
     *
     * @example
     * ```ts
     * const response = await client.fineTuning.alpha.graders.run({
     *   grader: {
     *     input: 'input',
     *     name: 'name',
     *     operation: 'eq',
     *     reference: 'reference',
     *     type: 'string_check',
     *   },
     *   model_sample: 'model_sample',
     * });
     * ```
     */
    run(body, options) {
        return this._client.post('/fine_tuning/alpha/graders/run', {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Validate a grader.
     *
     * @example
     * ```ts
     * const response =
     *   await client.fineTuning.alpha.graders.validate({
     *     grader: {
     *       input: 'input',
     *       name: 'name',
     *       operation: 'eq',
     *       reference: 'reference',
     *       type: 'string_check',
     *     },
     *   });
     * ```
     */
    validate(body, options) {
        return this._client.post('/fine_tuning/alpha/graders/validate', {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Graders = Graders;
//# sourceMappingURL=graders.js.map

/***/ }),

/***/ 9995:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Checkpoints = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const PermissionsAPI = tslib_1.__importStar(__nccwpck_require__(7432));
const permissions_1 = __nccwpck_require__(7432);
class Checkpoints extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.permissions = new PermissionsAPI.Permissions(this._client);
    }
}
exports.Checkpoints = Checkpoints;
Checkpoints.Permissions = permissions_1.Permissions;
//# sourceMappingURL=checkpoints.js.map

/***/ }),

/***/ 7432:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Permissions = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage fine-tuning jobs to tailor a model to your specific training data.
 */
class Permissions extends resource_1.APIResource {
    /**
     * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
     *
     * This enables organization owners to share fine-tuned models with other projects
     * in their organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
     *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
     *   { project_ids: ['string'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    create(fineTunedModelCheckpoint, body, options) {
        return this._client.getAPIList((0, path_1.path) `/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, (pagination_1.Page), { body, method: 'post', ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
     *
     * Organization owners can use this endpoint to view all permissions for a
     * fine-tuned model checkpoint.
     *
     * @deprecated Retrieve is deprecated. Please swap to the paginated list method instead.
     */
    retrieve(fineTunedModelCheckpoint, query = {}, options) {
        return this._client.get((0, path_1.path) `/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
            query,
            ...options,
            __security: { adminAPIKeyAuth: true },
        });
    }
    /**
     * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
     *
     * Organization owners can use this endpoint to view all permissions for a
     * fine-tuned model checkpoint.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const permissionListResponse of client.fineTuning.checkpoints.permissions.list(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(fineTunedModelCheckpoint, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, (pagination_1.ConversationCursorPage), { query, ...options, __security: { adminAPIKeyAuth: true } });
    }
    /**
     * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
     *
     * Organization owners can use this endpoint to delete a permission for a
     * fine-tuned model checkpoint.
     *
     * @example
     * ```ts
     * const permission =
     *   await client.fineTuning.checkpoints.permissions.delete(
     *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
     *     {
     *       fine_tuned_model_checkpoint:
     *         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
     *     },
     *   );
     * ```
     */
    delete(permissionID, params, options) {
        const { fine_tuned_model_checkpoint } = params;
        return this._client.delete((0, path_1.path) `/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, { ...options, __security: { adminAPIKeyAuth: true } });
    }
}
exports.Permissions = Permissions;
//# sourceMappingURL=permissions.js.map

/***/ }),

/***/ 198:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FineTuning = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const MethodsAPI = tslib_1.__importStar(__nccwpck_require__(838));
const methods_1 = __nccwpck_require__(838);
const AlphaAPI = tslib_1.__importStar(__nccwpck_require__(1235));
const alpha_1 = __nccwpck_require__(1235);
const CheckpointsAPI = tslib_1.__importStar(__nccwpck_require__(9995));
const checkpoints_1 = __nccwpck_require__(9995);
const JobsAPI = tslib_1.__importStar(__nccwpck_require__(1757));
const jobs_1 = __nccwpck_require__(1757);
class FineTuning extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.methods = new MethodsAPI.Methods(this._client);
        this.jobs = new JobsAPI.Jobs(this._client);
        this.checkpoints = new CheckpointsAPI.Checkpoints(this._client);
        this.alpha = new AlphaAPI.Alpha(this._client);
    }
}
exports.FineTuning = FineTuning;
FineTuning.Methods = methods_1.Methods;
FineTuning.Jobs = jobs_1.Jobs;
FineTuning.Checkpoints = checkpoints_1.Checkpoints;
FineTuning.Alpha = alpha_1.Alpha;
//# sourceMappingURL=fine-tuning.js.map

/***/ }),

/***/ 590:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Checkpoints = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage fine-tuning jobs to tailor a model to your specific training data.
 */
class Checkpoints extends resource_1.APIResource {
    /**
     * List checkpoints for a fine-tuning job.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(fineTuningJobID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, (pagination_1.CursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
}
exports.Checkpoints = Checkpoints;
//# sourceMappingURL=checkpoints.js.map

/***/ }),

/***/ 1757:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Jobs = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const CheckpointsAPI = tslib_1.__importStar(__nccwpck_require__(590));
const checkpoints_1 = __nccwpck_require__(590);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * Manage fine-tuning jobs to tailor a model to your specific training data.
 */
class Jobs extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.checkpoints = new CheckpointsAPI.Checkpoints(this._client);
    }
    /**
     * Creates a fine-tuning job which begins the process of creating a new model from
     * a given dataset.
     *
     * Response includes details of the enqueued job including job status and the name
     * of the fine-tuned models once complete.
     *
     * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
     *
     * @example
     * ```ts
     * const fineTuningJob = await client.fineTuning.jobs.create({
     *   model: 'gpt-4o-mini',
     *   training_file: 'file-abc123',
     * });
     * ```
     */
    create(body, options) {
        return this._client.post('/fine_tuning/jobs', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Get info about a fine-tuning job.
     *
     * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
     *
     * @example
     * ```ts
     * const fineTuningJob = await client.fineTuning.jobs.retrieve(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * );
     * ```
     */
    retrieve(fineTuningJobID, options) {
        return this._client.get((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List your organization's fine-tuning jobs
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const fineTuningJob of client.fineTuning.jobs.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/fine_tuning/jobs', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Immediately cancel a fine-tune job.
     *
     * @example
     * ```ts
     * const fineTuningJob = await client.fineTuning.jobs.cancel(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * );
     * ```
     */
    cancel(fineTuningJobID, options) {
        return this._client.post((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}/cancel`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Get status updates for a fine-tuning job.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * )) {
     *   // ...
     * }
     * ```
     */
    listEvents(fineTuningJobID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}/events`, (pagination_1.CursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Pause a fine-tune job.
     *
     * @example
     * ```ts
     * const fineTuningJob = await client.fineTuning.jobs.pause(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * );
     * ```
     */
    pause(fineTuningJobID, options) {
        return this._client.post((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}/pause`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Resume a fine-tune job.
     *
     * @example
     * ```ts
     * const fineTuningJob = await client.fineTuning.jobs.resume(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * );
     * ```
     */
    resume(fineTuningJobID, options) {
        return this._client.post((0, path_1.path) `/fine_tuning/jobs/${fineTuningJobID}/resume`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Jobs = Jobs;
Jobs.Checkpoints = checkpoints_1.Checkpoints;
//# sourceMappingURL=jobs.js.map

/***/ }),

/***/ 838:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Methods = void 0;
const resource_1 = __nccwpck_require__(9487);
class Methods extends resource_1.APIResource {
}
exports.Methods = Methods;
//# sourceMappingURL=methods.js.map

/***/ }),

/***/ 7406:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GraderModels = void 0;
const resource_1 = __nccwpck_require__(9487);
class GraderModels extends resource_1.APIResource {
}
exports.GraderModels = GraderModels;
//# sourceMappingURL=grader-models.js.map

/***/ }),

/***/ 7882:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Graders = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const GraderModelsAPI = tslib_1.__importStar(__nccwpck_require__(7406));
const grader_models_1 = __nccwpck_require__(7406);
class Graders extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.graderModels = new GraderModelsAPI.GraderModels(this._client);
    }
}
exports.Graders = Graders;
Graders.GraderModels = grader_models_1.GraderModels;
//# sourceMappingURL=graders.js.map

/***/ }),

/***/ 1395:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Images = void 0;
const resource_1 = __nccwpck_require__(9487);
const uploads_1 = __nccwpck_require__(5887);
/**
 * Given a prompt and/or an input image, the model will generate a new image.
 */
class Images extends resource_1.APIResource {
    /**
     * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
     *
     * @example
     * ```ts
     * const imagesResponse = await client.images.createVariation({
     *   image: fs.createReadStream('otter.png'),
     * });
     * ```
     */
    createVariation(body, options) {
        return this._client.post('/images/variations', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    edit(body, options) {
        return this._client.post('/images/edits', (0, uploads_1.multipartFormRequestOptions)({
            body,
            ...options,
            stream: body.stream ?? false,
            __metadata: { ...options?.__metadata, ...(body.model == null ? {} : { model: body.model }) },
            __security: { bearerAuth: true },
        }, this._client));
    }
    generate(body, options) {
        return this._client.post('/images/generations', {
            body,
            ...options,
            stream: body.stream ?? false,
            __security: { bearerAuth: true },
        });
    }
}
exports.Images = Images;
//# sourceMappingURL=images.js.map

/***/ }),

/***/ 6889:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Webhooks = exports.Videos = exports.VectorStores = exports.Uploads = exports.Skills = exports.Responses = exports.Realtime = exports.Moderations = exports.Models = exports.Images = exports.Graders = exports.FineTuning = exports.Files = exports.Evals = exports.Embeddings = exports.Conversations = exports.ContentProvenanceChecks = exports.Containers = exports.Completions = exports.Beta = exports.Batches = exports.Audio = exports.Admin = void 0;
const tslib_1 = __nccwpck_require__(2345);
tslib_1.__exportStar(__nccwpck_require__(9436), exports);
tslib_1.__exportStar(__nccwpck_require__(156), exports);
var admin_1 = __nccwpck_require__(8874);
Object.defineProperty(exports, "Admin", ({ enumerable: true, get: function () { return admin_1.Admin; } }));
var audio_1 = __nccwpck_require__(3638);
Object.defineProperty(exports, "Audio", ({ enumerable: true, get: function () { return audio_1.Audio; } }));
var batches_1 = __nccwpck_require__(257);
Object.defineProperty(exports, "Batches", ({ enumerable: true, get: function () { return batches_1.Batches; } }));
var beta_1 = __nccwpck_require__(8852);
Object.defineProperty(exports, "Beta", ({ enumerable: true, get: function () { return beta_1.Beta; } }));
var completions_1 = __nccwpck_require__(4066);
Object.defineProperty(exports, "Completions", ({ enumerable: true, get: function () { return completions_1.Completions; } }));
var containers_1 = __nccwpck_require__(5764);
Object.defineProperty(exports, "Containers", ({ enumerable: true, get: function () { return containers_1.Containers; } }));
var content_provenance_checks_1 = __nccwpck_require__(2170);
Object.defineProperty(exports, "ContentProvenanceChecks", ({ enumerable: true, get: function () { return content_provenance_checks_1.ContentProvenanceChecks; } }));
var conversations_1 = __nccwpck_require__(398);
Object.defineProperty(exports, "Conversations", ({ enumerable: true, get: function () { return conversations_1.Conversations; } }));
var embeddings_1 = __nccwpck_require__(7435);
Object.defineProperty(exports, "Embeddings", ({ enumerable: true, get: function () { return embeddings_1.Embeddings; } }));
var evals_1 = __nccwpck_require__(4466);
Object.defineProperty(exports, "Evals", ({ enumerable: true, get: function () { return evals_1.Evals; } }));
var files_1 = __nccwpck_require__(9230);
Object.defineProperty(exports, "Files", ({ enumerable: true, get: function () { return files_1.Files; } }));
var fine_tuning_1 = __nccwpck_require__(198);
Object.defineProperty(exports, "FineTuning", ({ enumerable: true, get: function () { return fine_tuning_1.FineTuning; } }));
var graders_1 = __nccwpck_require__(7882);
Object.defineProperty(exports, "Graders", ({ enumerable: true, get: function () { return graders_1.Graders; } }));
var images_1 = __nccwpck_require__(1395);
Object.defineProperty(exports, "Images", ({ enumerable: true, get: function () { return images_1.Images; } }));
var models_1 = __nccwpck_require__(2123);
Object.defineProperty(exports, "Models", ({ enumerable: true, get: function () { return models_1.Models; } }));
var moderations_1 = __nccwpck_require__(8328);
Object.defineProperty(exports, "Moderations", ({ enumerable: true, get: function () { return moderations_1.Moderations; } }));
var realtime_1 = __nccwpck_require__(2778);
Object.defineProperty(exports, "Realtime", ({ enumerable: true, get: function () { return realtime_1.Realtime; } }));
var responses_1 = __nccwpck_require__(1470);
Object.defineProperty(exports, "Responses", ({ enumerable: true, get: function () { return responses_1.Responses; } }));
var skills_1 = __nccwpck_require__(4220);
Object.defineProperty(exports, "Skills", ({ enumerable: true, get: function () { return skills_1.Skills; } }));
var uploads_1 = __nccwpck_require__(9962);
Object.defineProperty(exports, "Uploads", ({ enumerable: true, get: function () { return uploads_1.Uploads; } }));
var vector_stores_1 = __nccwpck_require__(9494);
Object.defineProperty(exports, "VectorStores", ({ enumerable: true, get: function () { return vector_stores_1.VectorStores; } }));
var videos_1 = __nccwpck_require__(193);
Object.defineProperty(exports, "Videos", ({ enumerable: true, get: function () { return videos_1.Videos; } }));
var webhooks_1 = __nccwpck_require__(5143);
Object.defineProperty(exports, "Webhooks", ({ enumerable: true, get: function () { return webhooks_1.Webhooks; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 2123:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Models = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
/**
 * List and describe the various models available in the API.
 */
class Models extends resource_1.APIResource {
    /**
     * Retrieves a model instance, providing basic information about the model such as
     * the owner and permissioning.
     */
    retrieve(model, options) {
        return this._client.get((0, path_1.path) `/models/${model}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Lists the currently available models, and provides basic information about each
     * one such as the owner and availability.
     */
    list(options) {
        return this._client.getAPIList('/models', (pagination_1.Page), { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Delete a fine-tuned model. You must have the Owner role in your organization to
     * delete a model.
     */
    delete(model, options) {
        return this._client.delete((0, path_1.path) `/models/${model}`, { ...options, __security: { bearerAuth: true } });
    }
}
exports.Models = Models;
//# sourceMappingURL=models.js.map

/***/ }),

/***/ 8328:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Moderations = void 0;
const resource_1 = __nccwpck_require__(9487);
/**
 * Given text and/or image inputs, classifies if those inputs are potentially harmful.
 */
class Moderations extends resource_1.APIResource {
    /**
     * Classifies if text and/or image inputs are potentially harmful. Learn more in
     * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
     */
    create(body, options) {
        return this._client.post('/moderations', { body, ...options, __security: { bearerAuth: true } });
    }
}
exports.Moderations = Moderations;
//# sourceMappingURL=moderations.js.map

/***/ }),

/***/ 8430:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Calls = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Calls extends resource_1.APIResource {
    /**
     * Accept an incoming SIP call and configure the realtime session that will handle
     * it.
     *
     * @example
     * ```ts
     * await client.realtime.calls.accept('call_id', {
     *   type: 'realtime',
     * });
     * ```
     */
    accept(callID, body, options) {
        return this._client.post((0, path_1.path) `/realtime/calls/${callID}/accept`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * End an active Realtime API call, whether it was initiated over SIP or WebRTC.
     *
     * @example
     * ```ts
     * await client.realtime.calls.hangup('call_id');
     * ```
     */
    hangup(callID, options) {
        return this._client.post((0, path_1.path) `/realtime/calls/${callID}/hangup`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Transfer an active SIP call to a new destination using the SIP REFER verb.
     *
     * @example
     * ```ts
     * await client.realtime.calls.refer('call_id', {
     *   target_uri: 'tel:+14155550123',
     * });
     * ```
     */
    refer(callID, body, options) {
        return this._client.post((0, path_1.path) `/realtime/calls/${callID}/refer`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Decline an incoming SIP call by returning a SIP status code to the caller.
     *
     * @example
     * ```ts
     * await client.realtime.calls.reject('call_id');
     * ```
     */
    reject(callID, body = {}, options) {
        return this._client.post((0, path_1.path) `/realtime/calls/${callID}/reject`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Calls = Calls;
//# sourceMappingURL=calls.js.map

/***/ }),

/***/ 2320:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ClientSecrets = void 0;
const resource_1 = __nccwpck_require__(9487);
class ClientSecrets extends resource_1.APIResource {
    /**
     * Create a Realtime client secret with an associated session configuration.
     *
     * Client secrets are short-lived tokens that can be passed to a client app, such
     * as a web frontend or mobile client, which grants access to the Realtime API
     * without leaking your main API key. You can configure a custom TTL for each
     * client secret.
     *
     * You can also attach session configuration options to the client secret, which
     * will be applied to any sessions created using that client secret, but these can
     * also be overridden by the client connection.
     *
     * [Learn more about authentication with client secrets over WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc).
     *
     * Returns the created client secret and the effective session object. The client
     * secret is a string that looks like `ek_1234`.
     *
     * @example
     * ```ts
     * const clientSecret =
     *   await client.realtime.clientSecrets.create();
     * ```
     */
    create(body, options) {
        return this._client.post('/realtime/client_secrets', {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.ClientSecrets = ClientSecrets;
//# sourceMappingURL=client-secrets.js.map

/***/ }),

/***/ 2778:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Realtime = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const CallsAPI = tslib_1.__importStar(__nccwpck_require__(8430));
const calls_1 = __nccwpck_require__(8430);
const ClientSecretsAPI = tslib_1.__importStar(__nccwpck_require__(2320));
const client_secrets_1 = __nccwpck_require__(2320);
class Realtime extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.clientSecrets = new ClientSecretsAPI.ClientSecrets(this._client);
        this.calls = new CallsAPI.Calls(this._client);
    }
}
exports.Realtime = Realtime;
Realtime.ClientSecrets = client_secrets_1.ClientSecrets;
Realtime.Calls = calls_1.Calls;
//# sourceMappingURL=realtime.js.map

/***/ }),

/***/ 2915:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InputItems = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const path_1 = __nccwpck_require__(2704);
class InputItems extends resource_1.APIResource {
    /**
     * Returns a list of input items for a given response.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const responseItem of client.responses.inputItems.list(
     *   'response_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(responseID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/responses/${responseID}/input_items`, (pagination_1.CursorPage), { query, ...options, __security: { bearerAuth: true } });
    }
}
exports.InputItems = InputItems;
//# sourceMappingURL=input-items.js.map

/***/ }),

/***/ 2989:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InputTokens = void 0;
const resource_1 = __nccwpck_require__(9487);
class InputTokens extends resource_1.APIResource {
    /**
     * Returns input token counts of the request.
     *
     * Returns an object with `object` set to `response.input_tokens` and an
     * `input_tokens` count.
     *
     * @example
     * ```ts
     * const response = await client.responses.inputTokens.count();
     * ```
     */
    count(body = {}, options) {
        return this._client.post('/responses/input_tokens', {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.InputTokens = InputTokens;
//# sourceMappingURL=input-tokens.js.map

/***/ }),

/***/ 1470:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Responses = void 0;
const tslib_1 = __nccwpck_require__(2345);
const ResponsesParser_1 = __nccwpck_require__(3980);
const ResponseStream_1 = __nccwpck_require__(9977);
const resource_1 = __nccwpck_require__(9487);
const InputItemsAPI = tslib_1.__importStar(__nccwpck_require__(2915));
const input_items_1 = __nccwpck_require__(2915);
const InputTokensAPI = tslib_1.__importStar(__nccwpck_require__(2989));
const input_tokens_1 = __nccwpck_require__(2989);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Responses extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.inputItems = new InputItemsAPI.InputItems(this._client);
        this.inputTokens = new InputTokensAPI.InputTokens(this._client);
    }
    create(body, options) {
        return this._client.post('/responses', {
            body,
            ...options,
            stream: body.stream ?? false,
            __security: { bearerAuth: true },
        })._thenUnwrap((rsp) => {
            if ('object' in rsp && rsp.object === 'response') {
                (0, ResponsesParser_1.addOutputText)(rsp);
            }
            return rsp;
        });
    }
    retrieve(responseID, query = {}, options) {
        return this._client.get((0, path_1.path) `/responses/${responseID}`, {
            query,
            ...options,
            stream: query?.stream ?? false,
            __security: { bearerAuth: true },
        })._thenUnwrap((rsp) => {
            if ('object' in rsp && rsp.object === 'response') {
                (0, ResponsesParser_1.addOutputText)(rsp);
            }
            return rsp;
        });
    }
    /**
     * Deletes a model response with the given ID.
     *
     * @example
     * ```ts
     * await client.responses.delete(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    delete(responseID, options) {
        return this._client.delete((0, path_1.path) `/responses/${responseID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    parse(body, options) {
        return this._client.responses
            .create(body, options)
            ._thenUnwrap((response) => (0, ResponsesParser_1.parseResponse)(response, body));
    }
    /**
     * Creates a model response stream
     */
    stream(body, options) {
        return ResponseStream_1.ResponseStream.createResponse(this._client, body, options);
    }
    /**
     * Cancels a model response with the given ID. Only responses created with the
     * `background` parameter set to `true` can be cancelled.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     *
     * @example
     * ```ts
     * const response = await client.responses.cancel(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    cancel(responseID, options) {
        return this._client.post((0, path_1.path) `/responses/${responseID}/cancel`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Compact a conversation. Returns a compacted response object.
     *
     * Learn when and how to compact long-running conversations in the
     * [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
     * For ZDR-compatible compaction details, see
     * [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
     *
     * @example
     * ```ts
     * const compactedResponse = await client.responses.compact({
     *   model: 'gpt-5.6-sol',
     * });
     * ```
     */
    compact(body, options) {
        return this._client.post('/responses/compact', { body, ...options, __security: { bearerAuth: true } });
    }
}
exports.Responses = Responses;
Responses.InputItems = input_items_1.InputItems;
Responses.InputTokens = input_tokens_1.InputTokens;
//# sourceMappingURL=responses.js.map

/***/ }),

/***/ 156:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=shared.js.map

/***/ }),

/***/ 5165:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Content = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Content extends resource_1.APIResource {
    /**
     * Download a skill zip bundle by its ID.
     */
    retrieve(skillID, options) {
        return this._client.get((0, path_1.path) `/skills/${skillID}/content`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
}
exports.Content = Content;
//# sourceMappingURL=content.js.map

/***/ }),

/***/ 4220:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Skills = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const ContentAPI = tslib_1.__importStar(__nccwpck_require__(5165));
const content_1 = __nccwpck_require__(5165);
const VersionsAPI = tslib_1.__importStar(__nccwpck_require__(6479));
const versions_1 = __nccwpck_require__(6479);
const pagination_1 = __nccwpck_require__(2155);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
class Skills extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.content = new ContentAPI.Content(this._client);
        this.versions = new VersionsAPI.Versions(this._client);
    }
    /**
     * Create a new skill.
     */
    create(body = {}, options) {
        return this._client.post('/skills', (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client, {
            stripFilenames: false,
        }));
    }
    /**
     * Get a skill by its ID.
     */
    retrieve(skillID, options) {
        return this._client.get((0, path_1.path) `/skills/${skillID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Update the default version pointer for a skill.
     */
    update(skillID, body, options) {
        return this._client.post((0, path_1.path) `/skills/${skillID}`, {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List all skills for the current project.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/skills', (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a skill by its ID.
     */
    delete(skillID, options) {
        return this._client.delete((0, path_1.path) `/skills/${skillID}`, { ...options, __security: { bearerAuth: true } });
    }
}
exports.Skills = Skills;
Skills.Content = content_1.Content;
Skills.Versions = versions_1.Versions;
//# sourceMappingURL=skills.js.map

/***/ }),

/***/ 7025:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Content = void 0;
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class Content extends resource_1.APIResource {
    /**
     * Download a skill version zip bundle.
     */
    retrieve(version, params, options) {
        const { skill_id } = params;
        return this._client.get((0, path_1.path) `/skills/${skill_id}/versions/${version}/content`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
}
exports.Content = Content;
//# sourceMappingURL=content.js.map

/***/ }),

/***/ 6479:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Versions = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const ContentAPI = tslib_1.__importStar(__nccwpck_require__(7025));
const content_1 = __nccwpck_require__(7025);
const pagination_1 = __nccwpck_require__(2155);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
class Versions extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.content = new ContentAPI.Content(this._client);
    }
    /**
     * Create a new immutable skill version.
     */
    create(skillID, body = {}, options) {
        return this._client.post((0, path_1.path) `/skills/${skillID}/versions`, (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client, {
            stripFilenames: false,
        }));
    }
    /**
     * Get a specific skill version.
     */
    retrieve(version, params, options) {
        const { skill_id } = params;
        return this._client.get((0, path_1.path) `/skills/${skill_id}/versions/${version}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * List skill versions for a skill.
     */
    list(skillID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/skills/${skillID}/versions`, (pagination_1.CursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a skill version.
     */
    delete(version, params, options) {
        const { skill_id } = params;
        return this._client.delete((0, path_1.path) `/skills/${skill_id}/versions/${version}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Versions = Versions;
Versions.Content = content_1.Content;
//# sourceMappingURL=versions.js.map

/***/ }),

/***/ 2066:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Parts = void 0;
const resource_1 = __nccwpck_require__(9487);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
/**
 * Use Uploads to upload large files in multiple parts.
 */
class Parts extends resource_1.APIResource {
    /**
     * Adds a
     * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
     * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
     * A Part represents a chunk of bytes from the file you are trying to upload.
     *
     * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
     * maximum of 8 GB.
     *
     * It is possible to add multiple Parts in parallel. You can decide the intended
     * order of the Parts when you
     * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
     */
    create(uploadID, body, options) {
        return this._client.post((0, path_1.path) `/uploads/${uploadID}/parts`, (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
}
exports.Parts = Parts;
//# sourceMappingURL=parts.js.map

/***/ }),

/***/ 9962:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Uploads = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const PartsAPI = tslib_1.__importStar(__nccwpck_require__(2066));
const parts_1 = __nccwpck_require__(2066);
const path_1 = __nccwpck_require__(2704);
/**
 * Use Uploads to upload large files in multiple parts.
 */
class Uploads extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.parts = new PartsAPI.Parts(this._client);
    }
    /**
     * Creates an intermediate
     * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
     * that you can add
     * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
     * Currently, an Upload can accept at most 8 GB in total and expires after an hour
     * after you create it.
     *
     * Once you complete the Upload, we will create a
     * [File](https://platform.openai.com/docs/api-reference/files/object) object that
     * contains all the parts you uploaded. This File is usable in the rest of our
     * platform as a regular File object.
     *
     * For certain `purpose` values, the correct `mime_type` must be specified. Please
     * refer to documentation for the
     * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
     *
     * For guidance on the proper filename extensions for each purpose, please follow
     * the documentation on
     * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
     *
     * Returns the Upload object with status `pending`.
     */
    create(body, options) {
        return this._client.post('/uploads', { body, ...options, __security: { bearerAuth: true } });
    }
    /**
     * Cancels the Upload. No Parts may be added after an Upload is cancelled.
     *
     * Returns the Upload object with status `cancelled`.
     */
    cancel(uploadID, options) {
        return this._client.post((0, path_1.path) `/uploads/${uploadID}/cancel`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Completes the
     * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
     *
     * Within the returned Upload object, there is a nested
     * [File](https://platform.openai.com/docs/api-reference/files/object) object that
     * is ready to use in the rest of the platform.
     *
     * You can specify the order of the Parts by passing in an ordered list of the Part
     * IDs.
     *
     * The number of bytes uploaded upon completion must match the number of bytes
     * initially specified when creating the Upload object. No Parts may be added after
     * an Upload is completed. Returns the Upload object with status `completed`,
     * including an additional `file` property containing the created usable File
     * object.
     */
    complete(uploadID, body, options) {
        return this._client.post((0, path_1.path) `/uploads/${uploadID}/complete`, {
            body,
            ...options,
            __security: { bearerAuth: true },
        });
    }
}
exports.Uploads = Uploads;
Uploads.Parts = parts_1.Parts;
//# sourceMappingURL=uploads.js.map

/***/ }),

/***/ 9527:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileBatches = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const sleep_1 = __nccwpck_require__(5668);
const Util_1 = __nccwpck_require__(3831);
const path_1 = __nccwpck_require__(2704);
class FileBatches extends resource_1.APIResource {
    /**
     * Create a vector store file batch.
     */
    create(vectorStoreID, body, options) {
        return this._client.post((0, path_1.path) `/vector_stores/${vectorStoreID}/file_batches`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves a vector store file batch.
     */
    retrieve(batchID, params, options) {
        const { vector_store_id } = params;
        return this._client.get((0, path_1.path) `/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Cancel a vector store file batch. This attempts to cancel the processing of
     * files in this batch as soon as possible.
     */
    cancel(batchID, params, options) {
        const { vector_store_id } = params;
        return this._client.post((0, path_1.path) `/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Create a vector store batch and poll until all files have been processed.
     */
    async createAndPoll(vectorStoreId, body, options) {
        const batch = await this.create(vectorStoreId, body, options);
        return await this.poll(vectorStoreId, batch.id, options);
    }
    /**
     * Returns a list of vector store files in a batch.
     */
    listFiles(batchID, params, options) {
        const { vector_store_id, ...query } = params;
        return this._client.getAPIList((0, path_1.path) `/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Wait for the given file batch to be processed.
     *
     * Note: this will return even if one of the files failed to process, you need to
     * check batch.file_counts.failed_count to handle this case.
     */
    async poll(vectorStoreID, batchID, options) {
        const headers = (0, headers_1.buildHeaders)([
            options?.headers,
            {
                'X-Stainless-Poll-Helper': 'true',
                'X-Stainless-Custom-Poll-Interval': options?.pollIntervalMs?.toString() ?? undefined,
            },
        ]);
        while (true) {
            const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
                ...options,
                headers,
            }).withResponse();
            switch (batch.status) {
                case 'in_progress':
                    let sleepInterval = 5000;
                    if (options?.pollIntervalMs) {
                        sleepInterval = options.pollIntervalMs;
                    }
                    else {
                        const headerInterval = response.headers.get('openai-poll-after-ms');
                        if (headerInterval) {
                            const headerIntervalMs = parseInt(headerInterval);
                            if (!isNaN(headerIntervalMs)) {
                                sleepInterval = headerIntervalMs;
                            }
                        }
                    }
                    await (0, sleep_1.sleep)(sleepInterval);
                    break;
                case 'failed':
                case 'cancelled':
                case 'completed':
                    return batch;
            }
        }
    }
    /**
     * Uploads the given files concurrently and then creates a vector store file batch.
     *
     * The concurrency limit is configurable using the `maxConcurrency` parameter.
     */
    async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
        if (files == null || files.length == 0) {
            throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
        }
        const configuredConcurrency = options?.maxConcurrency ?? 5;
        // We cap the number of workers at the number of files (so we don't start any unnecessary workers)
        const concurrencyLimit = Math.min(configuredConcurrency, files.length);
        const client = this._client;
        const fileIterator = files.values();
        const allFileIds = [...fileIds];
        // This code is based on this design. The libraries don't accommodate our environment limits.
        // https://stackoverflow.com/questions/40639432/what-is-the-best-way-to-limit-concurrency-when-using-es6s-promise-all
        async function processFiles(iterator) {
            for (let item of iterator) {
                const fileObj = await client.files.create({ file: item, purpose: 'assistants' }, options);
                allFileIds.push(fileObj.id);
            }
        }
        // Start workers to process results
        const workers = Array(concurrencyLimit).fill(fileIterator).map(processFiles);
        // Wait for all processing to complete.
        await (0, Util_1.allSettledWithThrow)(workers);
        return await this.createAndPoll(vectorStoreId, {
            file_ids: allFileIds,
        }, options);
    }
}
exports.FileBatches = FileBatches;
//# sourceMappingURL=file-batches.js.map

/***/ }),

/***/ 49:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Files = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const utils_1 = __nccwpck_require__(2152);
const path_1 = __nccwpck_require__(2704);
class Files extends resource_1.APIResource {
    /**
     * Create a vector store file by attaching a
     * [File](https://platform.openai.com/docs/api-reference/files) to a
     * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
     */
    create(vectorStoreID, body, options) {
        return this._client.post((0, path_1.path) `/vector_stores/${vectorStoreID}/files`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves a vector store file.
     */
    retrieve(fileID, params, options) {
        const { vector_store_id } = params;
        return this._client.get((0, path_1.path) `/vector_stores/${vector_store_id}/files/${fileID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Update attributes on a vector store file.
     */
    update(fileID, params, options) {
        const { vector_store_id, ...body } = params;
        return this._client.post((0, path_1.path) `/vector_stores/${vector_store_id}/files/${fileID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of vector store files.
     */
    list(vectorStoreID, query = {}, options) {
        return this._client.getAPIList((0, path_1.path) `/vector_stores/${vectorStoreID}/files`, (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a vector store file. This will remove the file from the vector store but
     * the file itself will not be deleted. To delete the file, use the
     * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
     * endpoint.
     */
    delete(fileID, params, options) {
        const { vector_store_id } = params;
        return this._client.delete((0, path_1.path) `/vector_stores/${vector_store_id}/files/${fileID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Attach a file to the given vector store and wait for it to be processed.
     */
    async createAndPoll(vectorStoreId, body, options) {
        const file = await this.create(vectorStoreId, body, options);
        return await this.poll(vectorStoreId, file.id, options);
    }
    /**
     * Wait for the vector store file to finish processing.
     *
     * Note: this will return even if the file failed to process, you need to check
     * file.last_error and file.status to handle these cases
     */
    async poll(vectorStoreID, fileID, options) {
        const headers = (0, headers_1.buildHeaders)([
            options?.headers,
            {
                'X-Stainless-Poll-Helper': 'true',
                'X-Stainless-Custom-Poll-Interval': options?.pollIntervalMs?.toString() ?? undefined,
            },
        ]);
        while (true) {
            const fileResponse = await this.retrieve(fileID, {
                vector_store_id: vectorStoreID,
            }, { ...options, headers }).withResponse();
            const file = fileResponse.data;
            switch (file.status) {
                case 'in_progress':
                    let sleepInterval = 5000;
                    if (options?.pollIntervalMs) {
                        sleepInterval = options.pollIntervalMs;
                    }
                    else {
                        const headerInterval = fileResponse.response.headers.get('openai-poll-after-ms');
                        if (headerInterval) {
                            const headerIntervalMs = parseInt(headerInterval);
                            if (!isNaN(headerIntervalMs)) {
                                sleepInterval = headerIntervalMs;
                            }
                        }
                    }
                    await (0, utils_1.sleep)(sleepInterval);
                    break;
                case 'failed':
                case 'completed':
                    return file;
            }
        }
    }
    /**
     * Upload a file to the `files` API and then attach it to the given vector store.
     *
     * Note the file will be asynchronously processed (you can use the alternative
     * polling helper method to wait for processing to complete).
     */
    async upload(vectorStoreId, file, options) {
        const fileInfo = await this._client.files.create({ file: file, purpose: 'assistants' }, options);
        return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
    }
    /**
     * Add a file to a vector store and poll until processing is complete.
     */
    async uploadAndPoll(vectorStoreId, file, options) {
        const fileInfo = await this.upload(vectorStoreId, file, options);
        return await this.poll(vectorStoreId, fileInfo.id, options);
    }
    /**
     * Retrieve the parsed contents of a vector store file.
     */
    content(fileID, params, options) {
        const { vector_store_id } = params;
        return this._client.getAPIList((0, path_1.path) `/vector_stores/${vector_store_id}/files/${fileID}/content`, (pagination_1.Page), {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.Files = Files;
//# sourceMappingURL=files.js.map

/***/ }),

/***/ 9494:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.VectorStores = void 0;
const tslib_1 = __nccwpck_require__(2345);
const resource_1 = __nccwpck_require__(9487);
const FileBatchesAPI = tslib_1.__importStar(__nccwpck_require__(9527));
const file_batches_1 = __nccwpck_require__(9527);
const FilesAPI = tslib_1.__importStar(__nccwpck_require__(49));
const files_1 = __nccwpck_require__(49);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const path_1 = __nccwpck_require__(2704);
class VectorStores extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.files = new FilesAPI.Files(this._client);
        this.fileBatches = new FileBatchesAPI.FileBatches(this._client);
    }
    /**
     * Create a vector store.
     */
    create(body, options) {
        return this._client.post('/vector_stores', {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Retrieves a vector store.
     */
    retrieve(vectorStoreID, options) {
        return this._client.get((0, path_1.path) `/vector_stores/${vectorStoreID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Modifies a vector store.
     */
    update(vectorStoreID, body, options) {
        return this._client.post((0, path_1.path) `/vector_stores/${vectorStoreID}`, {
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Returns a list of vector stores.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/vector_stores', (pagination_1.CursorPage), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Delete a vector store.
     */
    delete(vectorStoreID, options) {
        return this._client.delete((0, path_1.path) `/vector_stores/${vectorStoreID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
    /**
     * Search a vector store for relevant chunks based on a query and file attributes
     * filter.
     */
    search(vectorStoreID, body, options) {
        return this._client.getAPIList((0, path_1.path) `/vector_stores/${vectorStoreID}/search`, (pagination_1.Page), {
            body,
            method: 'post',
            ...options,
            headers: (0, headers_1.buildHeaders)([{ 'OpenAI-Beta': 'assistants=v2' }, options?.headers]),
            __security: { bearerAuth: true },
        });
    }
}
exports.VectorStores = VectorStores;
VectorStores.Files = files_1.Files;
VectorStores.FileBatches = file_batches_1.FileBatches;
//# sourceMappingURL=vector-stores.js.map

/***/ }),

/***/ 193:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Videos = void 0;
const resource_1 = __nccwpck_require__(9487);
const pagination_1 = __nccwpck_require__(2155);
const headers_1 = __nccwpck_require__(9267);
const uploads_1 = __nccwpck_require__(5887);
const path_1 = __nccwpck_require__(2704);
/**
 * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
 */
class Videos extends resource_1.APIResource {
    /**
     * Create a new video generation job from a prompt and optional reference assets.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    create(body, options) {
        return this._client.post('/videos', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Fetch the latest metadata for a generated video.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    retrieve(videoID, options) {
        return this._client.get((0, path_1.path) `/videos/${videoID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * List recently generated videos for the current project.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    list(query = {}, options) {
        return this._client.getAPIList('/videos', (pagination_1.ConversationCursorPage), {
            query,
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Permanently delete a completed or failed video and its stored assets.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    delete(videoID, options) {
        return this._client.delete((0, path_1.path) `/videos/${videoID}`, { ...options, __security: { bearerAuth: true } });
    }
    /**
     * Create a character from an uploaded video.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    createCharacter(body, options) {
        return this._client.post('/videos/characters', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Download the generated video bytes or a derived preview asset.
     *
     * Streams the rendered video content for the specified video job.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    downloadContent(videoID, query = {}, options) {
        return this._client.get((0, path_1.path) `/videos/${videoID}/content`, {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __security: { bearerAuth: true },
            __binaryResponse: true,
        });
    }
    /**
     * Create a new video generation job by editing a source video or existing
     * generated video.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    edit(body, options) {
        return this._client.post('/videos/edits', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Create an extension of a completed video.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    extend(body, options) {
        return this._client.post('/videos/extensions', (0, uploads_1.multipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
    /**
     * Fetch a character.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    getCharacter(characterID, options) {
        return this._client.get((0, path_1.path) `/videos/characters/${characterID}`, {
            ...options,
            __security: { bearerAuth: true },
        });
    }
    /**
     * Create a remix of a completed video using a refreshed prompt.
     *
     * @deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.
     */
    remix(videoID, body, options) {
        return this._client.post((0, path_1.path) `/videos/${videoID}/remix`, (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options, __security: { bearerAuth: true } }, this._client));
    }
}
exports.Videos = Videos;
//# sourceMappingURL=videos.js.map

/***/ }),

/***/ 5143:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __nccwpck_require__(2345);
tslib_1.__exportStar(__nccwpck_require__(2208), exports);
//# sourceMappingURL=webhooks.js.map

/***/ }),

/***/ 2208:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __nccwpck_require__(2345);
tslib_1.__exportStar(__nccwpck_require__(3820), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 3820:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// File generated from our OpenAPI spec by Castiron. See CONTRIBUTING.md for details.
var _Webhooks_instances, _Webhooks_validateSecret, _Webhooks_getRequiredHeader;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Webhooks = void 0;
const tslib_1 = __nccwpck_require__(2345);
const error_1 = __nccwpck_require__(3269);
const resource_1 = __nccwpck_require__(9487);
const headers_1 = __nccwpck_require__(9267);
const base64_1 = __nccwpck_require__(1040);
const bytes_1 = __nccwpck_require__(9948);
class Webhooks extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        _Webhooks_instances.add(this);
    }
    /**
     * Validates that the given payload was sent by OpenAI and parses the payload.
     */
    async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
        await this.verifySignature(payload, headers, secret, tolerance);
        return JSON.parse(payload);
    }
    /**
     * Validates whether or not the webhook payload was sent by OpenAI.
     *
     * An error will be raised if the webhook payload was not sent by OpenAI.
     *
     * @param payload - The webhook payload
     * @param headers - The webhook headers
     * @param secret - The webhook secret (optional, will use client secret if not provided)
     * @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
     */
    async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
        if (typeof crypto === 'undefined' ||
            typeof crypto.subtle.importKey !== 'function' ||
            typeof crypto.subtle.verify !== 'function') {
            throw new Error('Webhook signature verification is only supported when the `crypto` global is defined');
        }
        tslib_1.__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
        const headersObj = (0, headers_1.buildHeaders)([headers]).values;
        const signatureHeader = tslib_1.__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, 'webhook-signature');
        const timestamp = tslib_1.__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, 'webhook-timestamp');
        const webhookId = tslib_1.__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, 'webhook-id');
        // Validate timestamp to prevent replay attacks
        const timestampSeconds = parseInt(timestamp, 10);
        if (isNaN(timestampSeconds)) {
            throw new error_1.InvalidWebhookSignatureError('Invalid webhook timestamp format');
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds - timestampSeconds > tolerance) {
            throw new error_1.InvalidWebhookSignatureError('Webhook timestamp is too old');
        }
        if (timestampSeconds > nowSeconds + tolerance) {
            throw new error_1.InvalidWebhookSignatureError('Webhook timestamp is too new');
        }
        // Extract signatures from v1,<base64> format
        // The signature header can have multiple values, separated by spaces.
        // Each value is in the format v1,<base64>. We should accept if any match.
        const signatures = signatureHeader
            .split(' ')
            .map((part) => (part.startsWith('v1,') ? part.substring(3) : part));
        // Decode the secret if it starts with whsec_
        const decodedSecret = Uint8Array.from(secret.startsWith('whsec_') ? (0, base64_1.fromBase64)(secret.slice('whsec_'.length)) : (0, bytes_1.encodeUTF8)(secret));
        // Create the signed payload: {webhook_id}.{timestamp}.{payload}
        const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
        const signedPayloadBytes = Uint8Array.from((0, bytes_1.encodeUTF8)(signedPayload));
        // Import the secret as a cryptographic key for HMAC
        const key = await crypto.subtle.importKey('raw', decodedSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        // Check if any signature matches using timing-safe WebCrypto verify
        for (const signature of signatures) {
            try {
                const signatureBytes = Uint8Array.from((0, base64_1.fromBase64)(signature));
                const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, signedPayloadBytes);
                if (isValid) {
                    return; // Valid signature found
                }
            }
            catch {
                // Invalid base64 or signature format, continue to next signature
                continue;
            }
        }
        throw new error_1.InvalidWebhookSignatureError('The given webhook signature does not match the expected signature');
    }
}
exports.Webhooks = Webhooks;
_Webhooks_instances = new WeakSet(), _Webhooks_validateSecret = function _Webhooks_validateSecret(secret) {
    if (typeof secret !== 'string' || secret.length === 0) {
        throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
    }
}, _Webhooks_getRequiredHeader = function _Webhooks_getRequiredHeader(headers, name) {
    if (!headers) {
        throw new Error(`Headers are required`);
    }
    const value = headers.get(name);
    if (value === null || value === undefined) {
        throw new Error(`Missing required header: ${name}`);
    }
    return value;
};
//# sourceMappingURL=webhooks.js.map

/***/ }),

/***/ 1835:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __nccwpck_require__(2345);
/** @deprecated Import from ./core/streaming instead */
tslib_1.__exportStar(__nccwpck_require__(7787), exports);
//# sourceMappingURL=streaming.js.map

/***/ }),

/***/ 3287:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.VERSION = void 0;
/** Version of the installed OpenAI SDK package. */
exports.VERSION = '7.5.0'; // x-release-please-version
//# sourceMappingURL=version.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/asset-relocator-loader */
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(9407);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;