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

if __name__ == '__main__':
    update_version()
