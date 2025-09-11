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
const credentialProviderUtils_1 = require("azure-pipelines-tasks-artifacts-common/credentialProviderUtils");
const protocols_1 = require("azure-pipelines-tasks-artifacts-common/protocols");
const serviceConnectionUtils_1 = require("azure-pipelines-tasks-artifacts-common/serviceConnectionUtils");
const telemetry_1 = require("azure-pipelines-tasks-artifacts-common/telemetry");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let forceReinstallCredentialProvider = null;
        let federatedFeedAuthSuccessCount = 0;
        try {
            tl.setResourcePath(path.join(__dirname, 'task.json'));
            // Install the credential provider
            forceReinstallCredentialProvider = tl.getBoolInput("forceReinstallCredentialProvider", false);
            yield (0, credentialProviderUtils_1.installCredProviderToUserProfile)(forceReinstallCredentialProvider);
            // Configure the credential provider for both same-organization feeds and service connections
            var serviceConnections = (0, serviceConnectionUtils_1.getPackagingServiceConnections)('nuGetServiceConnections');
            yield (0, credentialProviderUtils_1.configureCredProvider)(protocols_1.ProtocolType.NuGet, serviceConnections);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, error);
        }
        finally {
            (0, telemetry_1.emitTelemetry)("Packaging", "NuGetAuthenticateV1", {
                'NuGetAuthenticate.ForceReinstallCredentialProvider': forceReinstallCredentialProvider,
                "FederatedFeedAuthCount": federatedFeedAuthSuccessCount
            });
        }
    });
}
main();
