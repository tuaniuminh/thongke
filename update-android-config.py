import json
import re
import os

def update_android_config():
    version_json_path = 'version.json'
    if not os.path.exists(version_json_path):
        print("version.json not found!")
        return

    with open(version_json_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)
    version = pkg.get('version', '1.0.0')

    # 1. Update build.gradle version
    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            gradle_content = f.read()
        
        # Calculate versionCode from version e.g. 4.3.255 -> 403255
        parts = version.split('.')
        try:
            code = int(parts[0]) * 100000 + int(parts[1]) * 1000 + int(parts[2])
        except Exception:
            code = 10001
            
        gradle_content = re.sub(r'versionCode\s+\d+', f'versionCode {code}', gradle_content)
        gradle_content = re.sub(r'versionName\s+["\'][^"\']+["\']', f'versionName "{version}"', gradle_content)
        
        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(gradle_content)
        print(f"Android build.gradle updated to version {version} (code {code}).")

    # 2. Ensure res/xml/file_paths.xml exists for FileProvider
    xml_dir = 'android/app/src/main/res/xml'
    os.makedirs(xml_dir, exist_ok=True)
    file_paths_path = os.path.join(xml_dir, 'file_paths.xml')
    if not os.path.exists(file_paths_path):
        file_paths_content = """<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="."/>
    <external-cache-path name="external_cache" path="."/>
    <cache-path name="cache" path="."/>
    <files-path name="files" path="."/>
</paths>
"""
        with open(file_paths_path, 'w', encoding='utf-8') as f:
            f.write(file_paths_content)
        print("Created file_paths.xml for Android FileProvider.")

    # 3. Ensure AndroidManifest.xml has FileProvider & Permissions
    manifest_path = 'android/app/src/main/AndroidManifest.xml'
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = f.read()

        # Add REQUEST_INSTALL_PACKAGES permission if not present
        if 'REQUEST_INSTALL_PACKAGES' not in manifest:
            manifest = manifest.replace(
                '</manifest>',
                '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n</manifest>'
            )

        # Add FileProvider to application if not present
        if 'androidx.core.content.FileProvider' not in manifest:
            provider_xml = """
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>"""
            manifest = manifest.replace('</application>', provider_xml)

        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(manifest)
        print("Updated AndroidManifest.xml with FileProvider and REQUEST_INSTALL_PACKAGES.")

    # 4. Copy AppUpdatePlugin.java into package directory vn/familife/thongke/
    pkg_dir = 'android/app/src/main/java/vn/familife/thongke'
    os.makedirs(pkg_dir, exist_ok=True)
    plugin_src = 'src/native/android/AppUpdatePlugin.java'
    if os.path.exists(plugin_src):
        with open(plugin_src, 'r', encoding='utf-8') as f:
            code = f.read()
        with open(os.path.join(pkg_dir, 'AppUpdatePlugin.java'), 'w', encoding='utf-8') as f:
            f.write(code)
        print("AppUpdatePlugin.java copied to Android package vn.familife.thongke.")

if __name__ == '__main__':
    update_android_config()
