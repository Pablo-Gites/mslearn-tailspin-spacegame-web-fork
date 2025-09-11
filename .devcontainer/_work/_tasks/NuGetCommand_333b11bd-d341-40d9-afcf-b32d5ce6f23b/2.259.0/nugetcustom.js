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
const auth = require("azure-pipelines-tasks-packaging-common/nuget/Authentication");
const ngToolRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const tl = require("azure-pipelines-task-lib/task");
const util_1 = require("azure-pipelines-tasks-packaging-common/util");
const peParser = require("azure-pipelines-tasks-packaging-common/pe-parser/index");
const pkgLocationUtils = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
const ProductVersionHelper_1 = require("azure-pipelines-tasks-packaging-common/nuget/ProductVersionHelper");
class NuGetExecutionOptions {
    constructor(nuGetPath, environment, args, authInfo) {
        this.nuGetPath = nuGetPath;
        this.environment = environment;
        this.args = args;
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
            (0, util_1.logError)(error);
            throw error;
        }
        nutil.setConsoleCodePage();
        const buildIdentityDisplayName = null;
        const buildIdentityAccount = null;
        const args = tl.getInput("arguments", false);
        const version = yield peParser.getFileVersionInfoAsync(nuGetPath);
        const parsedVersion = (0, ProductVersionHelper_1.getVersionFallback)(version);
        if (parsedVersion.a < 3 || (parsedVersion.a <= 3 && parsedVersion.b < 5)) {
            tl.setResult(tl.TaskResult.Failed, tl.loc("Info_NuGetSupportedAfter3_5", version.strings.ProductVersion));
            return;
        }
        try {
            // Clauses ordered in this way to avoid short-circuit evaluation, so the debug info printed by the functions
            // is unconditionally displayed
            const quirks = yield ngToolRunner.getNuGetQuirksAsync(nuGetPath);
            const useV1CredProvider = ngToolRunner.isCredentialProviderEnabled(quirks);
            const useV2CredProvider = ngToolRunner.isCredentialProviderV2Enabled(quirks);
            const credProviderPath = nutil.locateCredentialProvider(useV2CredProvider);
            // useCredConfig not placed here: This task will only support NuGet versions >= 3.5.0
            // which support credProvider both hosted and OnPrem
            const accessToken = pkgLocationUtils.getSystemAccessToken();
            let urlPrefixes = packagingLocation.PackagingUris;
            tl.debug(`Discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            const testPrefixes = tl.getVariable("NuGetTasks.ExtraUrlPrefixesForTesting");
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(";"));
                tl.debug(`All URL prefixes: ${urlPrefixes}`);
            }
            const authInfo = new auth.NuGetExtendedAuthInfo(new auth.InternalAuthInfo(urlPrefixes, accessToken, ((useV1CredProvider || useV2CredProvider) ? credProviderPath : null), false), []);
            const environmentSettings = {
                credProviderFolder: useV2CredProvider === false ? credProviderPath : null,
                V2CredProviderPath: useV2CredProvider === true ? credProviderPath : null,
                extensionsDisabled: true,
            };
            const executionOptions = new NuGetExecutionOptions(nuGetPath, environmentSettings, args, authInfo);
            yield runNuGet(executionOptions);
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc("BuildIdentityPermissionsHint", buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, "");
        }
    });
}
exports.run = run;
function runNuGet(executionOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const nugetTool = ngToolRunner.createNuGetToolRunner(executionOptions.nuGetPath, executionOptions.environment, executionOptions.authInfo);
        nugetTool.line(executionOptions.args);
        nugetTool.arg("-NonInteractive");
        // Listen for stderr output to write timeline results for the build.
        let stdErrText = "";
        nugetTool.on('stderr', (data) => {
            stdErrText += data.toString('utf-8');
        });
        const execResult = yield nugetTool.exec({ ignoreReturnCode: true });
        if (execResult !== 0) {
            telemetry.logResult("Packaging", "NuGetCommand", execResult);
            throw tl.loc("Error_NugetFailedWithCodeAndErr", execResult, stdErrText.trim());
        }
        return execResult;
    });
}
