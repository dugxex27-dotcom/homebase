import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    private let appBackground = UIColor(red: 0x1A / 255.0, green: 0x0A / 255.0, blue: 0x3E / 255.0, alpha: 1.0)

    override open func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = appBackground
        webView?.backgroundColor = appBackground
        webView?.scrollView.backgroundColor = appBackground
        webView?.isOpaque = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    override open func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        view.backgroundColor = appBackground
        webView?.backgroundColor = appBackground
        webView?.scrollView.backgroundColor = appBackground
    }
}
