version=$(cat package.json | jq -r '.version')
zip -r algohub-extension-v$version.zip dist/ manifest.json icon.png