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

def enable_swipe_gesture():
    view_controller_path = 'ios/App/App/ViewController.swift'
    
    if not os.path.exists(view_controller_path):
        print(f"{view_controller_path} not found!")
        return
        
    swift_content = """import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Enable native back-forward navigation gestures
        self.webView?.allowsBackForwardNavigationGestures = true
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.webView?.allowsBackForwardNavigationGestures = true
    }
}
"""
    with open(view_controller_path, 'w', encoding='utf-8') as f:
        f.write(swift_content)
        
    print("ViewController.swift updated to enable native back-forward gestures.")

if __name__ == '__main__':
    update_version()
    enable_swipe_gesture()
