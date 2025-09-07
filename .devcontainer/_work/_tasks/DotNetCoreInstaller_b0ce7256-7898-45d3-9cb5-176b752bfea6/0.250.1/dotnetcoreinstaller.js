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
const tl = require("azure-pipelines-task-lib/task");
const toolLib = require("azure-pipelines-tool-lib/tool");
const releasesfetcher_1 = require("./releasesfetcher");
const utilities = require("./utilities");
const os = require("os");
const path = require("path");
class DotnetCoreInstaller {
    constructor(packageType, version) {
        this.packageType = packageType;
        if (!toolLib.isExplicitVersion(version)) {
            throw tl.loc("ImplicitVersionNotSupported", version);
        }
        this.version = version;
        this.cachedToolName = this.packageType === 'runtime' ? 'dncr' : 'dncs';
        ;
    }
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache
            let toolPath;
            let osSuffixes = this.detectMachineOS();
            let parts = osSuffixes[0].split("-");
            this.arch = parts.length > 1 ? parts[1] : "x64";
            toolPath = this.getLocalTool();
            if (!toolPath) {
                // download, extract, cache
                console.log(tl.loc("InstallingAfresh"));
                console.log(tl.loc("GettingDownloadUrl", this.packageType, this.version));
                let downloadUrls = yield releasesfetcher_1.DotNetCoreReleaseFetcher.getDownloadUrls(osSuffixes, this.version, this.packageType);
                toolPath = yield this.downloadAndInstall(downloadUrls);
            }
            else {
                console.log(tl.loc("UsingCachedTool", toolPath));
            }
            // Prepend the tools path. instructs the agent to prepend for future tasks
            toolLib.prependPath(toolPath);
            try {
                let globalToolPath = "";
                if (tl.osType().match(/^Win/)) {
                    globalToolPath = path.join(process.env.USERPROFILE, ".dotnet\\tools");
                }
                else {
                    globalToolPath = path.join(process.env.HOME, ".dotnet/tools");
                }
                console.log(tl.loc("PrependGlobalToolPath"));
                tl.mkdirP(globalToolPath);
                toolLib.prependPath(globalToolPath);
            }
            catch (error) {
                //nop
            }
            // Set DOTNET_ROOT for dotnet core Apphost to find runtime since it is installed to a non well-known location.
            tl.setVariable('DOTNET_ROOT', toolPath);
        });
    }
    getLocalTool() {
        console.log(tl.loc("CheckingToolCache"));
        return toolLib.findLocalTool(this.cachedToolName, this.version, this.arch);
    }
    detectMachineOS() {
        let osSuffix = [];
        let scriptRunner;
        if (tl.osType().match(/^Win/)) {
            let escapedScript = path.join(utilities.getCurrentDir(), 'externals', 'get-os-platform.ps1').replace(/'/g, "''");
            let command = `& '${escapedScript}'`;
            let powershellPath = tl.which('powershell', true);
            scriptRunner = tl.tool(powershellPath)
                .line('-NoLogo -Sta -NoProfile -NonInteractive -ExecutionPolicy Unrestricted -Command')
                .arg(command);
        }
        else {
            let scriptPath = path.join(utilities.getCurrentDir(), 'externals', 'get-os-distro.sh');
            utilities.setFileAttribute(scriptPath, "755");
            scriptRunner = tl.tool(tl.which(scriptPath, true));
        }
        let result = scriptRunner.execSync();
        if (result.code != 0) {
            throw tl.loc("getMachinePlatformFailed", result.error ? result.error.message : result.stderr);
        }
        let output = result.stdout;
        let index;
        if ((index = output.indexOf("Primary:")) >= 0) {
            let primary = output.substr(index + "Primary:".length).split(os.EOL)[0];
            osSuffix.push(primary);
            console.log(tl.loc("PrimaryPlatform", primary));
        }
        if ((index = output.indexOf("Legacy:")) >= 0) {
            let legacy = output.substr(index + "Legacy:".length).split(os.EOL)[0];
            osSuffix.push(legacy);
            console.log(tl.loc("LegacyPlatform", legacy));
        }
        if (osSuffix.length == 0) {
            throw tl.loc("CouldNotDetectPlatform");
        }
        return osSuffix;
    }
    downloadAndInstall(downloadUrls) {
        return __awaiter(this, void 0, void 0, function* () {
            let downloaded = false;
            let downloadPath = "";
            for (const url of downloadUrls) {
                try {
                    downloadPath = yield toolLib.downloadTool(url);
                    downloaded = true;
                    break;
                }
                catch (error) {
                    tl.warning(tl.loc("CouldNotDownload", url, JSON.stringify(error)));
                }
            }
            if (!downloaded) {
                throw tl.loc("FailedToDownloadPackage");
            }
            // extract
            console.log(tl.loc("ExtractingPackage", downloadPath));
            let extPath = tl.osType().match(/^Win/) ? yield toolLib.extractZip(downloadPath) : yield toolLib.extractTar(downloadPath);
            // cache tool
            console.log(tl.loc("CachingTool"));
            let cachedDir = yield toolLib.cacheDir(extPath, this.cachedToolName, this.version, this.arch);
            console.log(tl.loc("SuccessfullyInstalled", this.packageType, this.version));
            return cachedDir;
        });
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let packageType = tl.getInput('packageType', true);
        let version = tl.getInput('version', true).trim();
        console.log(tl.loc("ToolToInstall", packageType, version));
        yield new DotnetCoreInstaller(packageType, version).install();
    });
}
var taskManifestPath = path.join(__dirname, "task.json");
tl.debug("Setting resource path to " + taskManifestPath);
tl.setResourcePath(taskManifestPath);
run()
    .then(() => tl.setResult(tl.TaskResult.Succeeded, ""))
    .catch((error) => tl.setResult(tl.TaskResult.Failed, !!error.message ? error.message : error));
//# sourceMappingURL=dotnetcoreinstaller.js.map