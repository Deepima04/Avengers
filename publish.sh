\rm -fr lambda_upload.zip
zip -r lambda_upload.zip index.js node_modules helperFunctions package.json
aws lambda update-function-code --function-name ultron --zip-file fileb://lambda_upload.zip