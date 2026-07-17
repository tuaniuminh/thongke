import json
import re
import os

def update_version():
    package_json_path = 'package.json'
    pbxproj_path = 'ios/App/App.xcodeproj/project.pbxproj'

    if not os.path.exists(package_json_path):
        print("package.json not found!")
        return

    if not os.path.exists(pbxproj_path):
        print(f"{pbxproj_path} not found! Run cap add ios first.")
        return

    with open(package_json_path, 'r', encoding='utf-8') as f:
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

if __name__ == '__main__':
    update_version()
    configure_ios_swizzler()
