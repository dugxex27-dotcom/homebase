import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    private let appBackground = UIColor(red: 0x1A / 255.0, green: 0x0A / 255.0, blue: 0x3E / 255.0, alpha: 1.0)

    override open func viewDidLoad() {
        super.viewDidLoad()
        applyEdgeToEdgeLayout()
    }

    override open func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applyEdgeToEdgeLayout()
    }

    private func applyEdgeToEdgeLayout() {
        view.backgroundColor = appBackground
        additionalSafeAreaInsets = .zero

        guard let webView else { return }

        webView.backgroundColor = appBackground
        webView.scrollView.backgroundColor = appBackground
        webView.isOpaque = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
    }
}
