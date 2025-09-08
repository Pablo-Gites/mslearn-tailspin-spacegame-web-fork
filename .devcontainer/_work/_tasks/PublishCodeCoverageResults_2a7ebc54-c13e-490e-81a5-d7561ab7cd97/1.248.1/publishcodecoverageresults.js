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
const ccUtil = require("azure-pipelines-tasks-codecoverage-tools/codecoverageutilities");
const os = require("os");
const ci = require("./cieventlogger");
// Main entry point of this task.
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Initialize localization
            tl.setResourcePath(path.join(__dirname, 'task.json'));
            // Get input values
            const codeCoverageTool = tl.getInput('codeCoverageTool', true);
            const summaryFileLocation = tl.getInput('summaryFileLocation', true);
            const reportDirectory = tl.getInput('reportDirectory');
            const additionalFiles = tl.getInput('additionalCodeCoverageFiles');
            const failIfCoverageIsEmpty = tl.getBoolInput('failIfCoverageEmpty');
            const workingDirectory = tl.getVariable('System.DefaultWorkingDirectory');
            const pathToSources = tl.getInput('pathToSources');
            let autogenerateHtmlReport = true;
            let tempFolder = undefined;
            let disableCoverageAutoGenerate = tl.getVariable('disable.coverage.autogenerate');
            ci.addToConsolidatedCi('disableCoverageAutoGenerate', disableCoverageAutoGenerate);
            const disableAutoGenerate = disableCoverageAutoGenerate
                || (codeCoverageTool.toLowerCase() === 'jacoco' && isNullOrWhitespace(pathToSources));
            if (disableAutoGenerate) {
                tl.debug('disabling auto generation');
                autogenerateHtmlReport = false;
                tempFolder = resolvePathToSingleItem(workingDirectory, reportDirectory, true);
            }
            // Resolve the summary file path.
            // It may contain wildcards allowing the path to change between builds, such as for:
            // $(System.DefaultWorkingDirectory)\artifacts***$(Configuration)\testresults\coverage\cobertura.xml
            const resolvedSummaryFile = resolvePathToSingleItem(workingDirectory, summaryFileLocation, false);
            tl.debug('Resolved summary file: ' + resolvedSummaryFile);
            if (failIfCoverageIsEmpty && (yield ccUtil.isCodeCoverageFileEmpty(resolvedSummaryFile, codeCoverageTool))) {
                throw tl.loc('NoCodeCoverage');
            }
            else if (!tl.exist(resolvedSummaryFile)) {
                tl.warning(tl.loc('NoCodeCoverage'));
            }
            else {
                if (autogenerateHtmlReport) {
                    tempFolder = path.join(getTempFolder(), 'cchtml');
                    tl.debug('Generating Html Report using ReportGenerator: ' + tempFolder);
                    const result = yield generateHtmlReport(summaryFileLocation, tempFolder, pathToSources);
                    tl.debug('Result: ' + result);
                    if (!result) {
                        tempFolder = resolvePathToSingleItem(workingDirectory, reportDirectory, true);
                    }
                    else {
                        // Ignore Html Report dirs going forward
                        if (reportDirectory) {
                            // Resolve the report directory.
                            // It may contain wildcards allowing the path to change between builds, such as for:
                            // $(System.DefaultWorkingDirectory)\artifacts***$(Configuration)\testresults\coverage
                            tl.warning(tl.loc('IgnoringReportDirectory'));
                            autogenerateHtmlReport = true;
                        }
                    }
                    tl.debug('Report directory: ' + tempFolder);
                }
                let additionalFileMatches = undefined;
                // Get any 'Additional Files' to publish as build artifacts
                const findOptions = { allowBrokenSymbolicLinks: false, followSymbolicLinks: false, followSpecifiedSymbolicLink: false };
                const matchOptions = { matchBase: true };
                if (additionalFiles) {
                    // Resolve matches of the 'Additional Files' pattern
                    additionalFileMatches = tl.findMatch(workingDirectory, additionalFiles, findOptions, matchOptions);
                    additionalFileMatches = additionalFileMatches.filter(file => pathExistsAsFile(file));
                    tl.debug(tl.loc('FoundNMatchesForPattern', additionalFileMatches.length, additionalFiles));
                }
                // Publish code coverage data
                const ccPublisher = new tl.CodeCoveragePublisher();
                ccPublisher.publish(codeCoverageTool, resolvedSummaryFile, tempFolder, additionalFileMatches);
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err);
        }
        finally {
            ci.fireConsolidatedCi();
        }
    });
}
// Resolves the specified path to a single item based on whether it contains wildcards
function resolvePathToSingleItem(workingDirectory, pathInput, isDirectory) {
    // Default to using the specific pathInput value
    let resolvedPath = pathInput;
    if (pathInput) {
        // Find match patterns won't work if the directory has a trailing slash
        if (isDirectory && (pathInput.endsWith('/') || pathInput.endsWith('\\'))) {
            pathInput = pathInput.slice(0, -1);
        }
        // Resolve matches of the pathInput pattern
        const findOptions = { allowBrokenSymbolicLinks: false, followSymbolicLinks: false, followSpecifiedSymbolicLink: false };
        const pathMatches = tl.findMatch(workingDirectory, pathInput, findOptions);
        tl.debug(tl.loc('FoundNMatchesForPattern', pathMatches.length, pathInput));
        // Were any matches found?
        if (pathMatches.length === 0) {
            resolvedPath = undefined;
        }
        else {
            // Select the path to be used from the matches
            resolvedPath = pathMatches[0];
            // If more than one path matches, use the first and issue a warning
            if (pathMatches.length > 1) {
                tl.warning(tl.loc('MultipleSummaryFilesFound', resolvedPath));
            }
        }
    }
    // Return resolved path
    return resolvedPath;
}
// Gets whether the specified path exists as file.
function pathExistsAsFile(path) {
    try {
        return tl.stats(path).isFile();
    }
    catch (error) {
        tl.debug(error);
        return false;
    }
}
function isNullOrWhitespace(input) {
    if (typeof input === 'undefined' || input == null) {
        return true;
    }
    return input.replace(/\s/g, '').length < 1;
}
function getTempFolder() {
    try {
        tl.assertAgent('2.115.0');
        const tmpDir = tl.getVariable('Agent.TempDirectory');
        return tmpDir;
    }
    catch (err) {
        tl.warning(tl.loc('UpgradeAgentMessage'));
        return os.tmpdir();
    }
}
function generateHtmlReport(summaryFile, targetDir, pathToSources) {
    return __awaiter(this, void 0, void 0, function* () {
        const osvar = process.platform;
        let dotnet;
        const dotnetPath = tl.which('dotnet', false);
        if (!dotnetPath && osvar !== 'win32') {
            tl.warning(tl.loc('InstallDotNetCoreForHtmlReport'));
            return false;
        }
        if (!dotnetPath && osvar === 'win32') {
            // use full .NET to execute
            dotnet = tl.tool(path.join(__dirname, 'net47', 'ReportGenerator.exe'));
        }
        else {
            dotnet = tl.tool(dotnetPath);
            dotnet.arg(path.join(__dirname, 'netcoreapp2.0', 'ReportGenerator.dll'));
        }
        dotnet.arg('-reports:' + summaryFile);
        dotnet.arg('-targetdir:' + targetDir);
        dotnet.arg('-reporttypes:HtmlInline_AzurePipelines');
        if (!isNullOrWhitespace(pathToSources)) {
            dotnet.arg('-sourcedirs:' + pathToSources);
        }
        try {
            const result = yield dotnet.exec({
                ignoreReturnCode: true,
                failOnStdErr: false,
                errStream: process.stdout,
                outStream: process.stdout
            });
            // Listen for stderr.
            let isError = false;
            dotnet.on('stderr', (data) => {
                console.error(data.toString());
                isError = true;
            });
            if (result === 0 && !isError) {
                console.log(tl.loc('GeneratedHtmlReport', targetDir));
                return true;
            }
            else {
                tl.warning(tl.loc('FailedToGenerateHtmlReport', result));
            }
        }
        catch (err) {
            tl.warning(tl.loc('FailedToGenerateHtmlReport', err));
        }
        return false;
    });
}
run();
