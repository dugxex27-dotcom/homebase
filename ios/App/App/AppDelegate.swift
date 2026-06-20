import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var splashOverlay: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // iOS 26 fix: add a native UIView with splash colour immediately.
        // WKWebView HTML does not register as the "first native frame" in iOS 26
        // ExtendedLaunchMetrics, so the system LaunchScreen never dismisses.
        // A plain UIView forces that signal and the LaunchScreen transitions away.
        if let window = self.window {
            let overlay = UIView(frame: window.bounds)
            overlay.backgroundColor = UIColor(red: 0.545, green: 0.439, blue: 0.831, alpha: 1.0)
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            overlay.tag = 88421

            // Logo label
            let label = UILabel()
            label.text = "MyHomeBase™"
            label.textColor = .white
            label.font = UIFont.systemFont(ofSize: 24, weight: .semibold)
            label.sizeToFit()
            label.center = CGPoint(x: window.bounds.midX, y: window.bounds.midY)
            overlay.addSubview(label)

            window.addSubview(overlay)
            self.splashOverlay = overlay

            // Fade out after 2 s
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                UIView.animate(withDuration: 0.4, animations: {
                    overlay.alpha = 0
                }, completion: { _ in
                    overlay.removeFromSuperview()
                    self.splashOverlay = nil
                })
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
