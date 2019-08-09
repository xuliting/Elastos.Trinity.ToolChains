const path = require("path")

const RunHelper = require("../helpers/run.helper")
const ManifestHelper = require("../helpers/manifest.helper")
const IonicHelper = require("../helpers/ionic.helper")

exports.command = 'run'
exports.describe = 'Deploys current DApp to your connected device'
exports.builder = {
  platform: {
    alias: "p",
    describe: "Platform to deploy to (android|ios)",
    require: true
  },
  /*idkeystore: {
    alias: "id",
    describe: "Identity keystore file to be used to sign DApp EPK",
    require: true
  }*/
}
exports.handler = function (argv) {
    var platform = argv.platform
    var idKeystorePath = argv.idkeystore
    switch (platform) {
        case "android":
            deployAndroidDApp(idKeystorePath)
            break;
        case "ios":
            console.log("Not yet implemented")
            break;
        default:
            console.log("ERROR - Not a valid platform")
    }
}

/**
 * The process to run one of our ionic-based DApps is as following:
 * - Retrieve user's computer IP (to be able to ionic serve / hot reload)
 * - Update the start_url in the trinity manifest
 * - npm install
 * - ionic build
 * - pack_epk
 * - sign_epk
 * - push and run the EPK on the device (adb push/shell am start, on android)
 * - ionic serve (for hot reload inside trinity, when user saves his files)
 */
function deployAndroidDApp(idKeystorePath) {
    var runHelper = new RunHelper()
    var manifestHelper = new ManifestHelper()
    var ionicHelper = new IonicHelper()

    // Retrieve user's computer IP (to be able to ionic serve / hot reload)
    // Update the start_url in the trinity manifest
    var manifestPath = path.join(process.cwd(), "manifest.json")
    manifestHelper.updateManifestForRemoteIndex(manifestPath)

    ionicHelper.updatedNpmDependencies().then(() => {
        ionicHelper.runIonicBuildDev().then(() => {
            runHelper.packEPK(manifestPath).then((outputEPKPath)=>{
                runHelper.signEPK(outputEPKPath, idKeystorePath).then(()=>{
                    runHelper.androidUploadEPK(outputEPKPath).then(()=>{
                        runHelper.androidInstallTempEPK().then(()=>{
                            console.log("RUN OPERATION COMPLETED")
                            console.log("NOW RUNNING THE APP FOR DEVELOPMENT")
                            ionicHelper.runIonicServe()
                        })
                        .catch((err)=>{
                            console.error("Failre to install your DApp on your device")
                            console.error("Error:",err)
                        })
                    })
                    .catch((err)=>{
                        console.error("Failed to upload your DApp to your device")
                        console.error("Error:",err)
                    })
                })
                .catch((err)=>{
                    console.error("Failed to sign your EPK file")
                    console.error("Error:",err)
                })
            })
            .catch((err)=>{
                console.error("Failed to pack your DApp into a EPK file")
                console.error("Error:",err)
            })          
        })
        .catch((err)=>{
            console.error("Failed run ionic build")
            console.error("Error:",err)
        })          
    })
    .catch((err)=>{
        console.error("Failed install ionic dependencies")
        console.error("Error:",err)
    }) 
}