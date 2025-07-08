import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

global.crypto = global.crypto || {};
global.crypto.randomUUID = global.crypto.randomUUID || (() => 'mocked-uuid');
