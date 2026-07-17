import json
import re
import os

def update_version():
    version_json_path = 'version.json'
    pbxproj_path = 'ios/App/App.xcodeproj/project.pbxproj'

    if not os.path.exists(version_json_path):
        print("version.json not found!")
        return

    if not os.path.exists(pbxproj_path):
        print(f"{pbxproj_path} not found! Run cap add ios first.")
        return

    with open(version_json_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)
    version = pkg.get('version', '1.0.0')

    with open(pbxproj_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace MARKETING_VERSION and CURRENT_PROJECT_VERSION in project.pbxproj
    updated_content = re.sub(r'MARKETING_VERSION\s*=\s*[^;]+;', f'MARKETING_VERSION = {version};', content)
    updated_content = re.sub(r'CURRENT_PROJECT_VERSION\s*=\s*[^;]+;', f'CURRENT_PROJECT_VERSION = {version};', updated_content)

    with open(pbxproj_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    print(f"Xcode project versions updated to {version} successfully.")

def configure_ios_swizzler():
    app_delegate_path = None
    for root, dirs, files in os.walk('ios'):
        for file in files:
            if file == 'AppDelegate.swift':
                app_delegate_path = os.path.join(root, file)
                break
        if app_delegate_path:
            break
            
    if not app_delegate_path:
        print("ERROR: AppDelegate.swift was not found in the 'ios' directory!")
        import sys
        sys.exit(1)
        
    with open(app_delegate_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Check if already injected
    if 'swizzleViewDidAppear' in content:
        print("AppDelegate.swift already contains swizzler configuration.")
        return
        
    # Add imports if missing
    if 'import WebKit' not in content:
        content = content.replace('import Capacitor', 'import Capacitor\nimport WebKit')
        
    # Inject swizzler trigger inside didFinishLaunchingWithOptions
    target_func = 'func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {'
    replacement_func = target_func + '\n        _ = AppDelegate.swizzleViewDidAppear'
    
    if target_func in content:
        content = content.replace(target_func, replacement_func)
    else:
        print("ERROR: didFinishLaunchingWithOptions function not found in AppDelegate.swift!")
        import sys
        sys.exit(1)
        
    # Append the swizzler static property inside AppDelegate class body
    class_marker = 'class AppDelegate: UIResponder, UIApplicationDelegate {'
    swizzler_static_property = class_marker + """
    static let swizzleViewDidAppear: Void = {
        let originalSelector = #selector(UIViewController.viewDidAppear(_:))
        let swizzledSelector = #selector(UIViewController.swizzled_viewDidAppear(_:))
        
        guard let originalMethod = class_getInstanceMethod(UIViewController.self, originalSelector),
              let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSelector) else {
            return
        }
        
        method_exchangeImplementations(originalMethod, swizzledMethod)
    }()
"""
    if class_marker in content:
        content = content.replace(class_marker, swizzler_static_property)
    else:
        # Try without UIResponder in case it differs
        class_marker_alt = 'class AppDelegate: UIApplicationDelegate {'
        if class_marker_alt in content:
            content = content.replace(class_marker_alt, class_marker_alt + """
    static let swizzleViewDidAppear: Void = {
        let originalSelector = #selector(UIViewController.viewDidAppear(_:))
        let swizzledSelector = #selector(UIViewController.swizzled_viewDidAppear(_:))
        
        guard let originalMethod = class_getInstanceMethod(UIViewController.self, originalSelector),
              let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSelector) else {
            return
        }
        
        method_exchangeImplementations(originalMethod, swizzledMethod)
    }()
""")
        else:
            print("ERROR: AppDelegate class declaration not found in AppDelegate.swift!")
            import sys
            sys.exit(1)
            
    # Append UIViewController extension at the very bottom of the file
    extension_code = """
extension UIViewController {
    @objc func swizzled_viewDidAppear(_ animated: Bool) {
        self.swizzled_viewDidAppear(animated)
        
        if let bridgeVC = self as? CAPBridgeViewController {
            configureBridgeWebView(bridgeVC)
            
            for delay in [0.5, 1.0, 2.0, 3.0, 5.0, 8.0] {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak bridgeVC] in
                    if let vc = bridgeVC {
                        self.configureBridgeWebView(vc)
                    }
                }
            }
            
            // 1. Run a fast theme sync timer (every 100ms for 3 seconds)
            // This captures the correct CSS background color immediately at startup
            var fastRunCount = 0
            Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak bridgeVC] timer in
                guard let vc = bridgeVC, let webView = vc.webView else {
                    timer.invalidate()
                    return
                }
                
                fastRunCount += 1
                if fastRunCount > 30 {
                    timer.invalidate()
                    // 2. Fall back to a slow periodic sync (every 2.0s) for manual theme toggles
                    self.startSlowThemeSync(vc)
                }
                
                self.syncThemeColor(vc: vc, webView: webView)
            }
        }
    }
    
    private func startSlowThemeSync(_ vc: CAPBridgeViewController) {
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak vc] timer in
            guard let bridgeVC = vc, let webView = bridgeVC.webView else {
                timer.invalidate()
                return
            }
            self.syncThemeColor(vc: bridgeVC, webView: webView)
        }
    }
    
    private func syncThemeColor(vc: CAPBridgeViewController, webView: WKWebView) {
        webView.evaluateJavaScript("window.getComputedStyle(document.body).backgroundColor") { [weak vc, weak webView] (value, error) in
            guard let vc = vc, let webView = webView, let colorStr = value as? String else { return }
            
            func parseRGBColor(_ colorStr: String) -> UIColor? {
                let cleanStr = colorStr.replacingOccurrences(of: " ", with: "")
                if cleanStr.hasPrefix("rgb(") {
                    let components = cleanStr.replacingOccurrences(of: "rgb(", with: "").replacingOccurrences(of: ")", with: "").components(separatedBy: ",")
                    if components.count >= 3,
                       let r = Float(components[0]),
                       let g = Float(components[1]),
                       let b = Float(components[2]) {
                        return UIColor(red: CGFloat(r/255.0), green: CGFloat(g/255.0), blue: CGFloat(b/255.0), alpha: 1.0)
                    }
                } else if cleanStr.hasPrefix("rgba(") {
                    let components = cleanStr.replacingOccurrences(of: "rgba(", with: "").replacingOccurrences(of: ")", with: "").components(separatedBy: ",")
                    if components.count >= 4,
                       let r = Float(components[0]),
                       let g = Float(components[1]),
                       let b = Float(components[2]),
                       let a = Float(components[3]) {
                        return UIColor(red: CGFloat(r/255.0), green: CGFloat(g/255.0), blue: CGFloat(b/255.0), alpha: CGFloat(a))
                    }
                }
                return nil
            }
            
            if let color = parseRGBColor(colorStr) {
                webView.isOpaque = true
                webView.backgroundColor = color
                webView.scrollView.backgroundColor = color
                vc.view.backgroundColor = color
            }
        }
    }
    
    private func configureBridgeWebView(_ vc: CAPBridgeViewController) {
        guard let webView = vc.webView else { return }
        webView.allowsBackForwardNavigationGestures = true
        
        let scrollView = webView.scrollView
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.alwaysBounceHorizontal = false
        
        for subview in scrollView.subviews {
            if let scroll = subview as? UIScrollView {
                scroll.bounces = true
                scroll.alwaysBounceVertical = true
            }
        }
        
        let js = "console.log('[NativeSwift] configureWebView executed (swizzled). bounces=\\(scrollView.bounces), alwaysBounceVertical=\\(scrollView.alwaysBounceVertical)')"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
"""
    content += extension_code
    
    with open(app_delegate_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("AppDelegate.swift successfully swizzled for custom elastic bounce.")


def configure_ios_permissions():
    info_plist_path = 'ios/App/App/Info.plist'
    if not os.path.exists(info_plist_path):
        print(f"{info_plist_path} not found! Run cap add ios first.")
        return
        
    with open(info_plist_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Add Camera & Photo Library permissions if not exists
    if 'NSCameraUsageDescription' not in content:
        permissions = """
\t<key>NSCameraUsageDescription</key>
\t<string>FamiLife cần truy cập camera để chụp ảnh kết quả xét nghiệm và máy đo huyết áp.</string>
\t<key>NSPhotoLibraryUsageDescription</key>
\t<string>FamiLife cần truy cập thư viện ảnh để bạn chọn ảnh kết quả y tế và huyết áp.</string>
\t<key>NSPhotoLibraryAddUsageDescription</key>
\t<string>FamiLife cần truy cập thư viện ảnh để lưu ảnh kết quả y tế và huyết áp.</string>"""
        if '<dict>' in content:
            content = content.replace('<dict>', '<dict>' + permissions, 1)
            print("Camera & Photo Library permissions successfully added to Info.plist.")

    # 2. Force localization of native elements (like camera interface) to Vietnamese
    content = re.sub(
        r'<key>CFBundleDevelopmentRegion</key>\s*<string>[^<]+</string>',
        '<key>CFBundleDevelopmentRegion</key>\n\t<string>vi</string>',
        content
    )

    # 3. Add CFBundleLocalizations array if not exists to let iOS know we support Vietnamese
    if 'CFBundleLocalizations' not in content:
        localizations = """
\t<key>CFBundleLocalizations</key>
\t<array>
\t\t<string>vi</string>
\t</array>"""
        if '<dict>' in content:
            content = content.replace('<dict>', '<dict>' + localizations, 1)
            print("Vietnamese localizations array added to Info.plist.")

    with open(info_plist_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_version()
    configure_ios_swizzler()
    configure_ios_permissions()
