version=$(cat package.json | jq -r '.version')
sh build.sh && \
zip -r algohub-extension-v$version.zip dist/ manifest.json icon.png