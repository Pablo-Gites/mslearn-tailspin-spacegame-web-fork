"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const auth = require("azure-pipelines-tasks-packaging-common/nuget/Authentication");
const commandHelper = require("azure-pipelines-tasks-packaging-common/nuget/CommandHelper");
const NuGetConfigHelper2_1 = require("azure-pipelines-tasks-packaging-common/nuget/NuGetConfigHelper2");
const ngToolRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const peParser = require("azure-pipelines-tasks-packaging-common/pe-parser/index");
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const pkgLocationUtils = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
const util_1 = require("azure-pipelines-tasks-packaging-common/util");
const util_2 = require("azure-pipelines-tasks-packaging-common/util");
const ProductVersionHelper_1 = require("azure-pipelines-tasks-packaging-common/nuget/ProductVersionHelper");
class RestoreOptions {
    constructor(nuGetPath, configFile, noCache, disableParallelProcessing, verbosity, packagesDirectory, environment, authInfo) {
        this.nuGetPath = nuGetPath;
        this.configFile = configFile;
        this.noCache = noCache;
        this.disableParallelProcessing = disableParallelProcessing;
        this.verbosity = verbosity;
        this.packagesDirectory = packagesDirectory;
        this.environment = environment;
        this.authInfo = authInfo;
    }
}
function run(nuGetPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let packagingLocation;
        try {
            packagingLocation = yield pkgLocationUtils.getPackagingUris(pkgLocationUtils.ProtocolType.NuGet);
        }
        catch (error) {
            tl.debug("Unable to get packaging URIs");
            (0, util_2.logError)(error);
            throw error;
        }
        const buildIdentityDisplayName = null;
        const buildIdentityAccount = null;
        try {
            nutil.setConsoleCodePage();
            // Reading inputs
            const solutionPattern = tl.getPathInput("solution", true, false);
            const useLegacyFind = tl.getVariable("NuGet.UseLegacyFindFiles") === "true";
            let filesList = [];
            if (!useLegacyFind) {
                const findOptions = {};
                const matchOptions = {};
                const searchPatterns = nutil.getPatternsArrayFromInput(solutionPattern);
                filesList = tl.findMatch(undefined, searchPatterns, findOptions, matchOptions);
            }
            else {
                filesList = nutil.resolveFilterSpec(solutionPattern, tl.getVariable("System.DefaultWorkingDirectory") || process.cwd());
            }
            filesList.forEach((solutionFile) => {
                if (!tl.stats(solutionFile).isFile()) {
                    throw new Error(tl.loc("NotARegularFile", solutionFile));
                }
            });
            const noCache = tl.getBoolInput("noCache");
            const disableParallelProcessing = tl.getBoolInput("disableParallelProcessing");
            const verbosity = tl.getInput("verbosityRestore");
            let packagesDirectory = tl.getPathInput("packagesDirectory");
            if (!tl.filePathSupplied("packagesDirectory")) {
                packagesDirectory = null;
            }
            const nuGetVersion = yield peParser.getFileVersionInfoAsync(nuGetPath);
            // Discovering NuGet quirks based on the version
            tl.debug("Getting NuGet quirks");
            const quirks = yield ngToolRunner.getNuGetQuirksAsync(nuGetPath);
            // Clauses ordered in this way to avoid short-circuit evaluation, so the debug info printed by the functions
            // is unconditionally displayed
            const useV1CredProvider = ngToolRunner.isCredentialProviderEnabled(quirks);
            const useV2CredProvider = ngToolRunner.isCredentialProviderV2Enabled(quirks);
            const credProviderPath = nutil.locateCredentialProvider(useV2CredProvider);
            const useCredConfig = ngToolRunner.isCredentialConfigEnabled(quirks)
                && (!useV1CredProvider && !useV2CredProvider);
            // Setting up auth-related variables
            tl.debug("Setting up auth");
            let urlPrefixes = packagingLocation.PackagingUris;
            tl.debug(`Discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            const testPrefixes = tl.getVariable("NuGetTasks.ExtraUrlPrefixesForTesting");
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(";"));
                tl.debug(`All URL prefixes: ${urlPrefixes}`);
            }
            const accessToken = pkgLocationUtils.getSystemAccessToken();
            const externalAuthArr = commandHelper.GetExternalAuthInfoArray("externalEndpoints");
            const authInfo = new auth.NuGetExtendedAuthInfo(new auth.InternalAuthInfo(urlPrefixes, accessToken, ((useV1CredProvider || useV2CredProvider) ? credProviderPath : null), useCredConfig), externalAuthArr);
            const environmentSettings = {
                credProviderFolder: useV2CredProvider === false ? credProviderPath : null,
                V2CredProviderPath: useV2CredProvider === true ? credProviderPath : null,
                extensionsDisabled: true,
            };
            // Setting up sources, either from provided config file or from feed selection
            tl.debug("Setting up sources");
            let nuGetConfigPath = undefined;
            let configFile = undefined;
            let selectOrConfig = tl.getInput("selectOrConfig");
            // This IF is here in order to provide a value to nuGetConfigPath (if option selected, if user provided it)
            // and then pass it into the config helper
            if (selectOrConfig === "config") {
                nuGetConfigPath = tl.getPathInput("nugetConfigPath", false, true);
                if (!tl.filePathSupplied("nugetConfigPath")) {
                    nuGetConfigPath = undefined;
                }
                // If using NuGet version 4.8 or greater and nuget.config was provided, 
                // do not create temp config file
                if (useV2CredProvider && nuGetConfigPath) {
                    configFile = nuGetConfigPath;
                }
            }
            // If there was no nuGetConfigPath, NuGetConfigHelper will create a temp one
            const nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(nuGetPath, nuGetConfigPath, authInfo, environmentSettings, null);
            let credCleanup = () => { return; };
            let isNugetOrgBehaviorWarn = false;
            // Now that the NuGetConfigHelper was initialized with all the known information we can proceed
            // and check if the user picked the 'select' option to fill out the config file if needed
            if (selectOrConfig === "select") {
                const sources = new Array();
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedRestore');
                if (feed.feedId) {
                    const feedUrl = yield nutil.getNuGetFeedRegistryUrl(packagingLocation.DefaultPackagingUri, feed.feedId, feed.projectId, nuGetVersion, accessToken);
                    sources.push({
                        feedName: feed.feedId,
                        feedUri: feedUrl,
                        isInternal: true,
                    });
                }
                const includeNuGetOrg = tl.getBoolInput("includeNuGetOrg", false);
                if (includeNuGetOrg) {
                    // If includeNuGetOrg is true, check the INCLUDE_NUGETORG_BEHAVIOR env variable to determine task result 
                    // this allows compliance checks to warn or break the task if consuming from nuget.org directly 
                    const nugetOrgBehavior = includeNuGetOrg ? tl.getVariable("INCLUDE_NUGETORG_BEHAVIOR") : undefined;
                    tl.debug(`NugetOrgBehavior: ${nugetOrgBehavior}`);
                    if ((nugetOrgBehavior === null || nugetOrgBehavior === void 0 ? void 0 : nugetOrgBehavior.toLowerCase()) == "fail") {
                        throw new Error(tl.loc("Error_IncludeNuGetOrgEnabled"));
                    }
                    else if ((nugetOrgBehavior === null || nugetOrgBehavior === void 0 ? void 0 : nugetOrgBehavior.toLowerCase()) == "warn") {
                        isNugetOrgBehaviorWarn = true;
                    }
                    const nuGetSource = (0, ProductVersionHelper_1.getVersionFallback)(nuGetVersion).a < 3
                        ? auth.NuGetOrgV2PackageSource
                        : auth.NuGetOrgV3PackageSource;
                    sources.push(nuGetSource);
                }
                // Creating NuGet.config for the user
                if (sources.length > 0) {
                    // tslint:disable-next-line:max-line-length
                    tl.debug(`Adding the following sources to the config file: ${sources.map((x) => x.feedName).join(";")}`);
                    nuGetConfigHelper.addSourcesToTempNuGetConfig(sources);
                    credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                    nuGetConfigPath = nuGetConfigHelper.tempNugetConfigPath;
                }
                else {
                    tl.debug("No sources were added to the temp NuGet.config file");
                }
            }
            if (!useV2CredProvider && !configFile) {
                // Setting creds in the temp NuGet.config if needed
                nuGetConfigHelper.setAuthForSourcesInTempNuGetConfig();
                tl.debug('Setting nuget.config auth');
            }
            else {
                // In case of !!useV2CredProvider, V2 credential provider will handle external credentials
                tl.debug('No temp nuget.config auth');
            }
            // if configfile has already been set, let it be
            if (!configFile) {
                // Use config file if:
                //     - User selected "Select feeds" option
                //     - User selected "NuGet.config" option and the nuGetConfig input has a value
                let useConfigFile = selectOrConfig === "select" || (selectOrConfig === "config" && !!nuGetConfigPath);
                configFile = useConfigFile ? nuGetConfigHelper.tempNugetConfigPath : undefined;
                if (useConfigFile) {
                    credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                }
            }
            tl.debug(`ConfigFile: ${configFile}`);
            environmentSettings.configFile = configFile;
            try {
                const restoreOptions = new RestoreOptions(nuGetPath, configFile, noCache, disableParallelProcessing, verbosity, packagesDirectory, environmentSettings, authInfo);
                for (const solutionFile of filesList) {
                    yield restorePackages(solutionFile, restoreOptions);
                }
            }
            finally {
                credCleanup();
            }
            isNugetOrgBehaviorWarn
                ? tl.setResult(tl.TaskResult.SucceededWithIssues, tl.loc("Warning_IncludeNuGetOrgEnabled"))
                : tl.setResult(tl.TaskResult.Succeeded, tl.loc("PackagesInstalledSuccessfully"));
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc("BuildIdentityPermissionsHint", buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, tl.loc("PackagesFailedToInstall"));
        }
    });
}
exports.run = run;
function restorePackages(solutionFile, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const nugetTool = ngToolRunner.createNuGetToolRunner(options.nuGetPath, options.environment, options.authInfo);
        nugetTool.arg("restore");
        nugetTool.arg(solutionFile);
        if (options.packagesDirectory) {
            nugetTool.arg("-PackagesDirectory");
            nugetTool.arg(options.packagesDirectory);
        }
        if (options.noCache) {
            nugetTool.arg("-NoCache");
        }
        if (options.disableParallelProcessing) {
            nugetTool.arg("-DisableParallelProcessing");
        }
        if (options.verbosity && options.verbosity !== "-") {
            nugetTool.arg("-Verbosity");
            nugetTool.arg(options.verbosity);
        }
        nugetTool.arg("-NonInteractive");
        if (options.configFile) {
            nugetTool.arg("-ConfigFile");
            nugetTool.arg(options.configFile);
        }
        // Listen for stderr output to write timeline results for the build.
        let stdErrText = "";
        nugetTool.on('stderr', (data) => {
            stdErrText += data.toString('utf-8');
        });
        const execResult = yield nugetTool.exec({ cwd: path.dirname(solutionFile), ignoreReturnCode: true });
        if (execResult !== 0) {
            telemetry.logResult("Packaging", "NuGetCommand", execResult);
            throw tl.loc("Error_NugetFailedWithCodeAndErr", execResult, stdErrText.trim());
        }
        return execResult;
    });
}
