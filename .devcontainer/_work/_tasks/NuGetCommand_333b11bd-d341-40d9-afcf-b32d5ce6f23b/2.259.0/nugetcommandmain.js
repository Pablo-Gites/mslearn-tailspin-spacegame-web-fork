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
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const nuGetGetter = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolGetter");
const peParser = require("azure-pipelines-tasks-packaging-common/pe-parser");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
const nugetCustom = require("./nugetcustom");
const nugetPack = require("./nugetpack");
const nugetPublish = require("./nugetpublisher");
const nugetRestore = require("./nugetrestore");
const linuxUtility = require("./linuxutility");
const NUGET_EXE_CUSTOM_LOCATION = "NuGetExeCustomLocation";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        tl.setResourcePath(path.join(__dirname, "task.json"));
        // Getting NuGet
        tl.debug("Getting NuGet");
        let nuGetPath;
        let nugetVersion;
        let msBuildVersion;
        try {
            if (linuxUtility.detectUnsupportedUbuntuVersion()) {
                tl.setResult(tl.TaskResult.Failed, tl.loc("Error_IncompatibleUbuntuVersion"));
                return;
            }
            msBuildVersion = yield nuGetGetter.getMSBuildVersionString();
            nuGetPath = tl.getVariable(nuGetGetter.NUGET_EXE_TOOL_PATH_ENV_VAR)
                || tl.getVariable(NUGET_EXE_CUSTOM_LOCATION);
            if (!nuGetPath) {
                const cachedVersionToUse = yield nuGetGetter.cacheBundledNuGet();
                nuGetPath = yield nuGetGetter.getNuGet(cachedVersionToUse);
            }
            const nugetVersionInfo = yield peParser.getFileVersionInfoAsync(nuGetPath);
            if (nugetVersionInfo && nugetVersionInfo.fileVersion) {
                nugetVersion = nugetVersionInfo.fileVersion.toString();
            }
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, error.message);
            return;
        }
        finally {
            _logNugetStartupVariables(nuGetPath, nugetVersion, msBuildVersion);
        }
        const nugetCommand = tl.getInput("command", true);
        switch (nugetCommand) {
            case "restore":
                nugetRestore.run(nuGetPath);
                break;
            case "pack":
                nugetPack.run(nuGetPath);
                break;
            case "push":
                nugetPublish.run(nuGetPath);
                break;
            case "custom":
                nugetCustom.run(nuGetPath);
                break;
            default:
                tl.setResult(tl.TaskResult.Failed, tl.loc("Error_CommandNotRecognized", nugetCommand));
                break;
        }
    });
}
function _logNugetStartupVariables(nuGetPath, nugetVersion, msBuildSemVer) {
    try {
        const nugetfeedtype = tl.getInput("nugetfeedtype");
        let externalendpoint = null;
        if (nugetfeedtype != null && nugetfeedtype === "external") {
            const epId = tl.getInput("externalendpoint");
            if (epId) {
                externalendpoint = {
                    feedName: tl.getEndpointUrl(epId, false).replace(/\W/g, ""),
                    feedUri: tl.getEndpointUrl(epId, false),
                };
            }
        }
        let externalendpoints = tl.getDelimitedInput("externalendpoints", ",");
        if (externalendpoints) {
            externalendpoints = externalendpoints.reduce((ary, id) => {
                const te = {
                    feedName: tl.getEndpointUrl(id, false).replace(/\W/g, ""),
                    feedUri: tl.getEndpointUrl(id, false),
                };
                ary.push(te);
                return ary;
            }, []);
        }
        const nugetTelem = {
            "command": tl.getInput("command"),
            "NUGET_EXE_TOOL_PATH_ENV_VAR": tl.getVariable(nuGetGetter.NUGET_EXE_TOOL_PATH_ENV_VAR),
            "NUGET_EXE_CUSTOM_LOCATION": tl.getVariable(NUGET_EXE_CUSTOM_LOCATION),
            "searchPatternPack": tl.getPathInput("searchPatternPack"),
            "configurationToPack": tl.getInput("configurationToPack"),
            "versioningScheme": tl.getInput("versioningScheme"),
            "includeReferencedProjects": tl.getBoolInput("includeReferencedProjects"),
            "versionEnvVar": tl.getInput("versioningScheme") === "byEnvVar" ?
                tl.getVariable(tl.getInput("versionEnvVar")) : null,
            "requestedMajorVersion": tl.getInput("requestedMajorVersion"),
            "requestedMinorVersion": tl.getInput("requestedMinorVersion"),
            "requestedPatchVersion": tl.getInput("requestedPatchVersion"),
            "packTimezone": tl.getInput("packTimezone"),
            "buildProperties": tl.getInput("buildProperties"),
            "basePath": tl.getInput("basePath"),
            "verbosityPack": tl.getInput("verbosityPack"),
            "includeSymbols": tl.getBoolInput("includeSymbols"),
            "NuGet.UseLegacyFindFiles": tl.getVariable("NuGet.UseLegacyFindFiles"),
            "NuGetTasks.IsHostedTestEnvironment": tl.getVariable("NuGetTasks.IsHostedTestEnvironment"),
            "System.TeamFoundationCollectionUri": tl.getVariable("System.TeamFoundationCollectionUri"),
            "NuGet.OverwritePackagingCollectionUrl": tl.getVariable("NuGet.OverwritePackagingCollectionUrl"),
            "externalendpoint": externalendpoint,
            "externalendpoints": externalendpoints,
            "allowpackageconflicts": tl.getInput("allowpackageconflicts"),
            "includenugetorg": tl.getInput("includenugetorg"),
            "nocache": tl.getInput("nocache"),
            "disableparallelprocessing": tl.getInput("disableParallelProcessing"),
            "nugetconfigpath": tl.getInput("nugetconfigpath"),
            "nugetfeedtype": nugetfeedtype,
            "searchpatternpush": tl.getInput("searchpatternpush"),
            "selectorconfig": tl.getInput("selectorconfig"),
            "solution": tl.getInput("solution"),
            "verbositypush": tl.getInput("verbositypush"),
            "verbosityrestore": tl.getInput("verbosityrestore"),
            "nuGetPath": nuGetPath,
            "nugetVersion": nugetVersion,
            "msBuildVersion": msBuildSemVer
        };
        telemetry.emitTelemetry("Packaging", "NuGetCommand", nugetTelem);
    }
    catch (err) {
        tl.debug(`Unable to log NuGet task init telemetry. Err:( ${err} )`);
    }
}
main();
