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
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const path = require("path");
const ngToolRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const packUtils = require("azure-pipelines-tasks-packaging-common/PackUtilities");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
class PackOptions {
    constructor(nuGetPath, outputDir, includeReferencedProjects, version, properties, basePath, createSymbolsPackage, toolPackage, verbosity, configFile, environment) {
        this.nuGetPath = nuGetPath;
        this.outputDir = outputDir;
        this.includeReferencedProjects = includeReferencedProjects;
        this.version = version;
        this.properties = properties;
        this.basePath = basePath;
        this.createSymbolsPackage = createSymbolsPackage;
        this.toolPackage = toolPackage;
        this.verbosity = verbosity;
        this.configFile = configFile;
        this.environment = environment;
    }
}
function run(nuGetPath) {
    return __awaiter(this, void 0, void 0, function* () {
        nutil.setConsoleCodePage();
        let searchPatternInput = tl.getPathInput("searchPatternPack", true);
        let configuration = tl.getInput("configurationToPack");
        let versioningScheme = tl.getInput("versioningScheme");
        let includeRefProj = tl.getBoolInput("includeReferencedProjects");
        let versionEnvVar = tl.getInput("versionEnvVar");
        let majorVersion = tl.getInput("requestedMajorVersion");
        let minorVersion = tl.getInput("requestedMinorVersion");
        let patchVersion = tl.getInput("requestedPatchVersion");
        let timezone = tl.getInput("packTimezone");
        let propertiesInput = tl.getInput("buildProperties");
        let basePath = tl.getInput("basePath");
        let verbosity = tl.getInput("verbosityPack");
        let createSymbolsPackage = tl.getBoolInput("includeSymbols");
        let toolPackage = tl.getBoolInput("toolPackage");
        let outputDir = undefined;
        try {
            // If outputDir is not provided then the root working directory is set by default.
            // By requiring it, it will throw an error if it is not provided and we can set it to undefined.
            outputDir = tl.getPathInput("outputDir", true);
        }
        catch (error) {
            outputDir = undefined;
        }
        try {
            if (versioningScheme !== "off" && includeRefProj) {
                tl.warning(tl.loc("Warning_AutomaticallyVersionReferencedProjects"));
            }
            let version = undefined;
            switch (versioningScheme) {
                case "off":
                    break;
                case "byPrereleaseNumber":
                    tl.debug(`Getting prerelease number`);
                    let nowDateTimeString = packUtils.getNowDateString(timezone);
                    version = `${majorVersion}.${minorVersion}.${patchVersion}-CI-${nowDateTimeString}`;
                    break;
                case "byEnvVar":
                    tl.debug(`Getting version from env var: ${versionEnvVar}`);
                    version = tl.getVariable(versionEnvVar);
                    if (!version) {
                        tl.setResult(tl.TaskResult.Failed, tl.loc("Error_NoValueFoundForEnvVar"));
                        break;
                    }
                    break;
                case "byBuildNumber":
                    tl.debug("Getting version number from build number");
                    if (tl.getVariable("SYSTEM_HOSTTYPE") === "release") {
                        tl.setResult(tl.TaskResult.Failed, tl.loc("Error_AutomaticallyVersionReleases"));
                        return;
                    }
                    let buildNumber = tl.getVariable("BUILD_BUILDNUMBER");
                    tl.debug(`Build number: ${buildNumber}`);
                    let versionRegex = /\d+\.\d+\.\d+(?:\.\d+)?/;
                    let versionMatches = buildNumber.match(versionRegex);
                    if (!versionMatches) {
                        tl.setResult(tl.TaskResult.Failed, tl.loc("Error_NoVersionFoundInBuildNumber"));
                        return;
                    }
                    if (versionMatches.length > 1) {
                        tl.warning(tl.loc("Warning_MoreThanOneVersionInBuildNumber"));
                    }
                    version = versionMatches[0];
                    break;
            }
            tl.debug(`Version to use: ${version}`);
            if (outputDir && !tl.exist(outputDir)) {
                tl.debug(`Creating output directory: ${outputDir}`);
                tl.mkdirP(outputDir);
            }
            let useLegacyFind = tl.getVariable("NuGet.UseLegacyFindFiles") === "true";
            let filesList = [];
            if (!useLegacyFind) {
                let findOptions = {};
                let matchOptions = {};
                let searchPatterns = nutil.getPatternsArrayFromInput(searchPatternInput);
                filesList = tl.findMatch(undefined, searchPatterns, findOptions, matchOptions);
            }
            else {
                filesList = nutil.resolveFilterSpec(searchPatternInput);
            }
            tl.debug(`Found ${filesList.length} files`);
            filesList.forEach(file => {
                tl.debug(`--File: ${file}`);
            });
            let props = [];
            if (configuration && configuration !== "$(BuildConfiguration)") {
                props.push(`Configuration=${configuration}`);
            }
            if (propertiesInput) {
                props = props.concat(propertiesInput.split(";"));
            }
            let environmentSettings = {
                extensionsDisabled: true
            };
            let packOptions = new PackOptions(nuGetPath, outputDir, includeRefProj, version, props, basePath, createSymbolsPackage, toolPackage, verbosity, undefined, environmentSettings);
            for (const file of filesList) {
                yield pack(file, packOptions);
            }
        }
        catch (err) {
            tl.error(err);
            tl.setResult(tl.TaskResult.Failed, tl.loc("Error_PackageFailure"));
        }
    });
}
exports.run = run;
function pack(file, options) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(tl.loc("Info_AttemptingToPackFile") + file);
        let nugetTool = ngToolRunner.createNuGetToolRunner(options.nuGetPath, options.environment, undefined);
        nugetTool.arg("pack");
        nugetTool.arg(file);
        nugetTool.arg("-NonInteractive");
        nugetTool.arg("-OutputDirectory");
        if (options.outputDir) {
            nugetTool.arg(options.outputDir);
        }
        else {
            nugetTool.arg(path.dirname(file));
        }
        if (options.basePath) {
            nugetTool.arg("-BasePath");
            nugetTool.arg(options.basePath);
        }
        if (options.properties && options.properties.length > 0) {
            nugetTool.arg("-Properties");
            nugetTool.arg(options.properties.join(";"));
        }
        nugetTool.argIf(options.includeReferencedProjects, "-IncludeReferencedProjects");
        nugetTool.argIf(options.createSymbolsPackage, "-Symbols");
        nugetTool.argIf(options.toolPackage, "-Tool");
        if (options.version) {
            nugetTool.arg("-version");
            nugetTool.arg(options.version);
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
            telemetry.logResult('Packaging', 'NuGetCommand', execResult);
            throw tl.loc("Error_NugetFailedWithCodeAndErr", execResult, stdErrText.trim());
        }
        return execResult;
    });
}
