import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Try at 1.5s and 3s — covers both fast and slow WebView loads
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { self.forceSplashHide() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { self.forceSplashHide() }
    }

    private func forceSplashHide() {
        guard let rootVC = self.window?.rootViewController else { return }
        removeFrom(vc: rootVC)
    }

    private func removeFrom(vc: UIViewController) {
        // Strategy 1: remove child VCs whose class name contains Splash
        for child in vc.children {
            let name = String(describing: type(of: child)).lowercased()
            if name.contains("splash") || name.contains("launch") {
                child.willMove(toParent: nil)
                UIView.animate(withDuration: 0.3, animations: {
                    child.view.alpha = 0
                }, completion: { _ in
                    child.view.removeFromSuperview()
                    child.removeFromParent()
                })
                return
            }
            removeFrom(vc: child)
        }
        // Strategy 2: JS bridge call (works when plugin IS registered)
        if let bridgeVC = vc as? CAPBridgeViewController {
            let js = "try{var c=window.Capacitor;if(c&&c.Plugins&&c.Plugins.SplashScreen){c.Plugins.SplashScreen.hide({fadeOutDuration:300})}}catch(e){}"
            bridgeVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
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
