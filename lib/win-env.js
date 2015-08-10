/**
 * Windows-specific environment variables
 */
var env = process.env;
var winEnv = module.exports = {
	PROGRAMFILES_X86: env['PROGRAMFILES(X86)'] || env['PROGRAMFILES'],
	PROGRAMFILES_X64: env.PROGRAMW6432, // "C:\Program Files" on x64
	USERPROFILE: env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH,
	X64: process.arch == 'x64' || 'PROGRAMFILES(X86)' in env || 'PROCESSOR_ARCHITEW6432' in env
};