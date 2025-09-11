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
const tl = require("azure-pipelines-task-lib/task");
const auth = require("azure-pipelines-tasks-packaging-common/nuget/Authentication");
const commandHelper = require("azure-pipelines-tasks-packaging-common/nuget/CommandHelper");
const NuGetConfigHelper2_1 = require("azure-pipelines-tasks-packaging-common/nuget/NuGetConfigHelper2");
const ngToolRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const peParser = require("azure-pipelines-tasks-packaging-common/pe-parser/index");
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const pkgLocationUtils = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
const vstsNuGetPushToolRunner = require("./Common/VstsNuGetPushToolRunner");
const vstsNuGetPushToolUtilities = require("./Common/VstsNuGetPushToolUtilities");
const util_1 = require("azure-pipelines-tasks-packaging-common/util");
const util_2 = require("azure-pipelines-tasks-packaging-common/util");
const restutilities_1 = require("azure-pipelines-tasks-utility-common/restutilities");
class PublishOptions {
    constructor(nuGetPath, feedUri, apiKey, configFile, verbosity, authInfo, environment) {
        this.nuGetPath = nuGetPath;
        this.feedUri = feedUri;
        this.apiKey = apiKey;
        this.configFile = configFile;
        this.verbosity = verbosity;
        this.authInfo = authInfo;
        this.environment = environment;
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
            // Get list of files to pusblish
            const searchPatternInput = tl.getPathInput("searchPatternPush", true, false);
            const useLegacyFind = tl.getVariable("NuGet.UseLegacyFindFiles") === "true";
            let filesList = [];
            if (!useLegacyFind) {
                const findOptions = {};
                const matchOptions = {};
                const searchPatterns = nutil.getPatternsArrayFromInput(searchPatternInput);
                filesList = tl.findMatch(undefined, searchPatterns, findOptions, matchOptions);
            }
            else {
                filesList = nutil.resolveFilterSpec(searchPatternInput);
            }
            filesList.forEach((packageFile) => {
                if (!tl.stats(packageFile).isFile()) {
                    throw new Error(tl.loc("Error_PushNotARegularFile", packageFile));
                }
            });
            if (filesList && filesList.length < 1) {
                tl.warning(tl.loc("Info_NoPackagesMatchedTheSearchPattern"));
                return;
            }
            // Get the info the type of feed
            let nugetFeedType = tl.getInput("nuGetFeedType") || "internal";
            // Make sure the feed type is an expected one
            const normalizedNuGetFeedType = ["internal", "external"]
                .find((x) => nugetFeedType.toUpperCase() === x.toUpperCase());
            if (!normalizedNuGetFeedType) {
                throw new Error(tl.loc("UnknownFeedType", nugetFeedType));
            }
            nugetFeedType = normalizedNuGetFeedType;
            let urlPrefixes = packagingLocation.PackagingUris;
            tl.debug(`discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            const testPrefixes = tl.getVariable("NuGetTasks.ExtraUrlPrefixesForTesting");
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(";"));
                tl.debug(`all URL prefixes: ${urlPrefixes}`);
            }
            // Setting up auth info
            let accessToken;
            let feed;
            const isInternalFeed = nugetFeedType === "internal";
            accessToken = yield getAccessToken(isInternalFeed, urlPrefixes);
            const quirks = yield ngToolRunner.getNuGetQuirksAsync(nuGetPath);
            // Clauses ordered in this way to avoid short-circuit evaluation, so the debug info printed by the functions
            // is unconditionally displayed
            const useV1CredProvider = ngToolRunner.isCredentialProviderEnabled(quirks);
            const useV2CredProvider = ngToolRunner.isCredentialProviderV2Enabled(quirks);
            const credProviderPath = nutil.locateCredentialProvider(useV2CredProvider);
            const useCredConfig = ngToolRunner.isCredentialConfigEnabled(quirks)
                && (!useV1CredProvider && !useV2CredProvider);
            const internalAuthInfo = new auth.InternalAuthInfo(urlPrefixes, accessToken, ((useV1CredProvider || useV2CredProvider) ? credProviderPath : null), useCredConfig);
            const environmentSettings = {
                credProviderFolder: useV2CredProvider === false ? credProviderPath : null,
                V2CredProviderPath: useV2CredProvider === true ? credProviderPath : null,
                extensionsDisabled: true,
            };
            let configFile = null;
            let apiKey;
            let credCleanup = () => { return; };
            let feedUri;
            let authInfo;
            let nuGetConfigHelper;
            if (isInternalFeed) {
                authInfo = new auth.NuGetExtendedAuthInfo(internalAuthInfo);
                nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(nuGetPath, null, authInfo, environmentSettings, null);
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedPublish');
                const nuGetVersion = yield peParser.getFileVersionInfoAsync(nuGetPath);
                feedUri = yield nutil.getNuGetFeedRegistryUrl(packagingLocation.DefaultPackagingUri, feed.feedId, feed.projectId, nuGetVersion, accessToken, true /* useSession */);
                if (useCredConfig) {
                    nuGetConfigHelper.addSourcesToTempNuGetConfig([
                        // tslint:disable-next-line:no-object-literal-type-assertion
                        {
                            feedName: feed.feedId,
                            feedUri,
                            isInternal: true,
                        }
                    ]);
                    configFile = nuGetConfigHelper.tempNugetConfigPath;
                    credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                }
                apiKey = "VSTS";
            }
            else {
                const externalAuthArr = commandHelper.GetExternalAuthInfoArray("externalEndpoint");
                authInfo = new auth.NuGetExtendedAuthInfo(internalAuthInfo, externalAuthArr);
                nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(nuGetPath, null, authInfo, environmentSettings, null);
                const externalAuth = externalAuthArr[0];
                if (!externalAuth) {
                    tl.setResult(tl.TaskResult.Failed, tl.loc("Error_NoSourceSpecifiedForPush"));
                    return;
                }
                nuGetConfigHelper.addSourcesToTempNuGetConfig([externalAuth.packageSource]);
                feedUri = externalAuth.packageSource.feedUri;
                configFile = nuGetConfigHelper.tempNugetConfigPath;
                credCleanup = () => tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                const authType = externalAuth.authType;
                switch (authType) {
                    case (auth.ExternalAuthType.UsernamePassword):
                    case (auth.ExternalAuthType.Token):
                        apiKey = "RequiredApiKey";
                        break;
                    case (auth.ExternalAuthType.ApiKey):
                        const apiKeyAuthInfo = externalAuth;
                        apiKey = apiKeyAuthInfo.apiKey;
                        break;
                    default:
                        break;
                }
            }
            if (isInternalFeed === false || useCredConfig) {
                nuGetConfigHelper.setAuthForSourcesInTempNuGetConfig();
            }
            environmentSettings.registryUri = feedUri;
            const verbosity = tl.getInput("verbosityPush");
            const continueOnConflict = tl.getBoolInput("allowPackageConflicts");
            const useVstsNuGetPush = shouldUseVstsNuGetPush(isInternalFeed, continueOnConflict, nuGetPath);
            let vstsPushPath;
            if (useVstsNuGetPush) {
                vstsPushPath = vstsNuGetPushToolUtilities.getBundledVstsNuGetPushLocation();
                if (!vstsPushPath) {
                    tl.warning(tl.loc("Warning_FallBackToNuGet"));
                }
            }
            try {
                if (useVstsNuGetPush && vstsPushPath) {
                    tl.debug("Using VstsNuGetPush.exe to push the packages");
                    const vstsNuGetPushSettings = {
                        continueOnConflict,
                    };
                    const publishOptions = {
                        vstsNuGetPushPath: vstsPushPath,
                        feedUri,
                        internalAuthInfo: authInfo.internalAuthInfo,
                        verbosity,
                        settings: vstsNuGetPushSettings,
                    };
                    for (const packageFile of filesList) {
                        yield publishPackageVstsNuGetPush(packageFile, publishOptions);
                    }
                }
                else {
                    tl.debug("Using NuGet.exe to push the packages");
                    const publishOptions = new PublishOptions(nuGetPath, feedUri, apiKey, configFile, verbosity, authInfo, environmentSettings);
                    for (const packageFile of filesList) {
                        yield publishPackageNuGet(packageFile, publishOptions, authInfo, continueOnConflict);
                    }
                }
            }
            finally {
                credCleanup();
            }
            tl.setResult(tl.TaskResult.Succeeded, tl.loc("PackagesPublishedSuccessfully"));
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc("BuildIdentityPermissionsHint", buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, tl.loc("PackagesFailedToPublish"));
        }
    });
}
exports.run = run;
function publishPackageNuGet(packageFile, options, authInfo, continueOnConflict) {
    return __awaiter(this, void 0, void 0, function* () {
        const nugetTool = ngToolRunner.createNuGetToolRunner(options.nuGetPath, options.environment, authInfo);
        nugetTool.arg("push");
        nugetTool.arg(packageFile);
        nugetTool.arg("-NonInteractive");
        nugetTool.arg(["-Source", options.feedUri]);
        nugetTool.argIf(options.apiKey, ["-ApiKey", options.apiKey]);
        if (options.configFile) {
            nugetTool.arg("-ConfigFile");
            nugetTool.arg(options.configFile);
        }
        if (options.verbosity && options.verbosity !== "-") {
            nugetTool.arg("-Verbosity");
            nugetTool.arg(options.verbosity);
        }
        // Listen for stderr output to write timeline results for the build.
        let stdErrText = "";
        nugetTool.on('stderr', (data) => {
            stdErrText += data.toString('utf-8');
        });
        const execResult = yield nugetTool.exec({ ignoreReturnCode: true });
        if (execResult !== 0) {
            telemetry.logResult("Packaging", "NuGetCommand", execResult);
            if (continueOnConflict && stdErrText.indexOf("The feed already contains") > 0) {
                tl.debug(`A conflict occurred with package ${packageFile}, ignoring it since "Allow duplicates" was selected.`);
                return 0;
            }
            else {
                throw tl.loc("Error_NugetFailedWithCodeAndErr", execResult, stdErrText.trim());
            }
        }
        return execResult;
    });
}
function publishPackageVstsNuGetPush(packageFile, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const vstsNuGetPushTool = vstsNuGetPushToolRunner.createVstsNuGetPushToolRunner(options.vstsNuGetPushPath, options.settings, options.internalAuthInfo);
        vstsNuGetPushTool.arg(packageFile);
        vstsNuGetPushTool.arg(["-Source", options.feedUri]);
        vstsNuGetPushTool.arg(["-AccessToken", options.internalAuthInfo.accessToken]);
        vstsNuGetPushTool.arg("-NonInteractive");
        if (options.verbosity && options.verbosity.toLowerCase() === "detailed") {
            vstsNuGetPushTool.arg(["-Verbosity", "Detailed"]);
        }
        // Listen for stderr output to write timeline results for the build.
        let stdErrText = "";
        vstsNuGetPushTool.on('stderr', (data) => {
            stdErrText += data.toString('utf-8');
        });
        const execResult = yield vstsNuGetPushTool.exec();
        if (execResult === 0) {
            return;
        }
        // ExitCode 2 means a push conflict occurred
        if (execResult === 2 && options.settings.continueOnConflict) {
            tl.debug(`A conflict occurred with package ${packageFile}, ignoring it since "Allow duplicates" was selected.`);
            return;
        }
        telemetry.logResult("Packaging", "NuGetCommand", execResult);
        throw new Error(tl.loc("Error_UnexpectedErrorVstsNuGetPush", execResult, stdErrText.trim()));
    });
}
function shouldUseVstsNuGetPush(isInternalFeed, conflictsAllowed, nugetExePath) {
    if (tl.osType() !== "Windows_NT") {
        tl.debug("Running on a non-windows platform so NuGet.exe will be used.");
        return false;
    }
    if (!isInternalFeed) {
        tl.debug("Pushing to an external feed so NuGet.exe will be used.");
        return false;
    }
    if (commandHelper.isOnPremisesTfs()) {
        tl.debug("Pushing to an onPrem environment, only NuGet.exe is supported.");
        if (conflictsAllowed) {
            tl.warning(tl.loc("Warning_AllowDuplicatesOnlyAvailableHosted"));
        }
        return false;
    }
    const nugetOverrideFlag = tl.getVariable("NuGet.ForceNuGetForPush");
    if (nugetOverrideFlag === "true") {
        tl.debug("NuGet.exe is force enabled for publish.");
        if (conflictsAllowed) {
            tl.warning(tl.loc("Warning_ForceNuGetCannotSkipConflicts"));
        }
        return false;
    }
    if (nugetOverrideFlag === "false") {
        tl.debug("NuGet.exe is force disabled for publish.");
        return true;
    }
    const vstsNuGetPushOverrideFlag = tl.getVariable("NuGet.ForceVstsNuGetPushForPush");
    if (vstsNuGetPushOverrideFlag === "true") {
        tl.debug("VstsNuGetPush.exe is force enabled for publish.");
        return true;
    }
    if (vstsNuGetPushOverrideFlag === "false") {
        tl.debug("VstsNuGetPush.exe is force disabled for publish.");
        if (conflictsAllowed) {
            tl.warning(tl.loc("Warning_ForceNuGetCannotSkipConflicts"));
        }
        return false;
    }
    // Use VstsNugetPush only if conflictsAllowed is checked. Otherwise use Nuget as default.
    if (conflictsAllowed) {
        return true;
    }
    return false;
}
function getAccessToken(isInternalFeed, uriPrefixes) {
    return __awaiter(this, void 0, void 0, function* () {
        let allowServiceConnection = tl.getVariable('PUBLISH_VIA_SERVICE_CONNECTION');
        let accessToken;
        if (allowServiceConnection) {
            let endpoint = tl.getInput('externalEndpoint', false);
            if (endpoint && isInternalFeed === true) {
                tl.debug("Found external endpoint, will use token for auth");
                let endpointAuth = tl.getEndpointAuthorization(endpoint, true);
                let endpointScheme = tl.getEndpointAuthorizationScheme(endpoint, true).toLowerCase();
                switch (endpointScheme) {
                    case ("token"):
                        accessToken = endpointAuth.parameters["apitoken"];
                        break;
                    default:
                        tl.warning(tl.loc("Warning_UnsupportedServiceConnectionAuth"));
                        break;
                }
            }
            if (!accessToken && isInternalFeed === true) {
                tl.debug("Checking for auth from Cred Provider.");
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedPublish');
                const JsonEndpointsString = process.env["VSS_NUGET_EXTERNAL_FEED_ENDPOINTS"];
                if (JsonEndpointsString) {
                    tl.debug(`Feed details ${feed.feedId} ${feed.projectId}`);
                    tl.debug(`Endpoints found: ${JsonEndpointsString}`);
                    let endpointsArray = JSON.parse(JsonEndpointsString);
                    let matchingEndpoint;
                    for (const e of endpointsArray.endpointCredentials) {
                        for (const prefix of uriPrefixes) {
                            if (e.endpoint.toUpperCase().startsWith(prefix.toUpperCase())) {
                                let isServiceConnectionValid = yield tryServiceConnection(e, feed);
                                if (isServiceConnectionValid) {
                                    matchingEndpoint = e;
                                    break;
                                }
                            }
                        }
                        if (matchingEndpoint) {
                            accessToken = matchingEndpoint.password;
                            break;
                        }
                    }
                }
            }
            if (accessToken) {
                return accessToken;
            }
        }
        tl.debug('Defaulting to use the System Access Token.');
        accessToken = pkgLocationUtils.getSystemAccessToken();
        return accessToken;
    });
}
function tryServiceConnection(endpoint, feed) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create request
        const request = new restutilities_1.WebRequest();
        const token64 = Buffer.from(`${endpoint.username}:${endpoint.password}`).toString('base64');
        request.uri = endpoint.endpoint;
        request.method = 'GET';
        request.headers = {
            "Content-Type": "application/json",
            "Authorization": "Basic " + token64
        };
        const response = yield (0, restutilities_1.sendRequest)(request);
        if (response.statusCode == 200) {
            if (response.body) {
                for (const entry of response.body.resources) {
                    if (entry['@type'] === 'AzureDevOpsProjectId' && !(entry['label'].toUpperCase() === feed.projectId.toUpperCase() || entry['@id'].toUpperCase().endsWith(feed.projectId.toUpperCase()))) {
                        return false;
                    }
                    if (entry['@type'] === 'VssFeedId' && !(entry['label'].toUpperCase() === feed.feedId.toUpperCase() || entry['@id'].toUpperCase().endsWith(feed.feedId.toUpperCase()))) {
                        return false;
                    }
                }
                // We found matches in feedId and projectId, return the service connection
                return true;
            }
        }
        return false;
    });
}
