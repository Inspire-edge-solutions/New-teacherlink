@echo off

set DIST_FOLDER=dist
set BUCKET_NAME=new-teacherlink

echo Building application...
call npm run build

echo Deleting old files from bucket %BUCKET_NAME%...
aws s3 rm s3://%BUCKET_NAME% --recursive

echo Uploading new files from %DIST_FOLDER% to bucket %BUCKET_NAME%...
aws s3 sync %DIST_FOLDER% s3://%BUCKET_NAME%

echo Configuring S3 bucket for SPA routing...
aws s3 website s3://%BUCKET_NAME% --index-document index.html --error-document index.html

echo Setting proper MIME types for assets...
aws s3 cp s3://%BUCKET_NAME% s3://%BUCKET_NAME% --recursive --metadata-directive REPLACE --content-type "text/html" --exclude "*" --include "*.html"
aws s3 cp s3://%BUCKET_NAME% s3://%BUCKET_NAME% --recursive --metadata-directive REPLACE --content-type "application/javascript" --exclude "*" --include "*.js"
aws s3 cp s3://%BUCKET_NAME% s3://%BUCKET_NAME% --recursive --metadata-directive REPLACE --content-type "text/css" --exclude "*" --include "*.css"

echo Deployment complete!
pause