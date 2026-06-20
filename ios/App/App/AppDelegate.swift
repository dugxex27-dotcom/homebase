import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Force-hide splash via JS bridge after 3 s — works without plugin SPM registration
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            self.forceSplashHide(in: self.window?.rootViewController)
        }
    }

    private func forceSplashHide(in vc: UIViewController?) {
        guard let vc = vc else { return }
        if let bridgeVC = vc as? CAPBridgeViewController {
            let js = "try{var c=window.Capacitor;if(c&&c.Plugins&&c.Plugins.SplashScreen){c.Plugins.SplashScreen.hide({fadeOutDuration:0})}}catch(e){}"
            bridgeVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
        for child in vc.children { forceSplashHide(in: child) }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
