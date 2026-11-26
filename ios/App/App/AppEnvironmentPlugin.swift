import Capacitor

/** TestFlight uses sandboxReceipt; an App Store installation uses receipt. */
@objc(AppEnvironmentPlugin)
public class AppEnvironmentPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppEnvironmentPlugin"
    public let jsName = "AppEnvironment"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isTestFlight", returnType: CAPPluginReturnPromise)
    ]

    @objc func isTestFlight(_ call: CAPPluginCall) {
        let testFlight = Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        call.resolve(["testFlight": testFlight])
    }
}
